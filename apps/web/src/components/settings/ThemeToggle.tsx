'use client'

import { useState } from 'react'
import { updateTheme } from '@/actions/profiles'
import type { ThemePref } from '@/lib/resolveTheme'

const OPTIONS = [
  { label: 'auto', value: 'system' as const },
  { label: 'dark', value: 'dark' as const },
  { label: 'light', value: 'light' as const },
]

export function ThemeToggle({ initialTheme }: { initialTheme: ThemePref }) {
  const [active, setActive] = useState<ThemePref>(initialTheme)

  async function handleChange(theme: ThemePref) {
    setActive(theme)
    window.dispatchEvent(new CustomEvent('solbook:theme-change', { detail: { theme } }))
    try {
      await updateTheme(theme)
    } catch {
      try { await updateTheme(theme) } catch {}
    }
  }

  return (
    <div className="flex rounded-lg overflow-hidden border border-[var(--color-border)]">
      {OPTIONS.map(({ label, value }) => (
        <button
          key={value}
          aria-pressed={active === value}
          onClick={() => handleChange(value)}
          className={[
            'px-4 py-2 text-sm font-medium transition-colors',
            active === value
              ? 'bg-[var(--color-accent)] text-white'
              : 'bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-border)]',
          ].join(' ')}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
