'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

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

function BellIcon() {
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
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

export function TopNav({ username }: TopNavProps) {
  const pathname = usePathname()
  const alertsActive = pathname.startsWith('/notifications')

  return (
    <header className="hidden md:flex items-center bg-[#242424] border-b border-[#333333] px-4 py-2 sticky top-0 z-10">
      <Link
        href="/home"
        className="font-bold text-[#ff6600] hover:text-[#ff7722] transition-colors mr-auto"
      >
        solbook
      </Link>
      <nav className="flex items-center gap-5">
        {NAV_ITEMS(username).map(({ href, label }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`text-sm transition-colors ${
                active ? 'text-[#ff6600]' : 'text-[#888880] hover:text-[#ff6600]'
              }`}
            >
              {bracketLabel(label, active)}
            </Link>
          )
        })}
        <Link
          href="/notifications"
          className={`transition-colors ${alertsActive ? 'text-[#ff6600]' : 'text-[#888880] hover:text-[#ff6600]'}`}
          aria-label="alerts"
        >
          <BellIcon />
        </Link>
      </nav>
    </header>
  )
}
