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
| `accent-alt` | `#b58900` | `#b58900` | Tags, badges, highlights (Solarized yellow) |
| `brand` | `#ff7700` | `#ff7700` | Logo, wordmark, primary CTAs |

**Notes:**
- Dark bg/surface are a warmed variant of Solarized Dark (original `#002b36` / `#073642`), shifted toward teal-neutral to reduce the blue-green cast.
- Light bg/surface are a warmed variant of Solarized Light (original `#fdf6e3` / `#eee8d5`), shifted toward warm amber.
- `brand` (`#ff7700`) is used exclusively for logo and branding elements. `accent` (`#cb4b16`) is used for all other interactive/highlight elements.

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

**CSS tokens** — `globals.css` gains two scoped blocks replacing the current hardcoded values:

```css
[data-theme="light"] {
  --color-bg: #fdf3d8;
  --color-surface: #ede8d0;
  --color-border: #93a1a1;
  --color-text: #657b83;
  --color-muted: #839496;
  --color-accent: #cb4b16;
  --color-accent-alt: #b58900;
  --color-brand: #ff7700;
}

[data-theme="dark"] {
  --color-bg: #052327;
  --color-surface: #0b2b2e;
  --color-border: #586e75;
  --color-text: #839496;
  --color-muted: #657b83;
  --color-accent: #cb4b16;
  --color-accent-alt: #b58900;
  --color-brand: #ff7700;
}
```

All existing Tailwind utility classes that reference these vars (`bg-[var(--color-bg)]` etc.) continue to work unchanged.

**`ThemeProvider`** — new client component added to `app/(app)/layout.tsx`:
- Fetches `profile.theme` from Supabase on mount
- Watches `window.matchMedia('(prefers-color-scheme: dark)')` for OS changes
- Resolves effective theme and writes `data-theme` attribute to `<html>`
- Listens for a custom `solbook:theme-change` event dispatched by `ThemeToggle` for instant in-page updates without a re-fetch
- Renders an inline `<script>` that reads `localStorage.getItem('solbook-theme-hint')` and applies it to `<html>` before React hydrates, preventing flash of wrong theme

**`ThemeToggle`** — new client component at `components/settings/ThemeToggle.tsx`:
- Segmented control with three buttons: `auto`, `dark`, `light`
- On change: updates local state optimistically, writes to Supabase in background, dispatches `solbook:theme-change` event, writes hint to `localStorage`
- Rendered inside the existing settings page

### Mobile (Expo / React Native)

**`lib/theme.ts`** — refactored from a single `colors` export to two named exports:

```ts
export const darkColors = { bg: '#052327', surface: '#0b2b2e', ... }
export const lightColors = { bg: '#fdf3d8', surface: '#ede8d0', ... }
```

**`ThemeContext`** (`lib/ThemeContext.tsx`) — new React context:
- Provides `{ colors, theme, setTheme }` to the entire app
- On mount: fetches `profile.theme` from Supabase
- Uses `useColorScheme()` from React Native to read OS preference
- Resolves effective theme using the resolution logic above
- `setTheme(value)`: optimistic local update + async Supabase write

**Root layout** (`app/_layout.tsx`) — wraps existing `AlertsContextProvider` with `ThemeContextProvider`. All components that currently import `colors` from `lib/theme` switch to `const { colors } = useTheme()`.

**`ThemeToggle`** (`components/ThemeToggle.tsx`) — new component:
- Segmented control: `auto / dark / light`
- Calls `setTheme` from context on press
- Styled using resolved `colors` from context

Rendered inside the existing `settings.tsx` screen in a new "appearance" section above "profile".

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
| Supabase write fails on toggle | Keep optimistic local update. Silent single retry. No alert. |
| New user / no profile row | DB default `'system'` ensures a valid value always exists. |
| OS preference unavailable (SSR, older Android) | Resolves to `light`. |
| Web hydration flicker | Inline `<script>` applies `localStorage` hint before hydration. |

---

## Testing

| Test | Type | Platform |
|---|---|---|
| Resolution function: all 5 input combos → correct output | Unit | Both |
| `ThemeContext` provides correct `colors` for each of the 3 preference values | Component | Mobile |
| `ThemeProvider` sets correct `data-theme` for each preference × OS combination | Component | Web |

Visual correctness is covered by the approved mockups; no E2E tests required for theme.

---

## Out of Scope

- Per-component custom theming beyond the defined tokens
- Additional theme variants (e.g. high contrast, sepia)
- Theme preview in settings before applying
