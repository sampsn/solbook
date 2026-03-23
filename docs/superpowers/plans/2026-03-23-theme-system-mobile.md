# Theme System — Mobile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Solarized dark/light theme with OS detection and a 3-way settings toggle to the Expo/React Native mobile app, synced via Supabase.

**Prerequisite:** The DB migration in `docs/superpowers/plans/2026-03-23-theme-system-web.md` Task 1 must be applied before this plan is executed.

**Architecture:** `lib/theme.ts` exports `darkColors` and `lightColors` objects. A `ThemeContext` wraps the entire app and provides the resolved `colors` object reactively. All screens and components switch from a static `import { colors }` to `const { colors } = useTheme()`, with `StyleSheet.create` moved inside the component using `useMemo`. A `ThemeToggle` segmented control is rendered in the settings screen.

**Tech Stack:** Expo 55, React Native 0.83, React 19, Expo Router, Jest + jest-expo + React Native Testing Library, Supabase JS client, TypeScript

**Run all mobile tests with:** `cd apps/mobile && bun run test`

---

## File Map

| Action | Path | Purpose |
|---|---|---|
| Modify | `apps/mobile/package.json` | Add jest, jest-expo, and RNTL dev dependencies |
| Create | `apps/mobile/jest.config.js` | Jest config with jest-expo preset |
| Create | `apps/mobile/jest.setup.ts` | Test setup file |
| Modify | `apps/mobile/lib/theme.ts` | Refactor to `darkColors`, `lightColors`, `sharedColors` |
| Create | `apps/mobile/lib/ThemeContext.tsx` | Context providing `{ colors, theme, setTheme }` |
| Create | `apps/mobile/lib/ThemeContext.test.tsx` | Tests: correct colors for each pref × OS combo |
| Create | `apps/mobile/components/ThemeToggle.tsx` | Segmented `auto / dark / light` control |
| Modify | `apps/mobile/app/_layout.tsx` | Wrap with `ThemeContextProvider`, update spinner colors |
| Modify | `apps/mobile/app/settings.tsx` | Add appearance section with `ThemeToggle`, migrate styles |
| Modify | `apps/mobile/app/(tabs)/_layout.tsx` | Switch to `useTheme()` |
| Modify | `apps/mobile/app/(tabs)/home.tsx` | Switch to `useTheme()` |
| Modify | `apps/mobile/app/(tabs)/discover.tsx` | Switch to `useTheme()` |
| Modify | `apps/mobile/app/(tabs)/profile.tsx` | Switch to `useTheme()` |
| Modify | `apps/mobile/app/index.tsx` | Switch to `useTheme()` |
| Modify | `apps/mobile/app/notifications.tsx` | Switch to `useTheme()` |
| Modify | `apps/mobile/app/post/[id].tsx` | Switch to `useTheme()` |
| Modify | `apps/mobile/app/profile/[username].tsx` | Switch to `useTheme()` |
| Modify | `apps/mobile/app/(auth)/_layout.tsx` | Switch to `useTheme()` |
| Modify | `apps/mobile/app/(auth)/login.tsx` | Switch to `useTheme()` |
| Modify | `apps/mobile/app/(auth)/signup.tsx` | Switch to `useTheme()` |
| Modify | `apps/mobile/components/PostCard.tsx` | Switch to `useTheme()` |
| Modify | `apps/mobile/components/ScreenHeader.tsx` | Switch to `useTheme()` |
| Modify | `apps/mobile/components/PostComposer.tsx` | Switch to `useTheme()` |

---

## The `useTheme` Migration Pattern

Every file that currently does:
```ts
import { colors, font } from '@/lib/theme'
// ...
const styles = StyleSheet.create({
  container: { backgroundColor: colors.bg },
})
```

