# Nav Redesign — Design Spec

**Date:** 2026-03-21
**Status:** Approved

---

## Overview

Replace the left sidebar with a responsive top navigation bar. Remove the dedicated `/compose` route — post composition lives in the home feed. Ship to Vercel (already complete).

---

## Navigation Layout

Breakpoint: `md` (768px) — matches existing `Sidebar`/`BottomNav` convention.

### Desktop / Tablet (≥ 768px)

Single header bar using the `surface` color (`#242424`), bottom border `#333333`:

```
| solbook        [home]  discover  alerts  @username |
```

- `solbook` logo anchored left, orange (`#ff6600`), bold, links to `/home`
- Nav links right-aligned
- Active page wrapped in square brackets: `[home]`
- Inactive links in muted color (`#888880`), orange on hover
- `@username` links to `/{username}` (user's profile page)

### Mobile (< 768px)

**No changes from current behavior.** Keep the existing bottom nav bar and per-page title header. The `BottomNav` component is preserved as-is. Update bottom nav items to replace `settings` with `@username` linking to the user's profile (matching desktop).

---

## Active State

Display label `[active]` for the current route. Route → label mapping:

| Route | Display label |
|---|---|
| `/home` | `[home]` |
| `/discover` | `[discover]` |
| `/notifications` | `[alerts]` |
| `/{username}` | `[@username]` |

Use `usePathname()` to determine the active route. Match by `pathname.startsWith(href)`.

---

## Compose Page Removal

- Delete `apps/web/src/app/(app)/compose/` route directory
- `PostComposer` component already exists in the home feed — no changes needed there

## Settings Access

Settings is no longer in the nav. Add a `settings` link on the user's own profile page (`/{username}`) — only visible when viewing your own profile. A simple text link is sufficient: `settings →` linking to `/settings`.

---

## Component Changes

### New: `TopNav`

Create `src/components/nav/TopNav.tsx`:

- Client component (`'use client'`) — needs `usePathname()`
- Receives `username: string` as a prop
- Renders both the desktop single-row header and the mobile two-row header using Tailwind `md:` breakpoints
- Nav items: `home` → `/home`, `discover` → `/discover`, `alerts` → `/notifications`, `@username` → `/{username}`

### Update: `BottomNav`

Keep `BottomNav` for mobile. Update nav items to replace `settings → /settings` with `@username → /{username}`. Apply the same `[bracket]` active treatment for consistency.

### Delete: `Sidebar`

Remove `src/components/nav/Sidebar.tsx`.

### Update: App Layout

Update `src/app/(app)/layout.tsx`:

- Replace `<Sidebar>` with `<TopNav username={profile.username} />`
- Keep `<BottomNav />` — update it to receive `username` as a prop
- Change layout wrapper from horizontal flex row to vertical flex column:
  - Before: `<div className="flex min-h-screen">`
  - After: `<div className="flex flex-col min-h-screen">`
- Keep `pb-16 md:pb-0` on `<main>` — still needed for the mobile bottom nav

---

## Design Tokens

No changes to existing tokens.

| Token | Value |
|---|---|
| bg | `#1c1c1c` |
| surface | `#242424` |
| border | `#333333` |
| text | `#e8e6d9` |
| muted | `#888880` |
| accent | `#ff6600` |

---

## Out of Scope

- Post card design, composer UI, profile pages — iterative after deployment
- Upstash Redis / IP blacklisting — separate future task
