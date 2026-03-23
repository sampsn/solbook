import { describe, it, expect } from 'vitest'
import { resolveTheme } from './resolveTheme'

describe('resolveTheme', () => {
  it('returns dark when pref is dark, regardless of OS', () => {
    expect(resolveTheme('dark', 'light')).toBe('dark')
    expect(resolveTheme('dark', null)).toBe('dark')
  })

  it('returns light when pref is light, regardless of OS', () => {
    expect(resolveTheme('light', 'dark')).toBe('light')
    expect(resolveTheme('light', null)).toBe('light')
  })

  it('returns dark when pref is system and OS is dark', () => {
    expect(resolveTheme('system', 'dark')).toBe('dark')
  })

  it('returns light when pref is system and OS is light', () => {
    expect(resolveTheme('system', 'light')).toBe('light')
  })

  it('returns light when pref is system and OS is unknown', () => {
    expect(resolveTheme('system', null)).toBe('light')
  })
})
