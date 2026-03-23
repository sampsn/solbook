# RN App — Mobile Web Alignment Design

**Date:** 2026-03-22
**Status:** Approved

## Goal

Align the React Native (`apps/mobile`) app's navigation structure and screen layouts with the mobile-responsive version of the web app (`apps/web`). This is a full visual and structural alignment — not just a cosmetic pass.

## Current State vs Target

| Concern | RN App (current) | Web Mobile (target) |
|---|---|---|
| Bottom tabs | 5: home, discover, new, alerts, settings | 3: home, discover, @username |
| Compose | Dedicated tab | Inline `PostComposer` on home |
| Alerts/notifications | Dedicated tab | Stack screen via bell icon in header |
| Settings | Dedicated tab | Stack screen via "settings →" link on own profile |
| Page headers | Ad-hoc per screen, inconsistent | Shared `PageHeader` component on all screens |
| Active tab style | Color change only | Bracket notation: `[home]` + color |

## Architecture

### New: `components/ScreenHeader.tsx`

A shared header component that mirrors the web's `PageHeader`. Used on every screen.

**Props:**
- `title: string` — displayed in accent color, bold
- `showBack?: boolean` — shows `← back` button (left), centers title
- `showBell?: boolean` — shows bell icon (right) linking to `/notifications`

**Behavior:**
- Handles `useSafeAreaInsets` internally — no per-screen boilerplate needed
- Bell icon reads `hasUnseenAlerts` from `AlertsContext` — filled when unseen alerts exist
- Bell navigates to `/notifications` via `router.push`
- Sticky positioning (scrolls with the screen header pattern used in the web)

### New: `lib/AlertsContext.tsx`

Mirrors the web's `AlertsContext`. Provides app-wide unseen-alerts state to power the bell indicator.

- Checks for unseen alerts on mount and whenever the app comes into focus
- Provides `hasUnseenAlerts: boolean` via a `useHasUnseenAlerts()` hook
- Wrapped at the root in `app/_layout.tsx`

### Routing Changes

**Tab layout** (`app/(tabs)/_layout.tsx`):
- 3 visible tabs: `home`, `discover`, and a dynamic `@username` tab pointing to `app/(tabs)/profile.tsx` (new)
- Active tab label uses bracket notation: `[home]` when focused
- `notifications` and `settings` registered as hidden tab screens so expo-router resolves them, but they render as stack screens

**New stack screens:**
- `app/notifications.tsx` — alerts list, uses `ScreenHeader title="alerts" showBack`; marks alerts seen on visit
- `app/settings.tsx` — profile edit + sign out, uses `ScreenHeader title="settings" showBack`

**New tab screen:**
- `app/(tabs)/profile.tsx` — own profile page, uses `ScreenHeader title="@{username}"` (no back, no bell); shows "settings →" link in profile section

## Files Changed

### New files
| File | Purpose |
|---|---|
| `components/ScreenHeader.tsx` | Shared sticky header (title + back + bell) |
| `lib/AlertsContext.tsx` | Unseen-alerts context + `useHasUnseenAlerts` hook |
| `app/notifications.tsx` | Alerts stack screen (moved from tab) |
| `app/settings.tsx` | Settings stack screen (moved from tab) |
| `app/(tabs)/profile.tsx` | Own profile tab screen |

### Modified files
| File | Changes |
|---|---|
| `app/_layout.tsx` | Wrap with `AlertsContextProvider`; register `notifications` + `settings` stack routes |
| `app/(tabs)/_layout.tsx` | 3 tabs only; bracket active labels; register hidden routes |
| `app/(tabs)/home/index.tsx` | Replace inline header with `<ScreenHeader title="home" showBell />` |
| `app/(tabs)/discover.tsx` | Replace inline header with `<ScreenHeader title="discover" showBell />` |
| `app/profile/[username].tsx` | Replace navBar with `<ScreenHeader title="@{username}" showBack />`; add "settings →" link for own profile |
| `app/post/[id].tsx` | Replace navBar with `<ScreenHeader title="post" showBack />` |

### Deleted files
| File | Reason |
|---|---|
| `app/(tabs)/compose.tsx` | Compose is inline on home |
| `app/(tabs)/notifications.tsx` | Content moved to `app/notifications.tsx` |
| `app/(tabs)/settings.tsx` | Content moved to `app/settings.tsx` |

## Per-Screen Detail

### Home (`app/(tabs)/home/index.tsx`)
- Replace header View + insets boilerplate with `<ScreenHeader title="home" showBell />`
- `PostComposer` stays inline at top of feed — no change
- Remove `compose` tab navigation (tab no longer exists)

### Discover (`app/(tabs)/discover.tsx`)
- Replace header View + insets boilerplate with `<ScreenHeader title="discover" showBell />`

### Profile tab (`app/(tabs)/profile.tsx`) — new
- Own profile view (same data as `app/profile/[username].tsx` but fetches current user)
- `ScreenHeader` shows `@{username}` title, no back, no bell
- "settings →" link in profile section navigates to `/settings`

### Notifications (`app/notifications.tsx`) — moved
- Content from `app/(tabs)/notifications.tsx` moved here verbatim
- `ScreenHeader title="alerts" showBack`
- Mark alerts seen on screen mount (call `supabase` update, then refresh `AlertsContext`)

### Settings (`app/settings.tsx`) — moved
- Content from `app/(tabs)/settings.tsx` moved here verbatim
- `ScreenHeader title="settings" showBack`

### Profile detail (`app/profile/[username].tsx`)
- Replace `navBar` View with `<ScreenHeader title={\`@${username}\`} showBack />`
- For own profile: no back button, add "settings →" link in profile info section

### Post detail (`app/post/[id].tsx`)
- Replace `navBar` View with `<ScreenHeader title="post" showBack />`

## Visual Design

- **Active tab labels:** Bracket notation `[label]` — matches web's `bracketLabel` function exactly
- **Tab bar height/style:** Unchanged (already matches web colors)
- **ScreenHeader style:** Matches web `PageHeader` — `#1c1c1c` background, `#333333` border-bottom, title in `#ff6600` bold, back in `#888880`
- **Bell icon:** SVG bell, filled when unseen alerts exist and not on alerts screen

## Out of Scope

- Auth screens (`login`, `signup`) — already aligned with web
- `PostCard` and `PostComposer` components — already aligned
- `lib/theme.ts` — no changes needed
- Any backend / Supabase changes
