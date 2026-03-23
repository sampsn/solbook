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
| Page headers | Ad-hoc per screen, inconsistent | Shared `ScreenHeader` component on all screens |
| Active tab style | Color change only | Bracket notation: `[home]` + color |

## Architecture

### New: `components/ScreenHeader.tsx`

A shared header component that mirrors the web's `PageHeader`. Used on every screen.

**Props:**
- `title: string` — displayed in `colors.accent`, `font.bold`, 14px
- `showBack?: boolean` — shows `← back` button on the left (`colors.muted`, 13px), centers title; calls `router.back()`
- `showBell?: boolean` — shows SVG bell icon on the right; navigates to `'/notifications'` via `router.push`

**Behavior:**
- Handles `useSafeAreaInsets` internally — callers do not manage insets
- Bell icon reads `hasUnseenAlerts` from `AlertsContext` — filled when `true`
- `showBell` is only passed on tab screens (home, discover). `notifications.tsx` uses `showBack` with no `showBell` — bell suppression on the alerts screen is implicit via prop usage, not path detection
- The header `View` is rendered as a sibling above the `ScrollView`/`FlatList` — not inside `ListHeaderComponent`. This is the RN equivalent of `position: sticky`

**Style:**
- Background: `colors.bg`
- Border bottom: 1px `colors.border`
- Title: `font.bold`, 14px, `colors.accent`
- Back button: `font.regular`, 13px, `colors.muted`
- Bell SVG: same path data as the web's `BellIcon` component

### New: `components/AlertsContext.tsx`

RN-native alerts context. Owns its own async logic (unlike the web, where `hasUnseenAlerts` comes from a server component prop).

**Implementation:**
- On mount: fetch `profiles.alerts_last_seen_at` for the current user, then call `getNotifications()` from `lib/api.ts` and check if any returned item's `created_at` is newer than `alerts_last_seen_at`. If so, `hasUnseenAlerts = true`. This reuses the existing API function and avoids a duplicate query.
- On `AppState` change to `"active"`: re-run the same check
- Exposes `hasUnseenAlerts: boolean` via `useHasUnseenAlerts()` hook
- Exposes `refreshAlerts()` — called by `notifications.tsx` after marking alerts seen to immediately clear the bell
- Provider wraps the root in `app/_layout.tsx` as `<AlertsContextProvider>`

### Routing Changes

**Root Stack** (`app/_layout.tsx`):
- Existing `screenOptions={{ headerShown: false }}` covers all screens — no per-screen header options needed
- Add `notifications` and `settings` to the existing `<Stack>` registration (additive change — do not replace existing screen registrations)
- Default `presentation: 'card'` is fine for both; no special presentation options needed
- Navigation to notifications: `router.push('/notifications')` (file is `app/notifications.tsx`)

**Tab layout** (`app/(tabs)/_layout.tsx`):
- 3 visible tabs: `home`, `discover`, `profile`
- Tab labels: `home` and `discover` are static; profile tab label is the current user's `@username` fetched from auth on layout mount via `supabase.auth.getUser()`
- Active tab label uses bracket notation wrapping the full label including `@`: `[home]`, `[discover]`, `[@username]`
- Bracket logic: `focused ? \`[\${label}]\` : label` — mirrors web's `bracketLabel`
- Do not register `notifications` or `settings` in the tabs layout

**New stack screens:**
- `app/notifications.tsx` — alerts list; marks alerts seen on mount
- `app/settings.tsx` — profile edit + sign out

**New tab screen:**
- `app/(tabs)/profile.tsx` — own profile tab

## Files Changed

### New files
| File | Purpose |
|---|---|
| `components/ScreenHeader.tsx` | Shared header (title + back + bell) |
| `components/AlertsContext.tsx` | Unseen-alerts context + `useHasUnseenAlerts` hook |
| `app/notifications.tsx` | Alerts stack screen (moved from tab) |
| `app/settings.tsx` | Settings stack screen (moved from tab) |
| `app/(tabs)/profile.tsx` | Own profile tab screen |