Must be changed to:
```ts
import { useMemo } from 'react'
import { useTheme } from '@/lib/ThemeContext'
import { font } from '@/lib/theme'
// ...
export default function MyScreen() {
  const { colors } = useTheme()
  const styles = useMemo(() => StyleSheet.create({
    container: { backgroundColor: colors.bg },
  }), [colors])
  // ...
}
```

Key rules:
- `StyleSheet.create` MUST move inside the component body, wrapped in `useMemo([colors])`
- `font` is still imported statically from `@/lib/theme` — it never changes
- Any direct reference to `colors.xxx` outside `StyleSheet.create` (e.g. in inline styles or as a prop) can stay as-is since `colors` is now reactive

---

## Task 1: Set Up Jest for Mobile

**Files:**
- Modify: `apps/mobile/package.json`
- Create: `apps/mobile/jest.config.js`
- Create: `apps/mobile/jest.setup.ts`

- [ ] **Step 1: Install test dependencies**

```bash
cd apps/mobile && bun add -D jest jest-expo @testing-library/react-native @testing-library/jest-native
```

- [ ] **Step 2: Add test script to `package.json`**

Add to the `"scripts"` section of `apps/mobile/package.json`:
```json
"test": "jest"
```

- [ ] **Step 3: Create `jest.config.js`**

```js
// apps/mobile/jest.config.js
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['./jest.setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@react-native-community/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
}
```

- [ ] **Step 4: Create `jest.setup.ts`**

```ts
// apps/mobile/jest.setup.ts
import '@testing-library/jest-native/extend-expect'
```

- [ ] **Step 5: Verify Jest runs (no tests yet)**

```bash
cd apps/mobile && bun run test
```

Expected: Jest runs with "no tests found" or exits cleanly. No errors about config or missing modules.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/package.json apps/mobile/jest.config.js apps/mobile/jest.setup.ts bun.lock
git commit -m "chore(mobile): set up jest-expo test infrastructure"
```

---

## Task 2: Refactor `lib/theme.ts`

**Files:**
- Modify: `apps/mobile/lib/theme.ts`

Replace the entire file. The `font` export stays identical — only `colors` changes to `darkColors` + `lightColors`.

- [ ] **Step 1: Replace `lib/theme.ts`**

```ts
// apps/mobile/lib/theme.ts

const sharedColors = {
  accent: '#cb4b16',
  accentHover: '#d45d1e',
  accentAlt: '#b58900',
  brand: '#ff7700',
  danger: '#dc322f',
}

export const darkColors = {
  ...sharedColors,
  bg: '#052327',
  surface: '#0b2b2e',
  border: '#586e75',
  text: '#839496',
  muted: '#657b83',
}

export const lightColors = {
  ...sharedColors,
  bg: '#fdf3d8',
  surface: '#ede8d0',
  border: '#93a1a1',
  text: '#657b83',
  muted: '#839496',
}

// Convenience type for resolved colors object
export type AppColors = typeof darkColors

export const font = {
  regular: 'CourierPrime_400Regular',
  bold: 'CourierPrime_700Bold',
  italicRegular: 'CourierPrime_400Regular_Italic',
  italicBold: 'CourierPrime_700Bold_Italic',
}
```

Note: Do NOT export a static `colors` — this will cause TypeScript errors in the files that still import it, which is intentional and will guide the migration in later tasks.

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/lib/theme.ts
git commit -m "feat(mobile): refactor theme.ts to darkColors/lightColors"
```

---

## Task 3: `ThemeContext`

