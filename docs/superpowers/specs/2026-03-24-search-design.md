# Search Feature Design

**Date:** 2026-03-24
**Status:** Approved

## Summary

Add search functionality to solbook that searches users and posts on both the web and mobile apps. Users access search via an icon in the header, submit queries explicitly (Enter key), and see results in two labeled sections: People then Posts.

## Database

### Migration

Add full-text search (`tsvector`) support to the `profiles` and `posts` tables via a new Supabase migration.

**`profiles` table:**
- Add a generated `tsvector` column combining `username` (weight A), `display_name` (weight B), and `bio` (weight C)
- Add a GIN index on the column for fast lookups

**`posts` table:**
- Add a generated `tsvector` column on `content`
- Add a GIN index on the column

**Query approach:**
- Use `plainto_tsquery('english', query)` — handles multi-word input without requiring special syntax from the user
- Order results by `ts_rank` descending
- Cap results: 10 users, 20 posts
- Queries run directly via PostgREST `.textSearch()` on the tsvector column — no RPC function needed. Existing read policies (`select ... to authenticated`) on `profiles` and `posts` cover mobile. No additional grants required.

**Reserved username:**
- Add `'search'` to the `RESERVED_USERNAMES` list in `packages/shared/src/validation/index.ts` and to the `username_not_reserved` check constraint in the migration, since `/search` is now a first-class route.

## Web (Next.js)

### Authentication

The search page lives inside `(app)/` route group, so authentication is handled by the group's layout — no additional `requireSession()` call needed in the page itself.

### Search Icon

- New `SearchIcon` SVG component: magnifying glass, matching `BellIcon` style (14px in TopNav, 16px in PageHeader, `viewBox="0 0 24 24"`, `stroke="currentColor"`, strokeWidth 2, round linecap/linejoin)
- Added to `TopNav` and `PageHeader`, positioned to the left of the bell icon
- Links to `/search`
- Active state (when `pathname.startsWith('/search')`) uses `var(--color-accent)`; inactive uses `var(--color-muted)`
- In `PageHeader`, the search icon appears in the top-right alongside the bell when `showBack` is false. When `showBack` is true, neither the search icon nor the bell is shown (the spacer `<div className="w-8" />` remains on the right side for layout balance)

### Search Page

- Route: `apps/web/src/app/(app)/search/page.tsx` — server component
- Reads `?q=` query param from `searchParams`; trims whitespace. If `q` is absent or blank after trimming, renders empty state ("search for people and posts")
- If `q` is present: runs two Supabase queries in parallel (`Promise.all`) — profiles FTS and posts FTS — and renders results

### SearchBar Component

- Client component with a controlled `<input>`
- On Enter: trims the value; if non-empty, calls `router.push('/search?q=<encoded-query>')`
- Pre-populated from the `q` URL param on mount so the input reflects the current search
- No submit button — keyboard-only submission (Enter key)

### Results Layout

- **"People" section**: list of matching profiles, each linking to `/@username`, showing display name, username, and full bio (up to 160 chars — the schema max — displayed as-is, no truncation needed)
- **"Posts" section**: list of matching posts using the existing `PostCard` component
- Empty sections are hidden entirely
- Zero results for both: show "no results for [query]" message

### Web Query Shape / PostCard Mapping

The web server component queries `profiles` and `posts` via the Supabase service role client. Raw rows must be mapped to the shape `PostCard` expects before rendering:

```
PostCard expects: { id, content, createdAt, author: { username, displayName }, likeCount, likedByMe }
```

The search query joins `posts` with `profiles` (for author data) and `likes` (for `likeCount` and `likedByMe`), then maps to this shape — consistent with how `home/page.tsx` and `discover/page.tsx` map their rows. Computing `likedByMe` requires filtering the joined likes rows to those where `user_id === session.userId`, exactly as `home/page.tsx` does.

## Mobile (Expo)

### Search Icon

- Same magnifying glass SVG added to the mobile `PageHeader`, to the left of the bell

### Search Screen

- Route: `app/search.tsx` — stack screen (not a tab)
- Register in `apps/mobile/app/_layout.tsx` as `<Stack.Screen name="search" options={{ presentation: 'card' }} />` consistent with other non-tab screens
- Text input at the top; `returnKeyType="search"` triggers the search on keyboard submit; trims value before submitting
- Calls `search(query)` in `lib/api.ts`
- Results rendered in a `SectionList` with two sections: People and Posts
- Uses existing profile row and PostCard patterns from other screens
- `useState` for `query`, `results`, and `loading` state — same pattern as other screens

### `lib/api.ts` — `search(query)`

- Trims query; no-ops if blank
- Runs two Supabase queries in parallel: profiles FTS and posts FTS
- After posts resolve, runs a third dependent query to fetch the current user's likes for the returned post IDs — identical to the pattern in `getDiscoverFeed()` — to populate `likedByMe` on each post
- Returns `{ users: Profile[], posts: FeedPost[] }` using the local `api.ts` types (`Profile` and `FeedPost` as defined in that file — not the shared package types)

## Shared Types

No new shared types are added. The web server component uses the Supabase-returned row shapes mapped inline. The mobile `search()` function returns the local `api.ts` `Profile` and `FeedPost` types already used throughout that file.

The reserved username list in `packages/shared/src/validation/index.ts` gains one entry: `'search'`.

## Out of Scope

- Real-time / debounced search (may revisit later)
- Tabs (All / People / Posts) — can add later if needed
- Full-text search filters (bio only, content only, etc.)
