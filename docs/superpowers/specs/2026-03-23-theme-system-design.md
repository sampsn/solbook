# Theme System Design — Solarized Dark / Light

**Date:** 2026-03-23
**Status:** Approved

---

## Overview

Add automatic dark/light mode detection and a manual override toggle (auto / dark / light) to both the web app (Next.js) and mobile app (Expo/React Native). Themes are based on a warmed variant of the Solarized palette. The user's preference syncs across devices via Supabase.

---

## Color Palette

All tokens apply to both platforms. Accent and brand colors are theme-invariant.

| Token | Dark | Light | Usage |
|---|---|---|---|
| `bg` | `#052327` | `#fdf3d8` | Page background |
| `surface` | `#0b2b2e` | `#ede8d0` | Nav, cards, inputs |
| `border` | `#586e75` | `#93a1a1` | Dividers, input borders |
| `text` | `#839496` | `#657b83` | Body text |
| `muted` | `#657b83` | `#839496` | Labels, metadata, placeholders |
| `accent` | `#cb4b16` | `#cb4b16` | Likes, active states, secondary buttons (Solarized orange) |
| `accentHover` | `#d45d1e` | `#d45d1e` | Hover state for accent elements |
| `accent-alt` | `#b58900` | `#b58900` | Tags, badges, highlights (Solarized yellow) |
| `brand` | `#ff7700` | `#ff7700` | Logo, wordmark, primary CTAs |
| `danger` | `#dc322f` | `#dc322f` | Destructive actions, errors (Solarized red) |

**Notes:**
- Dark bg/surface are a warmed variant of Solarized Dark (original `#002b36` / `#073642`), shifted toward teal-neutral to reduce the blue-green cast.
- Light bg/surface are a warmed variant of Solarized Light (original `#fdf6e3` / `#eee8d5`), shifted toward warm amber.
- `brand` (`#ff7700`) is used exclusively for logo and branding elements. `accent` (`#cb4b16`) is used for all other interactive/highlight elements.
- `accentHover` and `danger` are theme-invariant (same value in both themes).

---

## Theme Resolution

```
user.theme === 'dark'    → use dark palette
user.theme === 'light'   → use light palette
user.theme === 'system'  → read OS preference
                           OS = dark  → use dark palette
                           OS = light → use light palette
                           OS unknown → use light palette (default)
```

The default preference for new users is `'system'`, which resolves to light when no OS signal is available.

---

## Database Schema

One new column on the existing `profiles` table:

```sql
ALTER TABLE profiles
  ADD COLUMN theme TEXT NOT NULL DEFAULT 'system'
  CHECK (theme IN ('system', 'dark', 'light'));
```

---

## Architecture

### Web (Next.js + Tailwind v4)

**CSS tokens** — `globals.css` is updated as follows:

1. The `@theme { }` block has its color tokens removed entirely. Only `--font-mono` remains in `@theme`. Color tokens are defined exclusively in the `[data-theme]` blocks below.
2. Hardcoded `background-color`, `color`, and scrollbar `background` values on `body` and `::-webkit-scrollbar-*` are replaced with `var(--color-bg)` and `var(--color-text)`.
3. Two scoped blocks define all color tokens:

```css
[data-theme="light"] {
  --color-bg: #fdf3d8;
  --color-surface: #ede8d0;
  --color-border: #93a1a1;
  --color-text: #657b83;
  --color-muted: #839496;
  --color-accent: #cb4b16;
  --color-accent-hover: #d45d1e;
  --color-accent-alt: #b58900;
  --color-brand: #ff7700;
  --color-danger: #dc322f;
}

[data-theme="dark"] {
  --color-bg: #052327;
  --color-surface: #0b2b2e;
  --color-border: #586e75;
  --color-text: #839496;
  --color-muted: #657b83;
  --color-accent: #cb4b16;
  --color-accent-hover: #d45d1e;
  --color-accent-alt: #b58900;
  --color-brand: #ff7700;
  --color-danger: #dc322f;
}
```

All existing Tailwind utility classes that reference these vars continue to work unchanged.

**`ThemeProvider`** — new client component added to `app/(app)/layout.tsx`:

The existing `(app)/layout.tsx` is a server component that already performs an authenticated Supabase query. It reads `profile.theme` server-side and passes it as a prop to `ThemeProvider`. This avoids a second client-side fetch and eliminates any race condition with the flash-prevention script.

```tsx
// server layout passes resolved pref down
<ThemeProvider initialTheme={profile.theme}>
  {children}
</ThemeProvider>
```

`ThemeProvider` responsibilities:
- Accepts `initialTheme: 'system' | 'dark' | 'light'` prop
- Applies resolved `data-theme` to `<html>` on mount using `initialTheme` + OS signal
- Watches `window.matchMedia('(prefers-color-scheme: dark)')` for OS changes
- Listens for a custom `solbook:theme-change` event dispatched by `ThemeToggle`; reads new preference from `event.detail.theme` and re-resolves the effective theme for instant in-page updates
- On theme change, writes the **resolved value** (`'dark'` or `'light'`, never `'system'`) to `localStorage` key `solbook-theme-hint`

**Flash prevention inline script** — rendered by `ThemeProvider` before React hydrates:

```js
// reads resolved value only ('dark' or 'light') — never 'system'
// wrapped in try/catch: localStorage throws SecurityError in Safari private browsing
try {
  const hint = localStorage.getItem('solbook-theme-hint');
  if (hint === 'dark' || hint === 'light') {
    document.documentElement.setAttribute('data-theme', hint);
  }
} catch (_) {}
```

