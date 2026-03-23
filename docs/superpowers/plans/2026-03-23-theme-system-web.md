# Theme System — Database Migration + Web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Solarized dark/light theme with OS detection and a 3-way settings toggle to the Next.js web app, synced via Supabase.

**Architecture:** A `resolveTheme` pure utility determines the effective theme from a user preference + OS signal. A `ThemeProvider` client component applies `data-theme` to `<html>` and listens for changes. CSS custom properties in `globals.css` swap all token values based on `data-theme`. A flash-prevention inline script in the root layout applies a cached hint before React hydrates.

**Tech Stack:** Next.js 15, React 19, Tailwind CSS v4, Vitest + React Testing Library (jsdom), Supabase (server-side client + server actions), TypeScript

**Run all web tests with:** `cd apps/web && bun run test`

---

## File Map

| Action | Path | Purpose |
|---|---|---|
| Create | `supabase/migrations/20260323000000_add_theme_to_profiles.sql` | Adds `theme` column to `profiles` |
| Modify | `apps/web/vitest.config.ts` | Add `@/` path alias so component imports resolve in tests |
| Create | `apps/web/src/lib/resolveTheme.ts` | Pure function: pref × OS → `'dark'`\|`'light'` |
| Create | `apps/web/src/lib/resolveTheme.test.ts` | Unit tests for all 5 resolution combinations |
| Modify | `apps/web/src/app/globals.css` | Replace `@theme` colors + hardcoded values with `[data-theme]` scoped blocks |
| Modify | `apps/web/src/app/layout.tsx` | Add flash-prevention inline script to `<head>` |
| Create | `apps/web/src/components/ThemeProvider.tsx` | Client component: applies `data-theme` to `<html>`, watches OS + custom events |
| Create | `apps/web/src/components/ThemeProvider.test.tsx` | Tests: correct `data-theme` for each pref × OS combo, event handling |
| Modify | `apps/web/src/app/(app)/layout.tsx` | Fetch `profile.theme`, wrap children in `<ThemeProvider>` |
| Modify | `apps/web/src/actions/profiles.ts` | Add `updateTheme` server action |
| Create | `apps/web/src/components/settings/ThemeToggle.tsx` | Client component: `auto/dark/light` segmented control |
| Create | `apps/web/src/components/settings/ThemeToggle.test.tsx` | Tests: renders 3 buttons, active state, dispatches event |
| Modify | `apps/web/src/app/(app)/settings/page.tsx` | Fetch `theme` from profile, render `<ThemeToggle>` in new appearance section |

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260323000000_add_theme_to_profiles.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- supabase/migrations/20260323000000_add_theme_to_profiles.sql
ALTER TABLE profiles
  ADD COLUMN theme TEXT NOT NULL DEFAULT 'system'
  CHECK (theme IN ('system', 'dark', 'light'));
```

- [ ] **Step 2: Apply the migration**

```bash
cd /path/to/project && supabase db push
```

Expected: migration applies cleanly, `profiles` table now has a `theme` column defaulting to `'system'`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260323000000_add_theme_to_profiles.sql
git commit -m "feat: add theme column to profiles table"
```

---

## Task 2: Vitest Path Alias

**Files:**
- Modify: `apps/web/vitest.config.ts`

The current vitest config has no `@/` alias. Components use `@/` imports internally, so tests need the alias to resolve them.

- [ ] **Step 1: Add alias to vitest config**

Replace the entire file content:

```ts
// apps/web/vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
})
```

- [ ] **Step 2: Run existing tests to confirm nothing broke**

```bash
cd apps/web && bun run test
```

Expected: all existing tests pass.

- [ ] **Step 3: Commit**

```bash
git add apps/web/vitest.config.ts
git commit -m "chore(web): add @/ path alias to vitest config"
```

---

## Task 3: `resolveTheme` Utility

