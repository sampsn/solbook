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
    { href: `/${username}`, label: `@${username}` },
  ]
}

function bracketLabel(base: string, active: boolean) {
  return active ? `[${base}]` : base
}

export function BottomNav({ username }: BottomNavProps) {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-[#333333] bg-[#1c1c1c] flex">
      {navItems(username).map(({ href, label }) => {
        const active = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center justify-center flex-1 py-3 text-xs transition-colors ${
              active ? 'text-[#ff6600]' : 'text-[#888880] hover:text-[#ff6600]'
            }`}
          >
            {bracketLabel(label, active)}
          </Link>
        )
      })}
    </nav>
  )
}
