'use client'

import { useEffect, useRef } from 'react'
import { resolveTheme, type ThemePref } from '@/lib/resolveTheme'

interface Props {
  initialTheme: ThemePref
  children: React.ReactNode
}

const STORAGE_KEY = 'solbook-theme-hint'

function getOsScheme(): 'dark' | 'light' | null {
  if (typeof window === 'undefined') return null
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(pref: ThemePref, osScheme: 'dark' | 'light' | null) {
  const resolved = resolveTheme(pref, osScheme)
  document.documentElement.setAttribute('data-theme', resolved)
  try {
    localStorage.setItem(STORAGE_KEY, resolved)
  } catch (_) {}
}

export function ThemeProvider({ initialTheme, children }: Props) {
  const prefRef = useRef<ThemePref>(initialTheme)

  useEffect(() => {
    applyTheme(prefRef.current, getOsScheme())

    const mq = window.matchMedia('(prefers-color-scheme: dark)')

    function onOsChange(e: { matches: boolean }) {
      applyTheme(prefRef.current, e.matches ? 'dark' : 'light')
    }

    function onThemeChange(e: Event) {
      const { theme } = (e as CustomEvent<{ theme: ThemePref }>).detail
      prefRef.current = theme
      applyTheme(theme, getOsScheme())
    }

    mq.addEventListener('change', onOsChange)
    window.addEventListener('solbook:theme-change', onThemeChange)

    return () => {
      mq.removeEventListener('change', onOsChange)
      window.removeEventListener('solbook:theme-change', onThemeChange)
    }
  }, [])

  return <>{children}</>
}
