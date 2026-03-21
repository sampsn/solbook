import Link from 'next/link'

const NAV_ITEMS = [
  { href: '/home', label: 'home' },
  { href: '/discover', label: 'discover' },
  { href: '/compose', label: 'compose' },
  { href: '/notifications', label: 'notifications' },
  { href: '/settings', label: 'settings' },
] as const

interface SidebarProps {
  username: string
}

export function Sidebar({ username }: SidebarProps) {
  return (
    <aside className="hidden md:flex flex-col w-44 h-screen sticky top-0 bg-[#242424] border-r border-[#333333] px-4 py-5 shrink-0">
      <Link href="/home" className="text-lg font-bold text-[#ff6600] mb-6 block hover:text-[#ff7722] transition-colors">
        solbook
      </Link>

      <nav className="flex flex-col flex-1 gap-0.5">
        {NAV_ITEMS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="py-1 text-sm text-[#e8e6d9] hover:text-[#ff6600] transition-colors"
          >
            {label}
          </Link>
        ))}
      </nav>

      <Link href={`/${username}`} className="text-xs text-[#888880] hover:text-[#ff6600] transition-colors">
        @{username}
      </Link>
    </aside>
  )
}
