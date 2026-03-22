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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-bg flex">
      {navItems(username).map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center justify-center flex-1 py-3 text-xs transition-colors ${
              active ? 'text-accent' : 'text-muted hover:text-accent'
            }`}
          >
            {bracketLabel(label, active)}
          </Link>
        )
      })}
    </nav>
  )
}
