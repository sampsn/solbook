import React from 'react'
import { renderHook, act } from '@testing-library/react-native'
import { ThemeContextProvider, useTheme } from './ThemeContext'
import { darkColors, lightColors } from './theme'

// Mock Supabase
jest.mock('./supabase', () => ({
  supabase: {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { theme: 'system' } }),
      update: jest.fn().mockReturnThis(),
    }),
  },
}))

// Mock useColorScheme without spreading the full react-native module
// (spreading triggers TurboModule getters that don't exist in Jest)
let mockColorScheme: 'dark' | 'light' | null = 'light'
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: () => mockColorScheme,
}))

function wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeContextProvider>{children}</ThemeContextProvider>
}

describe('useTheme', () => {
  beforeEach(() => {
    mockColorScheme = 'light'
    const { supabase } = require('./supabase')
    // reset to default 'system' pref
    supabase.from().single.mockResolvedValue({ data: { theme: 'system' } })
  })

  it('provides lightColors when pref is light', async () => {
    const { supabase } = require('./supabase')
    supabase.from().single.mockResolvedValueOnce({ data: { theme: 'light' } })
    const { result } = renderHook(() => useTheme(), { wrapper })
    await act(async () => {})
    expect(result.current.colors).toEqual(lightColors)
  })

  it('provides darkColors when pref is dark', async () => {
    const { supabase } = require('./supabase')
    supabase.from().single.mockResolvedValueOnce({ data: { theme: 'dark' } })
    const { result } = renderHook(() => useTheme(), { wrapper })
    await act(async () => {})
    expect(result.current.colors).toEqual(darkColors)
  })

  it('provides lightColors when pref is system and OS is light', async () => {
    mockColorScheme = 'light'
    const { result } = renderHook(() => useTheme(), { wrapper })
    await act(async () => {})
    expect(result.current.colors).toEqual(lightColors)
  })

  it('provides darkColors when pref is system and OS is dark', async () => {
    mockColorScheme = 'dark'
    const { supabase } = require('./supabase')
    supabase.from().single.mockResolvedValueOnce({ data: { theme: 'system' } })
    const { result } = renderHook(() => useTheme(), { wrapper })
    await act(async () => {})
    expect(result.current.colors).toEqual(darkColors)
  })

  it('updates colors when setTheme is called', async () => {
    mockColorScheme = 'light'
    const { result } = renderHook(() => useTheme(), { wrapper })
    await act(async () => {})
    expect(result.current.colors).toEqual(lightColors)
    act(() => result.current.setTheme('dark'))
    expect(result.current.colors).toEqual(darkColors)
  })
})
