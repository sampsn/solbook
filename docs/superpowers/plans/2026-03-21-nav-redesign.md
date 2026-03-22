# Nav Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the left sidebar with a top nav bar on desktop/tablet, update the mobile bottom nav to show `@username` instead of `settings`, and add a settings link on the user's own profile page.

**Architecture:** New `TopNav` client component handles desktop header (hidden on mobile). Existing `BottomNav` is updated to accept `username` as a prop and gains active-state bracket styling. `AppLayout` wires both together. Sidebar and compose route are deleted.

**Tech Stack:** Next.js 15, Tailwind CSS v4, `usePathname()` for active state, `@testing-library/react` + vitest for component tests.

---

## File Map

| Action | File |
|--------|------|
| Create | `apps/web/src/components/nav/TopNav.tsx` |
| Modify | `apps/web/src/components/nav/BottomNav.tsx` |
| Modify | `apps/web/src/app/(app)/layout.tsx` |
| Modify | `apps/web/src/app/[username]/page.tsx` |
| Delete | `apps/web/src/components/nav/Sidebar.tsx` |
| Delete | `apps/web/src/app/(app)/compose/page.tsx` |
| Create | `apps/web/src/components/nav/TopNav.test.tsx` |
| Create | `apps/web/src/components/nav/BottomNav.test.tsx` |

---

### Task 1: Create TopNav component

**Files:**
- Create: `apps/web/src/components/nav/TopNav.tsx`
- Create: `apps/web/src/components/nav/TopNav.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `apps/web/src/components/nav/TopNav.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TopNav } from './TopNav'

// Mock usePathname
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}))

import { usePathname } from 'next/navigation'

