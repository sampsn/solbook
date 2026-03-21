import Link from 'next/link'

const NAV_ITEMS = [
  { href: '/home', label: 'Home', icon: '⌂' },
  { href: '/discover', label: 'Discover', icon: '◎' },
  { href: '/compose', label: 'Compose', icon: '+' },
  { href: '/notifications', label: 'Notifications', icon: '○' },
  { href: '/settings', label: 'Settings', icon: '⚙' },
] as const

interface SidebarProps {
  username: string
}

export function Sidebar({ username }: SidebarProps) {
  return (
    <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 border-r border-zinc-800 px-4 py-6 shrink-0">
      <Link href="/home" className="text-xl font-bold mb-8 px-2">
        solbook
      </Link>

      <nav className="flex flex-col gap-1 flex-1">
        {NAV_ITEMS.map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-4 px-3 py-3 rounded-full hover:bg-zinc-900 transition-colors text-lg"
          >
            <span className="w-6 text-center">{icon}</span>
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      <Link
        href={`/${username}`}
        className="flex items-center gap-3 px-3 py-3 rounded-full hover:bg-zinc-900 transition-colors"
      >
        <div className="w-9 h-9 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-medium">
          {username[0].toUpperCase()}
        </div>
        <span className="text-sm text-zinc-400">@{username}</span>
      </Link>
    </aside>
  )
}
