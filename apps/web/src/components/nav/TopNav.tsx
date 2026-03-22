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

function bracketLabel(base: string, active: boolean) {
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
        {NAV_ITEMS(username).map(({ href, label }) => {
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
              {bracketLabel(label, active)}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