describe('TopNav', () => {
  it('renders the solbook logo', () => {
    vi.mocked(usePathname).mockReturnValue('/home')
    render(<TopNav username="gabriel" />)
    expect(screen.getByText('solbook')).toBeInTheDocument()
  })

  it('wraps the active route label in brackets', () => {
    vi.mocked(usePathname).mockReturnValue('/home')
    render(<TopNav username="gabriel" />)
    expect(screen.getByText('[home]')).toBeInTheDocument()
  })

  it('wraps alerts in brackets when on /notifications', () => {
    vi.mocked(usePathname).mockReturnValue('/notifications')
    render(<TopNav username="gabriel" />)
    expect(screen.getByText('[alerts]')).toBeInTheDocument()
  })

  it('wraps @username in brackets when on own profile', () => {
    vi.mocked(usePathname).mockReturnValue('/gabriel')
    render(<TopNav username="gabriel" />)
    expect(screen.getByText('[@gabriel]')).toBeInTheDocument()
  })

  it('does not bracket inactive links', () => {
    vi.mocked(usePathname).mockReturnValue('/home')
    render(<TopNav username="gabriel" />)
    expect(screen.getByText('discover')).toBeInTheDocument()
    expect(screen.getByText('alerts')).toBeInTheDocument()
  })

  it('links @username to the profile route', () => {
    vi.mocked(usePathname).mockReturnValue('/home')
    render(<TopNav username="gabriel" />)
    const link = screen.getByText('@gabriel').closest('a')
    expect(link).toHaveAttribute('href', '/gabriel')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd apps/web && bun run test -- TopNav
```

Expected: all tests fail (TopNav doesn't exist yet).

- [ ] **Step 3: Implement TopNav**

Create `apps/web/src/components/nav/TopNav.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface TopNavProps {
  username: string
}

const NAV_ITEMS = (username: string) => [
  { href: '/home', label: 'home' },
  { href: '/discover', label: 'discover' },
  { href: '/notifications', label: 'alerts' },
  { href: `/${username}`, label: `@${username}` },
]

function label(base: string, active: boolean) {
  return active ? `[${base}]` : base
}

export function TopNav({ username }: TopNavProps) {
  const pathname = usePathname()

  return (
    <header className="hidden md:flex items-center bg-[#242424] border-b border-[#333333] px-4 py-2 sticky top-0 z-10">
      <Link
        href="/home"
        className="font-bold text-[#ff6600] hover:text-[#ff7722] transition-colors mr-auto"
      >
        solbook
      </Link>
      <nav className="flex items-center gap-5">
        {NAV_ITEMS(username).map(({ href, label: base }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`text-sm transition-colors ${
                active
                  ? 'text-[#ff6600]'
                  : 'text-[#888880] hover:text-[#ff6600]'
              }`}
            >
              {label(base, active)}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
```

- [ ] **Step 4: Run tests and confirm they pass**

```bash
cd apps/web && bun run test -- TopNav
```

Expected: all 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/nav/TopNav.tsx apps/web/src/components/nav/TopNav.test.tsx
git commit -m "feat: add TopNav component for desktop"
```

---

### Task 2: Update BottomNav

**Files:**
- Modify: `apps/web/src/components/nav/BottomNav.tsx`
- Create: `apps/web/src/components/nav/BottomNav.test.tsx`

Current `BottomNav` has no props and a static items list that includes `compose` and `settings`. It needs: a `username` prop, `compose` removed, `settings` replaced with `@username`, and active bracket styling via `usePathname()`.

- [ ] **Step 1: Write the failing tests**

Create `apps/web/src/components/nav/BottomNav.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BottomNav } from './BottomNav'

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}))

import { usePathname } from 'next/navigation'

describe('BottomNav', () => {
  it('renders @username link', () => {
    vi.mocked(usePathname).mockReturnValue('/home')
    render(<BottomNav username="gabriel" />)
    expect(screen.getByText('@gabriel')).toBeInTheDocument()
  })

  it('does not render compose or settings links', () => {
    vi.mocked(usePathname).mockReturnValue('/home')
    render(<BottomNav username="gabriel" />)
    expect(screen.queryByText('new')).not.toBeInTheDocument()
    expect(screen.queryByText('settings')).not.toBeInTheDocument()
  })

  it('brackets the active home link', () => {
    vi.mocked(usePathname).mockReturnValue('/home')
    render(<BottomNav username="gabriel" />)
    expect(screen.getByText('[home]')).toBeInTheDocument()
  })

  it('brackets alerts when on /notifications', () => {
    vi.mocked(usePathname).mockReturnValue('/notifications')
    render(<BottomNav username="gabriel" />)
    expect(screen.getByText('[alerts]')).toBeInTheDocument()
  })

  it('brackets @username when on own profile', () => {
    vi.mocked(usePathname).mockReturnValue('/gabriel')
    render(<BottomNav username="gabriel" />)
    expect(screen.getByText('[@gabriel]')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd apps/web && bun run test -- BottomNav
```

Expected: tests fail (BottomNav doesn't accept username, still has old items).

- [ ] **Step 3: Rewrite BottomNav**

Replace `apps/web/src/components/nav/BottomNav.tsx` entirely:

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface BottomNavProps {
  username: string
}

function navItems(username: string) {
  return [
    { href: '/home', label: 'home' },
    { href: '/discover', label: 'discover' },
    { href: '/notifications', label: 'alerts' },
    { href: `/${username}`, label: `@${username}` },
  ]
}

function label(base: string, active: boolean) {
  return active ? `[${base}]` : base
}

export function BottomNav({ username }: BottomNavProps) {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-[#333333] bg-[#1c1c1c] flex">
      {navItems(username).map(({ href, label: base }) => {
        const active = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center justify-center flex-1 py-3 text-xs transition-colors ${
              active ? 'text-[#ff6600]' : 'text-[#888880] hover:text-[#ff6600]'
            }`}
          >
            {label(base, active)}
          </Link>
        )
      })}
    </nav>
  )
}
```

- [ ] **Step 4: Run tests and confirm they pass**

```bash
cd apps/web && bun run test -- BottomNav
```

Expected: all 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/nav/BottomNav.tsx apps/web/src/components/nav/BottomNav.test.tsx
git commit -m "feat: update BottomNav with username prop and active bracket state"
```

---

### Task 3: Update AppLayout

**Files:**
- Modify: `apps/web/src/app/(app)/layout.tsx`

- [ ] **Step 1: Update the layout**

Replace `apps/web/src/app/(app)/layout.tsx` entirely:

```tsx
import { redirect } from 'next/navigation'
import { createServerClient } from '@solbook/shared/supabase'
import { getSession } from '@/lib/auth'
import { TopNav } from '@/components/nav/TopNav'
import { BottomNav } from '@/components/nav/BottomNav'

async function getSessionProfile(): Promise<{ username: string } | null> {
  const session = await getSession()
  if (!session) return null

  const supabase = createServerClient()
  const { data } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', session.userId)
    .single()

  return data ? { username: data.username } : null
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getSessionProfile()
  if (!profile) redirect('/login')

  return (
    <div className="flex flex-col min-h-screen">
      <TopNav username={profile.username} />
      <main className="flex-1 min-w-0 pb-16 md:pb-0">{children}</main>
      <BottomNav username={profile.username} />
    </div>
  )
}
```

- [ ] **Step 2: Run the full test suite to check nothing broke**

```bash
cd apps/web && bun run test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/\(app\)/layout.tsx
git commit -m "feat: wire TopNav and updated BottomNav into AppLayout"
```

---

### Task 4: Add settings link to own profile page

**Files:**
- Modify: `apps/web/src/app/[username]/page.tsx`

The profile page already computes `isOwnProfile`. Add a `settings →` link visible only when `isOwnProfile` is true, placed near the profile header actions area.

- [ ] **Step 1: Add the settings link**

In `apps/web/src/app/[username]/page.tsx`, find the block that renders the follow button (only shown when `!isOwnProfile`). Add a settings link immediately after it for `isOwnProfile`:

Find this closing section of the profile header `div`:

```tsx
          {!isOwnProfile && session && (
            <form action={followAction}>
              <button
                type="submit"
                className={`text-xs px-3 py-1 border transition-colors ${
                  isFollowing
                    ? 'border-[#333333] text-[#888880] hover:border-red-400 hover:text-red-400'
                    : 'border-[#ff6600] text-[#ff6600] hover:bg-[#ff6600] hover:text-[#1c1c1c]'
                }`}
              >
                {isFollowing ? 'unfollow' : 'follow'}
              </button>
            </form>
          )}
```

Replace with:

```tsx
          {isOwnProfile ? (
            <Link href="/settings" className="text-xs text-[#888880] hover:text-[#ff6600] transition-colors">
              settings →
            </Link>
          ) : session && (
            <form action={followAction}>
              <button
                type="submit"
                className={`text-xs px-3 py-1 border transition-colors ${
                  isFollowing
                    ? 'border-[#333333] text-[#888880] hover:border-red-400 hover:text-red-400'
                    : 'border-[#ff6600] text-[#ff6600] hover:bg-[#ff6600] hover:text-[#1c1c1c]'
                }`}
              >
                {isFollowing ? 'unfollow' : 'follow'}
              </button>
            </form>
          )}
```

Add `Link` to the imports at the top of the file — it is not currently imported:

```tsx
import Link from 'next/link'
```

- [ ] **Step 2: Run tests**

```bash
cd apps/web && bun run test
```

Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add "apps/web/src/app/[username]/page.tsx"
git commit -m "feat: add settings link on own profile page"
```

---

### Task 5: Delete Sidebar and compose route

**Files:**
- Delete: `apps/web/src/components/nav/Sidebar.tsx`
- Delete: `apps/web/src/app/(app)/compose/page.tsx`

- [ ] **Step 1: Delete the files**

```bash
rm apps/web/src/components/nav/Sidebar.tsx
rm "apps/web/src/app/(app)/compose/page.tsx"
rmdir "apps/web/src/app/(app)/compose"
```

- [ ] **Step 2: Confirm no remaining imports**

```bash
grep -r "Sidebar" apps/web/src
grep -r '"/compose"' apps/web/src
grep -r "'/compose'" apps/web/src
```

Expected: no matches.

- [ ] **Step 3: Run full test suite**

```bash
cd apps/web && bun run test
```

Expected: all pass.

- [ ] **Step 4: Commit and push**

```bash
git add -A
git commit -m "chore: remove Sidebar component and /compose route"
git push
```

---

## Verification

After pushing, confirm on Vercel:
1. Desktop (≥ 768px): top nav bar visible, `solbook` logo left, nav links right, active page shows `[brackets]`
2. Mobile (< 768px): bottom nav visible, `@username` in place of `settings`, active page shows `[brackets]`
3. Own profile page: `settings →` link appears
4. `/compose` route returns 404
