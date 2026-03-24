'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface SearchBarProps {
  initialQuery: string
}

function ClearIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export function SearchBar({ initialQuery }: SearchBarProps) {
  const [value, setValue] = useState(initialQuery)
  const router = useRouter()

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    const trimmed = value.trim()
    if (!trimmed) return
    router.push(`/search?q=${encodeURIComponent(trimmed)}`)
  }

  return (
    <div className="relative flex items-center">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="search people and posts"
        className="w-full border border-[var(--color-border)] rounded px-3 py-2 text-base bg-[var(--color-bg)] text-[var(--color-text-strong)] placeholder-[var(--color-muted)] focus:outline-none focus:border-[var(--color-accent)]"
        autoFocus
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue('')}
          className="absolute right-2 transition-colors"
          style={{ color: 'var(--color-text-strong)' }}
          aria-label="clear search"
        >
          <ClearIcon />
        </button>
      )}
    </div>
  )
}
