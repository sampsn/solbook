export type ThemePref = 'system' | 'dark' | 'light'
export type ResolvedTheme = 'dark' | 'light'

export function resolveTheme(
  pref: ThemePref,
  osScheme: 'dark' | 'light' | null,
): ResolvedTheme {
  if (pref === 'dark') return 'dark'
  if (pref === 'light') return 'light'
  if (osScheme === 'dark') return 'dark'
  return 'light'
}
