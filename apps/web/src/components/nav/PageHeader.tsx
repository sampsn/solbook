'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useHasUnseenAlerts } from './AlertsContext'

interface PageHeaderProps {
  title: string
  showBack?: boolean
}

function BellIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? '0' : '2'}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" strokeWidth="2" stroke="currentColor" fill="none" />
    </svg>
  )
}

export function PageHeader({ title, showBack }: PageHeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const alertsActive = pathname.startsWith('/notifications')
  const hasUnseenAlerts = useHasUnseenAlerts()

  const bellColor = alertsActive ? '#ff6600' : hasUnseenAlerts ? '#e8e6d9' : '#888880'

  return (
    <div className="sticky top-0 bg-[#1c1c1c] border-b border-[#333333] px-4 py-3 flex items-center justify-between">
      {showBack ? (
        <button
          onClick={() => router.back()}
          className="text-xs transition-colors"
          style={{ color: '#888880' }}
        >
          ← back
        </button>
      ) : (
        <h1 className="text-sm font-bold" style={{ color: '#ff6600' }}>{title}</h1>
      )}

      {showBack ? (
        <h1 className="text-sm font-bold" style={{ color: '#ff6600' }}>{title}</h1>
      ) : (
        !alertsActive && (
          <Link
            href="/notifications"
            className="md:hidden transition-colors"
            style={{ color: bellColor }}
            aria-label="alerts"
          >
            <BellIcon filled={hasUnseenAlerts} />
          </Link>
        )
      )}

      {showBack && <div className="w-8" />}
    </div>
  )
}