**Files:**
- Create: `apps/web/src/lib/resolveTheme.ts`
- Create: `apps/web/src/lib/resolveTheme.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// apps/web/src/lib/resolveTheme.test.ts
import { describe, it, expect } from 'vitest'
import { resolveTheme } from './resolveTheme'

describe('resolveTheme', () => {
  it('returns dark when pref is dark, regardless of OS', () => {
    expect(resolveTheme('dark', 'light')).toBe('dark')
    expect(resolveTheme('dark', null)).toBe('dark')
  })

  it('returns light when pref is light, regardless of OS', () => {
    expect(resolveTheme('light', 'dark')).toBe('light')
    expect(resolveTheme('light', null)).toBe('light')
  })

  it('returns dark when pref is system and OS is dark', () => {
    expect(resolveTheme('system', 'dark')).toBe('dark')
  })

  it('returns light when pref is system and OS is light', () => {
    expect(resolveTheme('system', 'light')).toBe('light')
  })

  it('returns light when pref is system and OS is unknown', () => {
    expect(resolveTheme('system', null)).toBe('light')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd apps/web && bun run test src/lib/resolveTheme.test.ts
```

Expected: FAIL — `resolveTheme` is not defined.

- [ ] **Step 3: Implement `resolveTheme`**

```ts
// apps/web/src/lib/resolveTheme.ts
export type ThemePref = 'system' | 'dark' | 'light'
export type ResolvedTheme = 'dark' | 'light'

export function resolveTheme(
  pref: ThemePref,
  osScheme: 'dark' | 'light' | null,
): ResolvedTheme {
  if (pref === 'dark') return 'dark'
  if (pref === 'light') return 'light'
  if (osScheme === 'dark') return 'dark'
  return 'light'
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd apps/web && bun run test src/lib/resolveTheme.test.ts
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/resolveTheme.ts apps/web/src/lib/resolveTheme.test.ts
git commit -m "feat(web): add resolveTheme utility with tests"
```

---

## Task 4: Update `globals.css` Token Swap

**Files:**
- Modify: `apps/web/src/app/globals.css`

Replace the entire file:

- [ ] **Step 1: Replace globals.css**

```css
/* apps/web/src/app/globals.css */
@import url('https://fonts.googleapis.com/css2?family=Courier+Prime:ital,wght@0,400;0,700;1,400;1,700&display=swap');
@import "tailwindcss";

@theme {
  --font-mono: 'Courier Prime', 'Courier New', monospace;
}

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

* {
  box-sizing: border-box;
}

html {
  font-family: 'Courier Prime', 'Courier New', monospace;
}

body {
  background-color: var(--color-bg);
  color: var(--color-text);
  font-family: 'Courier Prime', 'Courier New', monospace;
}

a {
  color: inherit;
}

::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: var(--color-bg);
}
::-webkit-scrollbar-thumb {
  background: var(--color-border);
}
```

- [ ] **Step 2: Verify the dev server loads without CSS errors**

```bash
cd apps/web && bun run dev
```

Open the app in a browser. Expected: page loads. Colors will look broken until `data-theme` is applied by `ThemeProvider` in a later task — this is expected.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/globals.css
git commit -m "feat(web): replace hardcoded CSS colors with data-theme scoped tokens"
```

---

## Task 5: Flash-Prevention Script in Root Layout

**Files:**
- Modify: `apps/web/src/app/layout.tsx`

- [ ] **Step 1: Add inline script to `<head>` in root layout**

The script reads the cached resolved theme from `localStorage` and applies it to `<html>` before React hydrates. This prevents a flash of the wrong theme on page load. Wrap in `try/catch` to handle Safari private browsing.

Current `layout.tsx` body:
```tsx
return (
  <html lang="en">
    <head>
      <meta name="robots" content="noai, noimageai, noindex, noarchive, nositelinkssearchbox" />
    </head>
    <body>{children}</body>
  </html>
)
```

Updated:
```tsx
return (
  <html lang="en">
    <head>
      <meta name="robots" content="noai, noimageai, noindex, noarchive, nositelinkssearchbox" />
      <script
        dangerouslySetInnerHTML={{
          __html: `try{var h=localStorage.getItem('solbook-theme-hint');if(h==='dark'||h==='light')document.documentElement.setAttribute('data-theme',h)}catch(_){}`,
        }}
      />
    </head>
    <body>{children}</body>
  </html>
)
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/layout.tsx
git commit -m "feat(web): add flash-prevention theme script to root layout"
```

---

## Task 6: `ThemeProvider` Component

**Files:**
- Create: `apps/web/src/components/ThemeProvider.tsx`
- Create: `apps/web/src/components/ThemeProvider.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// apps/web/src/components/ThemeProvider.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { ThemeProvider } from './ThemeProvider'