Since only the resolved theme is stored (not `'system'`), the inline script requires no OS-detection logic. The authoritative value comes from the server via `initialTheme`; `localStorage` is only a hydration hint to prevent flicker. Both this read and `ThemeProvider`'s write to `solbook-theme-hint` must be wrapped in `try/catch` — `localStorage` throws `SecurityError` in Safari private browsing and `QuotaExceededError` when storage is full. Both cases are silently ignored; the app falls back gracefully to the server-provided `initialTheme`.

**`ThemeToggle`** — new client component at `components/settings/ThemeToggle.tsx`:
- `settings/page.tsx` (server component) reads `profile.theme` from Supabase alongside the existing profile fields and passes it as a prop to `ThemeToggle`. No additional fetch is required.
- Accepts `initialTheme: 'system' | 'dark' | 'light'` prop to set its initial selected state
- Segmented control with three buttons: `auto`, `dark`, `light`
- On change: updates local state optimistically, writes to Supabase in background (single immediate retry on failure; if retry fails, local state diverges silently — same policy as mobile), dispatches `solbook:theme-change` custom event with payload `{ detail: { theme: 'system' | 'dark' | 'light' } }`, writes resolved hint to `localStorage`
- `ThemeProvider` reads the new preference from `event.detail.theme` and re-resolves the effective theme
- Rendered inside the existing settings page

### Mobile (Expo / React Native)

**`lib/theme.ts`** — refactored from a single `colors` export to two named exports plus shared tokens:

```ts
const sharedColors = {
  accent: '#cb4b16',
  accentHover: '#d45d1e',
  accentAlt: '#b58900',
  brand: '#ff7700',
  danger: '#dc322f',
}

export const darkColors = {
  ...sharedColors,
  bg: '#052327',
  surface: '#0b2b2e',
  border: '#586e75',
  text: '#839496',
  muted: '#657b83',
}

export const lightColors = {
  ...sharedColors,
  bg: '#fdf3d8',
  surface: '#ede8d0',
  border: '#93a1a1',
  text: '#657b83',
  muted: '#839496',
}
```

**`ThemeContext`** (`lib/ThemeContext.tsx`) — new React context:
- Provides `{ colors, theme, setTheme }` to the entire app
- Initial state (before the Supabase fetch resolves): uses `useColorScheme()` immediately to resolve a provisional theme from the OS signal, falling back to `light` if unavailable. This means the app renders with the correct OS-matched theme instantly, and silently updates if the fetched preference differs.
- On mount: fetches `profile.theme` from Supabase; on resolution, re-runs the resolution logic and updates `colors` if the result differs from the provisional value
- Uses `useColorScheme()` from React Native to read OS preference
- Resolves effective theme using the resolution logic above
- `setTheme(value)`: optimistic local update + async Supabase write with a single immediate retry on failure; if retry also fails, the local state remains (diverges from DB until next app launch — acceptable, no alert shown)

**StyleSheet migration** — all components currently calling `StyleSheet.create({...})` at module scope with static `colors` must be updated. `StyleSheet.create` freezes styles at call time, so it does not respond to theme changes. The migration pattern is:

```ts
// Before (module scope — does not update on theme change)
const styles = StyleSheet.create({ container: { backgroundColor: colors.bg } })

// After (inside component — re-evaluated on theme change)
export default function MyComponent() {
  const { colors } = useTheme()
  const styles = useMemo(() => StyleSheet.create({
    container: { backgroundColor: colors.bg },
  }), [colors])
  ...
}
```

All components that use `StyleSheet.create` with theme-sensitive values must follow this pattern.

**Root layout** (`app/_layout.tsx`):
- `ThemeContextProvider` wraps `AlertsContextProvider`
- The pre-font loading spinner (rendered before the provider tree mounts) uses the light palette hardcoded: `backgroundColor: lightColors.bg`, `color: lightColors.accent`. This is acceptable — the spinner is shown only during initial font load and is not theme-sensitive.

**`ThemeToggle`** (`components/ThemeToggle.tsx`) — new component:
- Segmented control: `auto / dark / light`
- Calls `setTheme` from context on press
- Styled using resolved `colors` from context
- Rendered inside the existing `settings.tsx` screen in a new "appearance" section above "profile"

---

## Settings UI

Both platforms add an **appearance** section at the top of the settings screen, above the existing profile section:

```
appearance
[ auto ][ dark ][ light ]   ← segmented control, active option highlighted in accent color
auto follows your device setting
```

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| Supabase fetch fails on load | Fall back to `'system'`, resolve normally. No error shown. |
| Supabase write fails on toggle | Keep optimistic local update. Single immediate retry. If retry fails, local state diverges from DB until next launch. No alert shown. |
| New user / no profile row | DB default `'system'` ensures a valid value always exists. |
| OS preference unavailable (SSR, older Android) | Resolves to `light`. |
| Web hydration flicker | Inline script applies resolved `localStorage` hint (`'dark'`\|`'light'`) to `data-theme` before hydration. |
| `localStorage` unavailable (Safari private, quota exceeded) | Both the inline script read and `ThemeProvider` write are wrapped in `try/catch`. Errors are silently swallowed; app falls back to server-provided `initialTheme`. |

---

## Testing

| Test | Type | Platform |
|---|---|---|
| Resolution function: all 5 input combos → correct output | Unit | Both |
| `ThemeContext` provides correct `colors` for each of the 3 preference values | Component | Mobile |
| `ThemeProvider` sets correct `data-theme` for each preference × OS combination | Component | Web |
| `ThemeProvider` passes resolved value (not `'system'`) to `localStorage` | Unit | Web |
| Flash-prevention script: `localStorage` hint is applied to `<html>` before hydration | Integration | Web |

---

## Out of Scope

- Per-component custom theming beyond the defined tokens
- Additional theme variants (e.g. high contrast, sepia)
- Theme preview in settings before applying
