'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

interface PageHeaderProps {
  title: string
  showBack?: boolean
}

function BellIcon() {
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

export function PageHeader({ title, showBack }: PageHeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const alertsActive = pathname.startsWith('/notifications')

  return (
    <div className="sticky top-0 bg-bg border-b border-border px-4 py-3 flex items-center justify-between">
      {showBack ? (
        <button
          onClick={() => router.back()}
          className="text-xs text-muted hover:text-accent transition-colors"
        >
          ← back
        </button>
      ) : (
        <h1 className="text-sm font-bold text-accent">{title}</h1>
      )}

      {showBack ? (
        <h1 className="text-sm font-bold text-accent">{title}</h1>
      ) : (
        !alertsActive && (
          <Link
            href="/notifications"
            className="md:hidden text-muted hover:text-accent transition-colors"
            aria-label="alerts"
          >
            <BellIcon />
          </Link>
        )
      )}

      {showBack && <div className="w-8" />}
    </div>
  )
}