function mockMatchMedia(prefersDark: boolean) {
  const listeners: Array<(e: { matches: boolean }) => void> = []
  const mq = {
    matches: prefersDark,
    addEventListener: (_: string, fn: (e: { matches: boolean }) => void) => listeners.push(fn),
    removeEventListener: vi.fn(),
  }
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockReturnValue(mq),
  })
  return { mq, triggerChange: (dark: boolean) => listeners.forEach(fn => fn({ matches: dark })) }
}

beforeEach(() => {
  document.documentElement.removeAttribute('data-theme')
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ThemeProvider', () => {
  it('applies dark when initialTheme is dark', () => {
    mockMatchMedia(false)
    render(<ThemeProvider initialTheme="dark"><div /></ThemeProvider>)
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('applies light when initialTheme is light', () => {
    mockMatchMedia(true)
    render(<ThemeProvider initialTheme="light"><div /></ThemeProvider>)
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('follows OS dark when initialTheme is system', () => {
    mockMatchMedia(true)
    render(<ThemeProvider initialTheme="system"><div /></ThemeProvider>)
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('defaults to light when initialTheme is system and OS is light', () => {
    mockMatchMedia(false)
    render(<ThemeProvider initialTheme="system"><div /></ThemeProvider>)
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('writes resolved value (not system) to localStorage', () => {
    mockMatchMedia(false)
    render(<ThemeProvider initialTheme="system"><div /></ThemeProvider>)
    expect(localStorage.getItem('solbook-theme-hint')).toBe('light')
  })

  it('updates data-theme when OS scheme changes', () => {
    const { triggerChange } = mockMatchMedia(false)
    render(<ThemeProvider initialTheme="system"><div /></ThemeProvider>)
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    act(() => triggerChange(true))
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('updates data-theme on solbook:theme-change event', () => {
    mockMatchMedia(false)
    render(<ThemeProvider initialTheme="light"><div /></ThemeProvider>)
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    act(() => {
      window.dispatchEvent(
        new CustomEvent('solbook:theme-change', { detail: { theme: 'dark' } }),
      )
    })
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd apps/web && bun run test src/components/ThemeProvider.test.tsx
```

Expected: FAIL — `ThemeProvider` not found.

- [ ] **Step 3: Implement `ThemeProvider`**

```tsx
// apps/web/src/components/ThemeProvider.tsx
'use client'

import { useEffect, useRef } from 'react'
import { resolveTheme, type ThemePref } from '@/lib/resolveTheme'

interface Props {
  initialTheme: ThemePref
  children: React.ReactNode
}

const STORAGE_KEY = 'solbook-theme-hint'

function getOsScheme(): 'dark' | 'light' | null {
  if (typeof window === 'undefined') return null
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(pref: ThemePref, osScheme: 'dark' | 'light' | null) {
  const resolved = resolveTheme(pref, osScheme)
  document.documentElement.setAttribute('data-theme', resolved)
  try {
    localStorage.setItem(STORAGE_KEY, resolved)
  } catch (_) {}
}

export function ThemeProvider({ initialTheme, children }: Props) {
  const prefRef = useRef<ThemePref>(initialTheme)

  useEffect(() => {
    applyTheme(prefRef.current, getOsScheme())

    const mq = window.matchMedia('(prefers-color-scheme: dark)')

    function onOsChange(e: { matches: boolean }) {
      applyTheme(prefRef.current, e.matches ? 'dark' : 'light')
    }

    function onThemeChange(e: Event) {
      const { theme } = (e as CustomEvent<{ theme: ThemePref }>).detail
      prefRef.current = theme
      applyTheme(theme, getOsScheme())
    }

    mq.addEventListener('change', onOsChange)
    window.addEventListener('solbook:theme-change', onThemeChange)

    return () => {
      mq.removeEventListener('change', onOsChange)
      window.removeEventListener('solbook:theme-change', onThemeChange)
    }
  }, [])

  return <>{children}</>
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd apps/web && bun run test src/components/ThemeProvider.test.tsx
```

Expected: 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/ThemeProvider.tsx apps/web/src/components/ThemeProvider.test.tsx
git commit -m "feat(web): add ThemeProvider component with tests"
```

---

## Task 7: Wire `ThemeProvider` Into App Layout

**Files:**
- Modify: `apps/web/src/app/(app)/layout.tsx`

The existing `getSessionProfile()` in this file already queries `profiles`. Add `theme` to the select and pass it to `ThemeProvider`.

- [ ] **Step 1: Update `getSessionProfile` to fetch `theme`**

Find this line in `getSessionProfile()`:
```ts
const { data } = await supabase
  .from('profiles')
  .select('username, alerts_last_seen_at')
  .eq('id', session.userId)
  .single()
```

Change to:
```ts
const { data } = await supabase
  .from('profiles')
  .select('username, alerts_last_seen_at, theme')
  .eq('id', session.userId)
  .single()
```

- [ ] **Step 2: Return `theme` from `getSessionProfile`**

Find:
```ts
return {
  username: data.username,
  hasUnseenAlerts: (recentLike ?? []).length > 0 || (recentFollow ?? []).length > 0,
}
```

Change to:
```ts
return {
  username: data.username,
  hasUnseenAlerts: (recentLike ?? []).length > 0 || (recentFollow ?? []).length > 0,
  theme: (data.theme ?? 'system') as 'system' | 'dark' | 'light',
}
```

- [ ] **Step 3: Add `ThemeProvider` import and wrap children**

Add to imports:
```ts
import { ThemeProvider } from '@/components/ThemeProvider'
```

Find the return statement in `AppLayout`:
```tsx
return (
  <AlertsProvider hasUnseenAlerts={profile.hasUnseenAlerts}>
    <div className="flex flex-col min-h-screen">
      <TopNav username={profile.username} />
      <main className="flex-1 min-w-0 pb-16 md:pb-0">{children}</main>
      <BottomNav username={profile.username} />
    </div>
  </AlertsProvider>
)
```

Change to:
```tsx
return (
  <ThemeProvider initialTheme={profile.theme}>
    <AlertsProvider hasUnseenAlerts={profile.hasUnseenAlerts}>
      <div className="flex flex-col min-h-screen">
        <TopNav username={profile.username} />
        <main className="flex-1 min-w-0 pb-16 md:pb-0">{children}</main>
        <BottomNav username={profile.username} />
      </div>
    </AlertsProvider>
  </ThemeProvider>
)
```

- [ ] **Step 4: Verify app loads with correct theme**

```bash
cd apps/web && bun run dev
```

Open browser. Expected: page background is now `#fdf3d8` (light) or `#052327` (dark) based on OS preference. Verify in DevTools that `<html>` has `data-theme="light"` or `data-theme="dark"`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/\(app\)/layout.tsx
git commit -m "feat(web): wire ThemeProvider into app layout"
```

---

## Task 8: `updateTheme` Server Action

**Files:**
- Modify: `apps/web/src/actions/profiles.ts`

- [ ] **Step 1: Add `updateTheme` to `actions/profiles.ts`**

Append to the end of `apps/web/src/actions/profiles.ts`:

```ts
export async function updateTheme(theme: 'system' | 'dark' | 'light'): Promise<void> {
  const session = await requireSession()
  const supabase = createServerClient()
  await supabase
    .from('profiles')
    .update({ theme })
    .eq('id', session.userId)
}
```

- [ ] **Step 2: Run existing tests to confirm nothing broke**

```bash
cd apps/web && bun run test
```

Expected: all existing tests still pass.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/actions/profiles.ts
git commit -m "feat(web): add updateTheme server action"
```

---

## Task 9: `ThemeToggle` Web Component

**Files:**
- Create: `apps/web/src/components/settings/ThemeToggle.tsx`
- Create: `apps/web/src/components/settings/ThemeToggle.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// apps/web/src/components/settings/ThemeToggle.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeToggle } from './ThemeToggle'

vi.mock('@/actions/profiles', () => ({
  updateTheme: vi.fn().mockResolvedValue(undefined),
}))

beforeEach(() => {
  localStorage.clear()
})

describe('ThemeToggle', () => {
  it('renders three options: auto, dark, light', () => {
    render(<ThemeToggle initialTheme="system" />)
    expect(screen.getByText('auto')).toBeInTheDocument()
    expect(screen.getByText('dark')).toBeInTheDocument()
    expect(screen.getByText('light')).toBeInTheDocument()
  })

  it('marks the current preference as active', () => {
    render(<ThemeToggle initialTheme="dark" />)
    expect(screen.getByText('dark').closest('button')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('auto').closest('button')).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText('light').closest('button')).toHaveAttribute('aria-pressed', 'false')
  })

  it('marks auto as active when initialTheme is system', () => {
    render(<ThemeToggle initialTheme="system" />)
    expect(screen.getByText('auto').closest('button')).toHaveAttribute('aria-pressed', 'true')
  })

  it('dispatches solbook:theme-change event with correct theme on click', () => {
    render(<ThemeToggle initialTheme="system" />)
    const received: string[] = []
    window.addEventListener('solbook:theme-change', (e) => {
      received.push((e as CustomEvent<{ theme: string }>).detail.theme)
    })
    fireEvent.click(screen.getByText('dark'))
    expect(received).toEqual(['dark'])
  })

  it('updates active state after clicking a different option', () => {
    render(<ThemeToggle initialTheme="light" />)
    fireEvent.click(screen.getByText('dark'))
    expect(screen.getByText('dark').closest('button')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('light').closest('button')).toHaveAttribute('aria-pressed', 'false')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd apps/web && bun run test src/components/settings/ThemeToggle.test.tsx
```

Expected: FAIL — `ThemeToggle` not found.

- [ ] **Step 3: Implement `ThemeToggle`**

```tsx
// apps/web/src/components/settings/ThemeToggle.tsx
'use client'

import { useState } from 'react'
import { updateTheme } from '@/actions/profiles'
import type { ThemePref } from '@/lib/resolveTheme'

const OPTIONS: { label: string; value: ThemePref }[] = [
  { label: 'auto', value: 'system' },
  { label: 'dark', value: 'dark' },
  { label: 'light', value: 'light' },
]

const STORAGE_KEY = 'solbook-theme-hint'

interface Props {
  initialTheme: ThemePref
}

export function ThemeToggle({ initialTheme }: Props) {
  const [active, setActive] = useState<ThemePref>(initialTheme)

  async function handleChange(theme: ThemePref) {
    setActive(theme)
    window.dispatchEvent(
      new CustomEvent('solbook:theme-change', { detail: { theme } }),
    )
    // updateTheme keeps localStorage hint in sync (ThemeProvider writes it on event)
    try {
      await updateTheme(theme)
    } catch {
      try {
        await updateTheme(theme) // single retry
      } catch {
        // silent failure — optimistic state stays
      }
    }
  }

  return (
    <div className="flex">
      {OPTIONS.map(({ label, value }) => (
        <button
          key={value}
          aria-pressed={active === value}
          onClick={() => handleChange(value)}
          className={[
            'border border-[var(--color-border)] px-4 py-2 text-xs font-[family-name:var(--font-mono)]',
            'first:border-r-0 last:border-l-0',
            active === value
              ? 'bg-[var(--color-accent)] text-[var(--color-bg)]'
              : 'bg-[var(--color-bg)] text-[var(--color-muted)] hover:text-[var(--color-text)]',
          ].join(' ')}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd apps/web && bun run test src/components/settings/ThemeToggle.test.tsx
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/settings/ThemeToggle.tsx apps/web/src/components/settings/ThemeToggle.test.tsx
git commit -m "feat(web): add ThemeToggle component with tests"
```

---

## Task 10: Wire `ThemeToggle` Into Settings Page

**Files:**
- Modify: `apps/web/src/app/(app)/settings/page.tsx`

- [ ] **Step 1: Update the Supabase query to include `theme`**

Find:
```ts
const { data: profile } = await supabase
  .from('profiles')
  .select('username, display_name, bio')
  .eq('id', session.userId)
  .single()
```

Change to:
```ts
const { data: profile } = await supabase
  .from('profiles')
  .select('username, display_name, bio, theme')
  .eq('id', session.userId)
  .single()
```

- [ ] **Step 2: Add `ThemeToggle` import**

```ts
import { ThemeToggle } from '@/components/settings/ThemeToggle'
import type { ThemePref } from '@/lib/resolveTheme'
```

- [ ] **Step 3: Add appearance section above the profile section**

Find:
```tsx
<div className="border-b border-[#333333] px-4 py-4">
  <h2 className="text-xs text-[#888880] uppercase tracking-wide mb-3">profile</h2>
```

Insert before it:
```tsx
<div className="border-b border-[var(--color-border)] px-4 py-4">
  <h2 className="text-xs text-[var(--color-muted)] uppercase tracking-wide mb-3">appearance</h2>
  <ThemeToggle initialTheme={(profile?.theme ?? 'system') as ThemePref} />
  <p className="text-xs text-[var(--color-muted)] mt-2">auto follows your device setting</p>
</div>
```

- [ ] **Step 4: Update remaining hardcoded color values in this file to use CSS vars**

Replace all occurrences of hardcoded hex colors in the settings page JSX:
- `border-[#333333]` → `border-[var(--color-border)]`
- `text-[#888880]` → `text-[var(--color-muted)]`
- `bg-[#242424]` → `bg-[var(--color-surface)]`
- `text-[#e8e6d9]` → `text-[var(--color-text)]`
- `placeholder:text-[#555550]` → `placeholder:text-[var(--color-muted)]`
- `focus:border-[#ff6600]` → `focus:border-[var(--color-brand)]`
- `bg-[#ff6600]` → `bg-[var(--color-brand)]`
- `hover:bg-[#ff7722]` → `hover:bg-[var(--color-accent-hover)]`
- `text-[#1c1c1c]` → `text-[var(--color-bg)]`

- [ ] **Step 5: Run full test suite**

```bash
cd apps/web && bun run test
```

Expected: all tests pass.

- [ ] **Step 6: Verify in browser**

```bash
cd apps/web && bun run dev
```

Navigate to `/settings`. Expected: appearance section appears at top with `auto / dark / light` buttons. Clicking a button changes the page theme immediately. Verify with browser DevTools that `data-theme` on `<html>` updates.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/\(app\)/settings/page.tsx
git commit -m "feat(web): add theme toggle to settings page"
```

---

## Final Check

- [ ] **Run full test suite one last time**

```bash
cd apps/web && bun run test
```

Expected: all tests pass with no warnings.

- [ ] **Smoke test the full theme flow**

1. Open app in browser with OS set to dark → page should show dark theme
2. Navigate to settings → toggle should show "auto" active
3. Click "light" → page switches to light theme immediately
4. Reload page → stays on light (localStorage hint + Supabase persist)
5. Click "dark" → page switches to dark
6. Click "auto" → page follows OS again
