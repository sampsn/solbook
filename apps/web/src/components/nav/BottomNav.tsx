import Link from 'next/link'

const NAV_ITEMS = [
  { href: '/home', label: 'home' },
  { href: '/discover', label: 'discover' },
  { href: '/compose', label: 'new' },
  { href: '/notifications', label: 'alerts' },
  { href: '/settings', label: 'settings' },
] as const

export function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-[#333333] bg-[#1c1c1c] flex">
      {NAV_ITEMS.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className="flex items-center justify-center flex-1 py-3 text-xs text-[#888880] hover:text-[#ff6600] transition-colors"
        >
          {label}
        </Link>
      ))}
    </nav>
  )
}
