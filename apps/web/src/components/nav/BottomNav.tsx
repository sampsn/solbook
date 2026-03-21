import Link from 'next/link'

const NAV_ITEMS = [
  { href: '/home', label: 'Home', icon: '⌂' },
  { href: '/discover', label: 'Discover', icon: '◎' },
  { href: '/compose', label: 'Compose', icon: '+' },
  { href: '/notifications', label: 'Alerts', icon: '○' },
  { href: '/settings', label: 'Settings', icon: '⚙' },
] as const

export function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-zinc-800 bg-black flex">
      {NAV_ITEMS.map(({ href, label, icon }) => (
        <Link
          key={href}
          href={href}
          className="flex flex-col items-center justify-center flex-1 py-3 gap-1 hover:bg-zinc-900 transition-colors"
        >
          <span className="text-lg leading-none">{icon}</span>
          <span className="text-xs text-zinc-400">{label}</span>
        </Link>
      ))}
    </nav>
  )
}
