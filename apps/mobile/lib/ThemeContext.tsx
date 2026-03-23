import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useColorScheme } from 'react-native'
import { supabase } from '@/lib/supabase'
import { darkColors, lightColors, type AppColors } from '@/lib/theme'

type ThemePref = 'system' | 'dark' | 'light'

interface ThemeContextValue {
  colors: AppColors
  theme: ThemePref
  setTheme: (theme: ThemePref) => void
}

function resolveColors(pref: ThemePref, osScheme: 'dark' | 'light' | null): AppColors {
  if (pref === 'dark') return darkColors
  if (pref === 'light') return lightColors
  if (osScheme === 'dark') return darkColors
  return lightColors
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: lightColors,
  theme: 'system',
  setTheme: () => {},
})

export function ThemeContextProvider({ children }: { children: React.ReactNode }) {
  const osScheme = useColorScheme() as 'dark' | 'light' | null
  const [pref, setPref] = useState<ThemePref>('system')
  const colors = resolveColors(pref, osScheme)
  const prefRef = useRef(pref)

  useEffect(() => {
    async function loadTheme() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase
          .from('profiles')
          .select('theme')
          .eq('id', user.id)
          .single()
        if (data?.theme) {
          prefRef.current = data.theme as ThemePref
          setPref(data.theme as ThemePref)
        }
      } catch {
        // fall back to current pref (system)
      }
    }
    loadTheme()
  }, [])

  function setTheme(theme: ThemePref) {
    prefRef.current = theme
    setPref(theme)
    saveTheme(theme)
  }

  async function saveTheme(theme: ThemePref) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('profiles').update({ theme }).eq('id', user.id)
    } catch {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        await supabase.from('profiles').update({ theme: prefRef.current }).eq('id', user.id)
      } catch {
        // silent failure
      }
    }
  }

  return (
    <ThemeContext.Provider value={{ colors, theme: pref, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext)
}