**Files:**
- Create: `apps/mobile/lib/ThemeContext.tsx`
- Create: `apps/mobile/lib/ThemeContext.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// apps/mobile/lib/ThemeContext.test.tsx
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

// Mock useColorScheme
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  useColorScheme: jest.fn().mockReturnValue('light'),
}))

import { useColorScheme } from 'react-native'

function wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeContextProvider>{children}</ThemeContextProvider>
}

describe('useTheme', () => {
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
    jest.mocked(useColorScheme).mockReturnValue('light')
    const { result } = renderHook(() => useTheme(), { wrapper })
    await act(async () => {})
    expect(result.current.colors).toEqual(lightColors)
  })

  it('provides darkColors when pref is system and OS is dark', async () => {
    jest.mocked(useColorScheme).mockReturnValue('dark')
    const { supabase } = require('./supabase')
    supabase.from().single.mockResolvedValueOnce({ data: { theme: 'system' } })
    const { result } = renderHook(() => useTheme(), { wrapper })
    await act(async () => {})
    expect(result.current.colors).toEqual(darkColors)
  })

  it('updates colors when setTheme is called', async () => {
    jest.mocked(useColorScheme).mockReturnValue('light')
    const { result } = renderHook(() => useTheme(), { wrapper })
    await act(async () => {})
    expect(result.current.colors).toEqual(lightColors)
    act(() => result.current.setTheme('dark'))
    expect(result.current.colors).toEqual(darkColors)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd apps/mobile && bun run test lib/ThemeContext.test.tsx
```

Expected: FAIL — `ThemeContext` not found.

- [ ] **Step 3: Implement `ThemeContext`**

```tsx
// apps/mobile/lib/ThemeContext.tsx
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
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd apps/mobile && bun run test lib/ThemeContext.test.tsx
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/lib/ThemeContext.tsx apps/mobile/lib/ThemeContext.test.tsx
git commit -m "feat(mobile): add ThemeContext with tests"
```

---

## Task 4: Update Root Layout

**Files:**
- Modify: `apps/mobile/app/_layout.tsx`

- [ ] **Step 1: Update imports**

Replace:
```ts
import { colors } from '@/lib/theme'
```

With:
```ts
import { lightColors } from '@/lib/theme'
import { ThemeContextProvider } from '@/lib/ThemeContext'
```

- [ ] **Step 2: Update the pre-font loading spinner**

Find:
```tsx
return (
  <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
    <ActivityIndicator color={colors.accent} />
  </View>
)
```

Change to:
```tsx
return (
  <View style={{ flex: 1, backgroundColor: lightColors.bg, justifyContent: 'center', alignItems: 'center' }}>
    <ActivityIndicator color={lightColors.accent} />
  </View>
)
```

- [ ] **Step 3: Wrap return with `ThemeContextProvider`**

Find:
```tsx
return (
  <AlertsContextProvider>
    <StatusBar style="light" backgroundColor={colors.bg} />
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
```

Change to:
```tsx
return (
  <ThemeContextProvider>
    <AlertsContextProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
```

Note: `StatusBar style="auto"` lets the OS manage the status bar style to match the theme. Remove `backgroundColor` from `StatusBar` and `contentStyle` from `Stack` — screens now set their own background via `colors.bg` from context.

Close the new wrapper at the end:
```tsx
      </Stack>
    </AlertsContextProvider>
  </ThemeContextProvider>
)
```

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/_layout.tsx
git commit -m "feat(mobile): add ThemeContextProvider to root layout"
```

---

## Task 5: `ThemeToggle` Mobile Component

**Files:**
- Create: `apps/mobile/components/ThemeToggle.tsx`

- [ ] **Step 1: Create `ThemeToggle`**

```tsx
// apps/mobile/components/ThemeToggle.tsx
import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useTheme } from '@/lib/ThemeContext'
import { font } from '@/lib/theme'

type ThemePref = 'system' | 'dark' | 'light'

const OPTIONS: { label: string; value: ThemePref }[] = [
  { label: 'auto', value: 'system' },
  { label: 'dark', value: 'dark' },
  { label: 'light', value: 'light' },
]

