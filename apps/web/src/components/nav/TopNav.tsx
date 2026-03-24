'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useHasUnseenAlerts } from './AlertsContext'

interface TopNavProps {
  username: string
}

const NAV_ITEMS = (username: string) => [
  { href: '/home', label: 'home' },
  { href: '/discover', label: 'discover' },
  { href: `/${username}`, label: `@${username}` },
]

function bracketLabel(base: string, active: boolean) {
  return active ? `[${base}]` : base
}

function SearchIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function BellIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? '0' : '2'}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" strokeWidth="2" stroke="currentColor" fill="none" />
    </svg>
  )
}

export function TopNav({ username }: TopNavProps) {
  const pathname = usePathname()
  const alertsActive = pathname.startsWith('/notifications')
  const searchActive = pathname.startsWith('/search')
  const hasUnseenAlerts = useHasUnseenAlerts()

  const bellColor = alertsActive ? 'var(--color-accent)' : hasUnseenAlerts ? 'var(--color-text)' : 'var(--color-muted)'
  const searchColor = searchActive ? 'var(--color-accent)' : 'var(--color-muted)'

  return (
    <header className="hidden md:block bg-[var(--color-surface)] border-b border-[var(--color-border)] sticky top-0 z-10">
      <div className="max-w-2xl mx-auto flex items-center px-4 py-2">
        <Link
          href="/home"
          className="font-bold transition-colors mr-auto"
          style={{ color: 'var(--color-brand)' }}
        >
          solbook
        </Link>
        <nav className="flex items-center gap-5">
          {NAV_ITEMS(username).map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className="text-sm transition-colors"
                style={{ color: active ? 'var(--color-accent)' : 'var(--color-text-strong)', fontWeight: active ? 'bold' : 'normal' }}
              >
                {bracketLabel(label, active)}
              </Link>
            )
          })}
          <Link
            href="/search"
            className="transition-colors"
            style={{ color: searchColor }}
            aria-label="search"
          >
            <SearchIcon />
          </Link>
          <Link
            href="/notifications"
            className="transition-colors"
            style={{ color: bellColor }}
            aria-label="alerts"
          >
            <BellIcon filled={hasUnseenAlerts && !alertsActive} />
          </Link>
        </nav>
      </div>
    </header>
  )
}
