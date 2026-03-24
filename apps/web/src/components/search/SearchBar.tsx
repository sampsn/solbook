'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface SearchBarProps {
  initialQuery: string
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
    <input
      type="search"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder="search people and posts"
      className="w-full border border-[var(--color-border)] rounded px-3 py-2 text-sm bg-[var(--color-bg)] text-[var(--color-text-strong)] placeholder-[var(--color-muted)] focus:outline-none focus:border-[var(--color-accent)]"
      autoFocus
    />
  )
}