export function ThemeToggle() {
  const { colors, theme, setTheme } = useTheme()

  return (
    <View style={styles.row}>
      {OPTIONS.map(({ label, value }, index) => {
        const active = theme === value
        return (
          <Pressable
            key={value}
            onPress={() => setTheme(value)}
            style={[
              styles.btn,
              { borderColor: colors.border, backgroundColor: active ? colors.accent : colors.bg },
              index === 0 && styles.btnFirst,
              index === OPTIONS.length - 1 && styles.btnLast,
            ]}
            accessibilityState={{ selected: active }}
          >
            <Text style={[
              styles.label,
              { color: active ? colors.bg : colors.muted, fontFamily: active ? font.bold : font.regular },
            ]}>
              {label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  btn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderRightWidth: 0,
  },
  btnFirst: {},
  btnLast: { borderRightWidth: 1 },
  label: { fontSize: 14 },
})
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/components/ThemeToggle.tsx
git commit -m "feat(mobile): add ThemeToggle component"
```

---

## Task 6: Update Settings Screen

**Files:**
- Modify: `apps/mobile/app/settings.tsx`

- [ ] **Step 1: Update imports**

Replace:
```ts
import { colors, font } from '@/lib/theme'
```

With:
```ts
import { useMemo } from 'react'
import { useTheme } from '@/lib/ThemeContext'
import { font } from '@/lib/theme'
import { ThemeToggle } from '@/components/ThemeToggle'
```

- [ ] **Step 2: Add `useTheme()` call at top of component**

Inside `SettingsScreen`, add at the top:
```ts
const { colors } = useTheme()
```

- [ ] **Step 3: Move `StyleSheet.create` inside component using `useMemo`**

Remove the module-level `const styles = StyleSheet.create({...})` block at the bottom of the file.

Add inside `SettingsScreen` after the `useTheme()` call:
```ts
const styles = useMemo(() => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { paddingBottom: 32 },
  section: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 16, paddingVertical: 16, gap: 8 },
  sectionTitle: { fontFamily: font.regular, fontSize: 13, color: colors.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  label: { fontFamily: font.regular, fontSize: 14, color: colors.muted },
  input: {
    fontFamily: font.regular, fontSize: 16, color: colors.text,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  textArea: { minHeight: 64 },
  saveButton: { backgroundColor: colors.accent, paddingVertical: 10, paddingHorizontal: 16, alignSelf: 'flex-start', marginTop: 4 },
  disabled: { opacity: 0.4 },
  saveButtonText: { fontFamily: font.bold, fontSize: 14, color: colors.bg },
  username: { fontFamily: font.regular, fontSize: 15, color: colors.muted },
  signOutButton: { borderWidth: 1, borderColor: colors.border, paddingVertical: 8, paddingHorizontal: 16, alignSelf: 'flex-start' },
  signOutText: { fontFamily: font.regular, fontSize: 15, color: colors.muted },
}), [colors])
```

- [ ] **Step 4: Add appearance section to JSX**

Inside the `<ScrollView>`, add a new section before the existing profile section:

```tsx
<View style={styles.section}>
  <Text style={styles.sectionTitle}>appearance</Text>
  <ThemeToggle />
  <Text style={[styles.label, { marginTop: 4 }]}>auto follows your device setting</Text>
</View>
```

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/settings.tsx
git commit -m "feat(mobile): add theme toggle to settings screen"
```

---

## Task 7: Migrate Auth Screens

Apply the `useTheme` migration pattern to all auth screens. For each file listed below, do:

1. Replace `import { colors, font } from '@/lib/theme'` with `import { useMemo } from 'react'` + `import { useTheme } from '@/lib/ThemeContext'` + `import { font } from '@/lib/theme'`
2. Add `const { colors } = useTheme()` at top of component
3. Move `StyleSheet.create` inside component wrapped in `useMemo(() => ..., [colors])`

**Files:**
- `apps/mobile/app/(auth)/_layout.tsx`
- `apps/mobile/app/(auth)/login.tsx`
- `apps/mobile/app/(auth)/signup.tsx`

- [ ] **Step 1: Migrate `(auth)/_layout.tsx`**

Read the file, apply the migration pattern, save.

- [ ] **Step 2: Migrate `(auth)/login.tsx`**

Read the file, apply the migration pattern, save.

- [ ] **Step 3: Migrate `(auth)/signup.tsx`**

Read the file, apply the migration pattern, save.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/\(auth\)/
git commit -m "feat(mobile): migrate auth screens to useTheme"
```

---

## Task 8: Migrate Tab Screens and Layout

Apply the migration pattern to all tab screens.

**Files:**
- `apps/mobile/app/(tabs)/_layout.tsx`
- `apps/mobile/app/(tabs)/home.tsx`
- `apps/mobile/app/(tabs)/discover.tsx`
- `apps/mobile/app/(tabs)/profile.tsx`

- [ ] **Step 1: Migrate `(tabs)/_layout.tsx`**

Read the file, apply the migration pattern, save.

Note: this file has inline styles (not `StyleSheet.create`). For inline styles, just change `colors.xxx` references — `useTheme` already makes `colors` reactive, so no `useMemo` is needed for inline style objects here.

- [ ] **Step 2: Migrate `(tabs)/home.tsx`**

Read the file, apply the migration pattern, save.

- [ ] **Step 3: Migrate `(tabs)/discover.tsx`**

Read the file, apply the migration pattern, save.

- [ ] **Step 4: Migrate `(tabs)/profile.tsx`**

Read the file, apply the migration pattern, save.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/\(tabs\)/
git commit -m "feat(mobile): migrate tab screens to useTheme"
```

---

## Task 9: Migrate Remaining Screens

**Files:**
- `apps/mobile/app/index.tsx`
- `apps/mobile/app/notifications.tsx`
- `apps/mobile/app/post/[id].tsx`
- `apps/mobile/app/profile/[username].tsx`

- [ ] **Step 1: Migrate `index.tsx`**

Read the file, apply the migration pattern, save.

- [ ] **Step 2: Migrate `notifications.tsx`**

Read the file, apply the migration pattern, save.

- [ ] **Step 3: Migrate `post/[id].tsx`**

Read the file, apply the migration pattern, save.

- [ ] **Step 4: Migrate `profile/[username].tsx`**

Read the file, apply the migration pattern, save.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/index.tsx apps/mobile/app/notifications.tsx apps/mobile/app/post apps/mobile/app/profile
git commit -m "feat(mobile): migrate remaining screens to useTheme"
```

---

## Task 10: Migrate Shared Components

**Files:**
- `apps/mobile/components/PostCard.tsx`
- `apps/mobile/components/ScreenHeader.tsx`
- `apps/mobile/components/PostComposer.tsx`

- [ ] **Step 1: Migrate `PostCard.tsx`**

Read the file, apply the migration pattern, save.

- [ ] **Step 2: Migrate `ScreenHeader.tsx`**

Read the file, apply the migration pattern, save.

- [ ] **Step 3: Migrate `PostComposer.tsx`**

Read the file, apply the migration pattern, save.

- [ ] **Step 4: Run tests**

```bash
cd apps/mobile && bun run test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/components/
git commit -m "feat(mobile): migrate shared components to useTheme"
```

---

## Final Check

- [ ] **Build the app to catch any TypeScript errors**

```bash
cd apps/mobile && bunx expo export --platform ios 2>&1 | grep -i error
```

Expected: no errors. (Warnings about deprecated APIs are fine.)

- [ ] **Smoke test on device / simulator**

1. Run `bun run ios` or `bun run android`
2. Open the app — verify background matches OS dark/light preference
3. Navigate to Settings → verify appearance section appears with `auto / dark / light` buttons
4. Tap "dark" → entire app switches to dark theme immediately
5. Tap "light" → entire app switches to light theme
6. Tap "auto" → app follows OS preference
7. Kill and reopen app → theme preference is remembered (loaded from Supabase)
