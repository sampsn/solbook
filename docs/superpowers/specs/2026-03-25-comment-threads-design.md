# Comment Thread System — Design Spec

**Date:** 2026-03-25
**Status:** Approved
**Scope:** Web (Next.js 15) + Mobile (Expo)

---

## Overview

A Hacker News-style threaded comment system for posts. Comments are nested, collapsible, and ranked at every level using the HN scoring algorithm. Upvotes/likes are supported on comments. New comment activity (comments on posts, replies to comments, likes on comments) surfaces in the existing alerts/notifications system.

---

## Data Model

### `comments` table

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `post_id` | uuid | FK → `posts.id` ON DELETE CASCADE |
| `user_id` | uuid | FK → `profiles.id` ON DELETE CASCADE |
| `parent_id` | uuid nullable | FK → `comments.id` ON DELETE CASCADE. NULL = top-level comment |
| `content` | text | CHECK: 1–1000 chars |
| `depth` | int | NOT NULL DEFAULT 0. Stored (not computed) to avoid recalculation on every read |
| `created_at` | timestamptz | NOT NULL DEFAULT now() |

**Indexes:** `(post_id, created_at DESC)`, `parent_id`, `user_id`

### `comment_likes` table

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `user_id` | uuid | FK → `profiles.id` ON DELETE CASCADE |
| `comment_id` | uuid | FK → `comments.id` ON DELETE CASCADE |
| `created_at` | timestamptz | NOT NULL DEFAULT now() |

**Constraints:** UNIQUE `(user_id, comment_id)`
**Indexes:** `(comment_id, created_at DESC)`, `user_id`

### RLS

Both tables follow the existing pattern: zero anon permissions, all access exclusively via the service role on the server.

### Shared types (`packages/shared/src/types/index.ts`)

```ts
interface Comment {
  id: string
  post_id: string
  user_id: string
  parent_id: string | null
  content: string
  depth: number
  created_at: string
  profile: Profile
  like_count: number
  liked_by_me: boolean
}

interface CommentNode extends Comment {
  children: CommentNode[]
}
```

### `comment_count` on posts

The `Post` type gains an optional `comment_count?: number` field. It is fetched as a subquery on the post fetch (no denormalized counter — avoids sync complexity).

### Validation (`packages/shared/src/validation/index.ts`)

- Comment content: 1–1000 chars

---

## Server Logic

### Fetching

A single PostgreSQL recursive CTE fetches all comments for a post, joining `profiles` and aggregated `comment_likes` counts in one query. The result is a flat array.

The server action (`getComments`) then:
1. Builds a `Map<id, CommentNode>` for O(n) tree assembly
2. Recursively sorts each node's `children[]` by HN score before returning

### HN Ranking Formula

Applied at every level of the tree (each comment's children are sorted by this score):

```
score = likes / (age_hours + 2)^1.8
```

Where `age_hours = (now - created_at)` in hours.

### Server Actions (`apps/web/src/actions/comments.ts`)

- `getComments(postId: string): Promise<CommentNode[]>` — returns sorted tree
- `createComment(postId: string, parentId: string | null, content: string): Promise<void>` — validates content, inserts, revalidates `/post/[id]`
- `toggleCommentLike(commentId: string): Promise<void>` — toggles like, revalidates

---

## Component Architecture

### Web (`apps/web/src/components/comments/`)

| Component | Type | Responsibility |
|---|---|---|
| `CommentThread.tsx` | Server | Fetches sorted tree, passes to `CommentList` |
| `CommentList.tsx` | Client | Owns collapse state (`Map<id, boolean>`), renders tree recursively |
| `CommentItem.tsx` | Client | Single comment row: `-`/`+` collapse button, meta, content, like + reply actions, inline `ReplyComposer` |
| `CommentComposer.tsx` | Client | Top-level composer shown below the post |

### `/post/[id]` page changes

- `CommentComposer` rendered below the post card
- `CommentThread` rendered below the composer
- `PostCard` action row gains a comment count icon (💬) alongside the existing like button

### Mobile (`apps/mobile`)

- Post detail screen gains a scrollable `CommentThread` section below the post
- Same `CommentNode[]` type from `@solbook/shared`
- Same collapse/reply interaction pattern using React Native equivalents

---

## UI Behavior

### Threading and indentation

- Unlimited depth (adjacency list, no cap)
- Visual indentation capped at **7 levels** — comments deeper than 7 render at the same indent as level 7, but the correct number of `-` buttons is still shown
- Each level of indentation is consistent with the app's existing spacing/design language

### Collapse

- Each comment has a `-` button to the left of its content
- Clicking `-` collapses the comment and its entire subtree
- Collapsed state shows: `[+] username · N pts · X replies` on one line
- Clicking `[+]` or the `-` (now `+`) re-expands
- Collapse state is ephemeral — stored in `Map<commentId, boolean>` in `CommentList`, not persisted

### Reply composer

- Clicking `reply` on any comment expands an inline reply composer directly below that comment
- Only one reply composer open at a time
- Cancel dismisses the composer; submit calls `createComment` with the comment's `id` as `parentId`

### Top-level composer

- Always visible below the post card on the post page
- 1–1000 chars, same paste-prevention pattern as `PostComposer`

---

## Notifications / Alerts

The existing alerts system is computed on read (no notifications table). Three new `AlertItem` kinds are added to `notifications/page.tsx`:

| Kind | Trigger | Link |
|---|---|---|
| `comment_on_post` | Someone comments (top-level) on your post | `/post/[postId]` |
| `reply_to_comment` | Someone replies to your comment | `/post/[postId]` |
| `comment_like` | Someone likes your comment | `/post/[postId]` |

- All exclude self-interactions (`user_id != session.userId`)
- All use the same 7-day window as existing alerts
- The existing `alerts_last_seen_at` bell-badge logic covers all three automatically — no changes needed to badge infrastructure

---

## Migration

- New migration adds `comments` and `comment_likes` tables with all constraints, indexes, and RLS policies
- No changes to existing tables or migrations
- Fully additive — no existing functionality is affected

---

## Error Handling

- `createComment`: content validated client-side before submission; DB CHECK constraint as backstop. Failed submissions show an inline error and preserve the draft text.
- `toggleCommentLike`: optimistic UI; reverts on failure.
- Both follow the same typed-error pattern as existing server actions (`createPost`, `toggleLike`).
