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

**`depth` maintenance:** Set at insert time — `0` for top-level comments (`parent_id IS NULL`), or `parent.depth + 1` for replies (resolved via a single fetch of the parent comment before insert).

**Cascade delete:** `parent_id ON DELETE CASCADE` means deleting a comment removes its entire subtree. Comment deletion is **out of scope for v1** — no delete action is implemented in this iteration. This decision is intentional; a future spec will address author/post-owner deletion and tombstoning.

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
export interface Comment {
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

export interface CommentNode extends Comment {
  children: CommentNode[]
}
```

### `comment_count` on posts

`Post` gains an optional `comment_count?: number` field. It is fetched using the Supabase embedded count syntax on the post detail query:

```ts
supabase
  .from('posts')
  .select('*, comments(count)')
  .eq('id', postId)
  .single()
```

This returns `comments: [{ count: number }]` on the row. The page extracts it as `post.comments?.[0]?.count ?? 0` and passes it into `PostCard` as `commentCount`. No denormalized counter — avoids sync complexity.

### Validation (`packages/shared/src/validation/index.ts`)

- Comment content: 1–1000 chars

---

## Server Logic

### Fetching comments (`apps/web/src/lib/comments.ts`)

`getComments` is a plain async function (no `'use server'` directive) called directly from the `CommentThread` server component. It is **not** a server action.

It uses a single PostgreSQL recursive CTE to fetch all comments for a post, joining `profiles` and aggregated `comment_likes` counts. Result is a flat array.

The function then:
1. Builds a `Map<id, CommentNode>` for O(n) tree assembly
2. Recursively sorts each node's `children[]` by HN score before returning

**Pagination:** All comments for a post are fetched in one query. This is acceptable at current scale. Pagination is a future concern — not in scope for v1.

### HN Ranking Formula

Applied at every level of the tree (each comment's children are sorted by this score):

```
score = likes / (age_hours + 2)^1.8
```

Where `age_hours = (now - created_at)` in hours.

### Server Actions (`apps/web/src/actions/comments.ts`)

Both actions call `requireSession()` at the top and use `session.userId` for all inserts/filters, matching every other action in the codebase.

**`createComment(postId: string, parentId: string | null, content: string): Promise<{ error?: string }>`**
- Calls `requireSession()`
- Validates content (1–1000 chars); returns `{ error }` on failure
- For replies: fetches parent comment to compute `depth = parent.depth + 1`
- Inserts into `comments`
- Calls `revalidatePath('/post/[id]')`

**`toggleCommentLike(commentId: string, postId: string): Promise<{ error?: string }>`**
- Calls `requireSession()`
- Toggles like in `comment_likes`
- Calls `revalidatePath('/post/[id]')` using the passed `postId`
- Returns `{ error }` on failure

**Calling pattern for `toggleCommentLike`:** Called via `useOptimistic` + `startTransition` in `CommentItem` (not as a form action). The client immediately updates the displayed like count and liked state optimistically, then reverts if the action returns `{ error }`.

---

## Component Architecture

### Web (`apps/web/src/components/comments/`)

| Component | Type | Responsibility |
|---|---|---|
| `CommentThread.tsx` | Server | Calls `getComments`, passes sorted tree to `CommentList`. If tree is empty, renders: `"no comments yet"` (same muted style as other empty states in the app) |
| `CommentList.tsx` | Client | Owns collapse state (`Map<id, boolean>`), renders tree recursively |
| `CommentItem.tsx` | Client | Single comment row: `-`/`+` collapse button, meta, content, like + reply actions, inline `ReplyComposer`. Has `id="comment-[id]"` for anchor linking |
| `CommentComposer.tsx` | Client | Top-level composer shown below the post |

### `/post/[id]` page changes

- `CommentComposer` rendered below the post card
- `CommentThread` rendered below the composer
- `PostCard` gains a `commentCount: number` prop. The post detail page passes `commentCount={post.comment_count ?? 0}` into `PostCard`. The action row shows a comment count icon (💬) alongside the existing like button.

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
- Self-replies are permitted — a user may reply to their own comment

### Top-level composer

- Always visible below the post card on the post page
- 1–1000 chars, same paste-prevention pattern as `PostComposer`

---

## Notifications / Alerts

The existing alerts system is computed on read (no notifications table). Three new `AlertItem` kinds are added to `notifications/page.tsx`. All exclude self-interactions. All use the same 7-day window. All link to `/post/[postId]#comment-[commentId]` so the user lands at the relevant comment (requires `id="comment-[id]"` on `CommentItem`).

### `comment_on_post` — someone commented (top-level) on your post

```ts
// Query shape
supabase
  .from('comments')
  .select(`
    id,
    created_at,
    content,
    post_id,
    profiles!comments_user_id_fkey ( username, display_name ),
    posts!comments_post_id_fkey ( user_id )
  `)
  .eq('posts.user_id', session.userId)
  .is('parent_id', null)
  .neq('user_id', session.userId)
  .gte('created_at', sevenDaysAgo)
  .order('created_at', { ascending: false })
  .limit(50)
```

**Rendered copy:** `@username commented · [first 60 chars of comment content]`
**Key:** `comment-on-post-[comment.id]`

### `reply_to_comment` — someone replied to your comment

```ts
// Query shape
supabase
  .from('comments')
  .select(`
    id,
    created_at,
    content,
    post_id,
    profiles!comments_user_id_fkey ( username, display_name ),
    comments!comments_parent_id_fkey ( user_id )
  `)
  .eq('comments.user_id', session.userId)   // parent comment owned by me
  .neq('user_id', session.userId)            // not my own reply
  .not('parent_id', 'is', null)
  .gte('created_at', sevenDaysAgo)
  .order('created_at', { ascending: false })
  .limit(50)
```

**Rendered copy:** `@username replied · [first 60 chars of reply content]`
**Key:** `reply-[comment.id]`

### `comment_like` — someone liked your comment

```ts
// Query shape
supabase
  .from('comment_likes')
  .select(`
    id,
    created_at,
    comments!comment_likes_comment_id_fkey ( id, content, post_id, user_id ),
    profiles!comment_likes_user_id_fkey ( username, display_name )
  `)
  .eq('comments.user_id', session.userId)
  .neq('user_id', session.userId)
  .gte('created_at', sevenDaysAgo)
  .order('created_at', { ascending: false })
  .limit(50)
```

**Rendered copy:** `@username liked · [first 60 chars of comment content]`
**Key:** `comment-like-[comment_like.id]`

### `AlertItem` union type extensions

The three new variants added to the inline `AlertItem` union in `notifications/page.tsx`:

```ts
| { kind: 'comment_on_post'; createdAt: string; username: string; commentId: string; postId: string; commentContent: string; key: string }
| { kind: 'reply_to_comment'; createdAt: string; username: string; commentId: string; postId: string; replyContent: string; key: string }
| { kind: 'comment_like'; createdAt: string; username: string; commentId: string; postId: string; commentContent: string; key: string }
```

### Bell badge

The existing `alerts_last_seen_at` comparison covers all three new kinds automatically — no changes needed to badge infrastructure.

---

## Migration

- New migration adds `comments` and `comment_likes` tables with all constraints, indexes, and RLS policies
- No changes to existing tables or migrations
- Fully additive — no existing functionality is affected

---

## Error Handling

- `createComment`: content validated client-side before submission; returns `{ error?: string }` matching the existing `createPost` pattern. DB CHECK constraint as backstop. Failed submissions show an inline error and preserve the draft text.
- `toggleCommentLike`: optimistic UI; reverts on failure via returned `{ error }`.