### Modified files
| File | Changes |
|---|---|
| `app/_layout.tsx` | Wrap with `<AlertsContextProvider>`; add `notifications` + `settings` to `<Stack>` |
| `app/(tabs)/_layout.tsx` | 3 tabs only; bracket active labels; dynamic @username label |
| `app/(tabs)/home/index.tsx` | Replace inline header with `<ScreenHeader title="home" showBell />` |
| `app/(tabs)/discover.tsx` | Replace inline header with `<ScreenHeader title="discover" showBell />` |
| `app/profile/[username].tsx` | Replace navBar with `<ScreenHeader title={\`@\${username}\`} showBack />`; add "settings →" for own profile |
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
- `PostComposer` stays inline at top of feed — no change needed

### Discover (`app/(tabs)/discover.tsx`)
- Replace header View + insets boilerplate with `<ScreenHeader title="discover" showBell />`

### Profile tab (`app/(tabs)/profile.tsx`) — new
- On mount: call `supabase.auth.getUser()` to get `userId` and `username`. If no user returned, redirect to `/(auth)/login`
- Then call `getProfile(username)` from `lib/api.ts` to get profile data, posts, follow counts
- `<ScreenHeader title={\`@\${username}\`} />` — no back, no bell
- "settings →" `TouchableOpacity` in profile info section calls `router.push('/settings')`
- Loading state: `<ActivityIndicator>` centered, shown until both auth and profile fetches complete

### Notifications (`app/notifications.tsx`) — moved from tab
- Structure: `<View style={styles.container}><ScreenHeader title="alerts" showBack /><FlatList .../></View>`
- The `ScreenHeader` renders unconditionally outside any loading guard — the user always has a back button
- Loading state: show `<ActivityIndicator>` inside the `FlatList`'s `ListEmptyComponent` or as the `FlatList` itself when `loading === true`
- On mount (`useEffect`): update `profiles.alerts_last_seen_at = new Date().toISOString()` for the current user in Supabase, then call `refreshAlerts()` from `AlertsContext`

### Settings (`app/settings.tsx`) — moved from tab
- Structure: `<View style={styles.container}><ScreenHeader title="settings" showBack /><ScrollView .../></View>`
- The `ScreenHeader` renders unconditionally outside the loading guard — the user always has a back button
- Loading state: show `<ActivityIndicator>` inside the `ScrollView` content when `profile === null`

### Profile detail (`app/profile/[username].tsx`)
- Replace `navBar` View with `<ScreenHeader title={\`@\${username}\`} showBack />`
- Always show back: this route is only ever pushed from elsewhere (post author, search), never from the tab bar, so `showBack` is always appropriate. Do not make it conditional on `isOwnProfile`
- Add "settings →" `TouchableOpacity` in profile info section when `isOwnProfile`, navigating to `router.push('/settings')`
- Note: both the profile tab (`profile.tsx`) and this screen show "settings →" when viewing own profile — this is intentional, since a user can land here from a post they authored

### Post detail (`app/post/[id].tsx`)
- Replace `navBar` View with `<ScreenHeader title="post" showBack />`

## Visual Design

- **Active tab labels:** `[home]`, `[discover]`, `[@username]` — bracket wraps full label including `@`
- **Tab bar:** Height/colors unchanged (already match web)
- **ScreenHeader:** uses `colors.*` and `font.*` tokens throughout — no raw hex values
- **Bell icon:** SVG bell (same path data as web), filled when `hasUnseenAlerts`

## Out of Scope

- Auth screens (`login`, `signup`) — already aligned with web
- `PostCard` and `PostComposer` components — already aligned
- `lib/theme.ts` — no changes needed
- `lib/api.ts` — no new functions needed; `AlertsContext` reuses `getNotifications()`; profile tab reuses `getProfile(username)`
- Any backend / Supabase schema changes
