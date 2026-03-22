'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface PageHeaderProps {
  title: string
}

function BellIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="16"
      height="16"
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

export function PageHeader({ title }: PageHeaderProps) {
  const pathname = usePathname()
  const alertsActive = pathname.startsWith('/notifications')

  return (
    <div className="sticky top-0 bg-[#1c1c1c] border-b border-[#333333] px-4 py-3 flex items-center justify-between">
      <h1 className="text-sm font-bold text-[#ff6600]">{title}</h1>
      <Link
        href="/notifications"
        className={`md:hidden transition-colors ${alertsActive ? 'text-[#ff6600]' : 'text-[#888880] hover:text-[#ff6600]'}`}
        aria-label="alerts"
      >
        <BellIcon active={alertsActive} />
      </Link>
    </div>
  )
}
