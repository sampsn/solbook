import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { ThemeProvider } from './ThemeProvider'

// Bun provides its own localStorage stub that lacks standard methods.
// Replace it with a simple in-memory implementation.
const makeLocalStorageMock = () => {
  const store: Record<string, string> = {}
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v },
    removeItem: (k: string) => { delete store[k] },
    clear: () => { Object.keys(store).forEach(k => delete store[k]) },
  }
}

function mockMatchMedia(prefersDark: boolean) {
  const listeners: Array<(e: { matches: boolean }) => void> = []
  const mq = {
    matches: prefersDark,
    addEventListener: (_: string, fn: (e: { matches: boolean }) => void) => listeners.push(fn),
    removeEventListener: vi.fn(),
  }
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockReturnValue(mq),
  })
  return { mq, triggerChange: (dark: boolean) => listeners.forEach(fn => fn({ matches: dark })) }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', makeLocalStorageMock())
  document.documentElement.removeAttribute('data-theme')
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ThemeProvider', () => {
  it('applies dark when initialTheme is dark', () => {
    mockMatchMedia(false)
    render(<ThemeProvider initialTheme="dark"><div /></ThemeProvider>)
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('applies light when initialTheme is light', () => {
    mockMatchMedia(true)
    render(<ThemeProvider initialTheme="light"><div /></ThemeProvider>)
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('follows OS dark when initialTheme is system', () => {
    mockMatchMedia(true)
    render(<ThemeProvider initialTheme="system"><div /></ThemeProvider>)
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('defaults to light when initialTheme is system and OS is light', () => {
    mockMatchMedia(false)
    render(<ThemeProvider initialTheme="system"><div /></ThemeProvider>)
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('writes resolved value (not system) to localStorage', () => {
    mockMatchMedia(false)
    render(<ThemeProvider initialTheme="system"><div /></ThemeProvider>)
    expect(localStorage.getItem('solbook-theme-hint')).toBe('light')
  })

  it('updates data-theme when OS scheme changes', () => {
    const { triggerChange } = mockMatchMedia(false)
    render(<ThemeProvider initialTheme="system"><div /></ThemeProvider>)
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    act(() => triggerChange(true))
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('updates data-theme on solbook:theme-change event', () => {
    mockMatchMedia(false)
    render(<ThemeProvider initialTheme="light"><div /></ThemeProvider>)
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    act(() => {
      window.dispatchEvent(
        new CustomEvent('solbook:theme-change', { detail: { theme: 'dark' } }),
      )
    })
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })
})
