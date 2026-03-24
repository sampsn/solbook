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

## Web (Next.js)

### Search Icon

- New `SearchIcon` SVG component: magnifying glass, matching `BellIcon` style (14px in TopNav, 16px in PageHeader, `viewBox="0 0 24 24"`, `stroke="currentColor"`, strokeWidth 2, round linecap/linejoin)
- Added to `TopNav` and `PageHeader`, positioned to the left of the bell icon
- Links to `/search`
- Active state (when `pathname.startsWith('/search')`) uses `var(--color-accent)`; inactive uses `var(--color-muted)`

### Search Page

- Route: `/app/(app)/search/page.tsx` — server component
- Reads `?q=` query param from `searchParams`
- If `q` is absent: renders empty state ("search for people and posts")
- If `q` is present: runs two Supabase queries in parallel (`Promise.all`) and renders results

### SearchBar Component

- Client component with a controlled `<input>`
- On Enter: calls `router.push('/search?q=<encoded-query>')`
- Pre-populated from the `q` URL param on mount so the input reflects the current search
- No submit button — keyboard-only submission (Enter key)

### Results Layout

- **"People" section**: list of matching profiles, each linking to `/@username`, showing avatar placeholder, display name, username, and bio snippet
- **"Posts" section**: list of matching posts using the existing `PostCard` component
- Empty sections are hidden entirely
- Zero results for both: show "no results for [query]" message

## Mobile (Expo)

### Search Icon

- Same magnifying glass SVG added to the mobile `PageHeader` (or equivalent header component), to the left of the bell
- Links to `/search` screen

### Search Screen

- Route: `app/search.tsx` — stack screen (not a tab)
- Text input at the top; `returnKeyType="search"` triggers the search on keyboard submit
- Calls a new `search(query: string)` function in `lib/api.ts`
- Results rendered in a `SectionList` with two sections: People and Posts
- Uses existing profile row and PostCard patterns from other screens
- `useState` for `query`, `results`, and `loading` state — same pattern as other screens

### `lib/api.ts` — `search(query)`

- Runs the same two Supabase full-text queries (profiles + posts)
- Returns `{ users: Profile[], posts: FeedPost[] }`

## Shared Types

No new shared types required. `Profile` and `FeedPost` from `packages/shared` cover the return shapes.

## Out of Scope

- Real-time / debounced search (may revisit later)
- Tabs (All / People / Posts) — can add later if needed
- Full-text search on other fields (e.g., bio only, content only filters)
