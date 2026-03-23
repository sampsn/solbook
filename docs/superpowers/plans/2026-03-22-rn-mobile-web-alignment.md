# RN Mobile Web Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the React Native app's navigation and screen layout to match the mobile-responsive web app — 3-tab bottom nav, shared ScreenHeader component, notifications/settings as stack screens.

**Architecture:** Build shared infrastructure first (ScreenHeader, AlertsContext), then update routing, then migrate each screen. No new npm dependencies needed — bell icon uses a Unicode character since `react-native-svg` is not in the project.

**Tech Stack:** React Native 0.83, Expo Router 55, Supabase JS, TypeScript, `react-native-safe-area-context`

---

## File Map

| Status | File | Change |
|---|---|---|
| NEW | `apps/mobile/components/ScreenHeader.tsx` | Shared sticky header (title + back + bell) |
| NEW | `apps/mobile/components/AlertsContext.tsx` | Unseen-alerts context + hook |
| NEW | `apps/mobile/app/notifications.tsx` | Alerts stack screen |
| NEW | `apps/mobile/app/settings.tsx` | Settings stack screen |
| NEW | `apps/mobile/app/(tabs)/profile.tsx` | Own-profile tab screen |
| MODIFY | `apps/mobile/app/_layout.tsx` | Add AlertsContextProvider + new stack routes |
| MODIFY | `apps/mobile/app/(tabs)/_layout.tsx` | 3 tabs, bracket labels, dynamic @username |
| MODIFY | `apps/mobile/app/(tabs)/home/index.tsx` | Replace ad-hoc header with ScreenHeader |
| MODIFY | `apps/mobile/app/(tabs)/discover.tsx` | Replace ad-hoc header with ScreenHeader |
| MODIFY | `apps/mobile/app/profile/[username].tsx` | Replace navBar with ScreenHeader |
| MODIFY | `apps/mobile/app/post/[id].tsx` | Replace navBar with ScreenHeader |
| DELETE | `apps/mobile/app/(tabs)/compose.tsx` | Compose is inline on home |
| DELETE | `apps/mobile/app/(tabs)/notifications.tsx` | Moved to root stack |
| DELETE | `apps/mobile/app/(tabs)/settings.tsx` | Moved to root stack |

---

## Task 1: Create `components/ScreenHeader.tsx`

**Files:**
- Create: `apps/mobile/components/ScreenHeader.tsx`

The bell icon uses `🔔` (Unicode) since `react-native-svg` is not in the project. Color indicates state: `colors.accent` when unseen alerts exist, `colors.muted` otherwise. The header `View` renders above the `ScrollView`/`FlatList` caller — not inside it.

- [ ] **Step 1: Create the file**

```tsx
// apps/mobile/components/ScreenHeader.tsx
import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { colors, font } from '@/lib/theme'
import { useHasUnseenAlerts } from '@/components/AlertsContext'

interface ScreenHeaderProps {
  title: string
  showBack?: boolean
  showBell?: boolean
}

export function ScreenHeader({ title, showBack, showBell }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets()
  const hasUnseenAlerts = useHasUnseenAlerts()
  const bellColor = hasUnseenAlerts ? colors.accent : colors.muted

  return (
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      {showBack ? (
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.back}>← back</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.placeholder} />
      )}

      <Text style={styles.title}>{title}</Text>

      {showBell ? (
        <TouchableOpacity onPress={() => router.push('/notifications')} style={styles.bellBtn}>
          <Text style={[styles.bell, { color: bellColor }]}>🔔</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.placeholder} />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.bg,
  },
  backBtn: { minWidth: 48 },
  back: { fontFamily: font.regular, fontSize: 13, color: colors.muted },
  title: { fontFamily: font.bold, fontSize: 14, color: colors.accent },
  bellBtn: { minWidth: 48, alignItems: 'flex-end' },
  bell: { fontSize: 14 },
  placeholder: { minWidth: 48 },
})
```

- [ ] **Step 2: Verify TypeScript — no errors expected yet (AlertsContext doesn't exist)**

```bash
cd apps/mobile && bun run tsc --noEmit 2>&1 | head -20
```

Expected: errors about missing `AlertsContext` module — that's fine, we create it next.

---

## Task 2: Create `components/AlertsContext.tsx`

**Files:**
- Create: `apps/mobile/components/AlertsContext.tsx`

The context fetches `profiles.alerts_last_seen_at` for the current user, then calls `getNotifications()` and checks if any notification's `createdAt` is newer. Re-checks on `AppState` change to `"active"`. Exposes `useHasUnseenAlerts()` and `refreshAlerts()`.

- [ ] **Step 1: Create the file**

```tsx
// apps/mobile/components/AlertsContext.tsx
import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { AppState, AppStateStatus } from 'react-native'
import { supabase } from '@/lib/supabase'
import { getNotifications } from '@/lib/api'

interface AlertsContextValue {
  hasUnseenAlerts: boolean
  refreshAlerts: () => void
}

const AlertsContext = createContext<AlertsContextValue>({
  hasUnseenAlerts: false,
  refreshAlerts: () => {},
})

export function useHasUnseenAlerts() {
  return useContext(AlertsContext).hasUnseenAlerts
}

export function useRefreshAlerts() {
  return useContext(AlertsContext).refreshAlerts
}

export function AlertsContextProvider({ children }: { children: React.ReactNode }) {
  const [hasUnseenAlerts, setHasUnseenAlerts] = useState(false)

  async function check() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('alerts_last_seen_at')
      .eq('id', user.id)
      .single()

    const lastSeen = profile?.alerts_last_seen_at ?? null
    const notifications = await getNotifications()

    if (notifications.length === 0) {
      setHasUnseenAlerts(false)
      return
    }

    if (!lastSeen) {
      setHasUnseenAlerts(true)
      return
    }

    const hasNew = notifications.some((n) => n.createdAt > lastSeen)
    setHasUnseenAlerts(hasNew)
  }

  const appState = useRef(AppState.currentState)

  useEffect(() => {
    check()

    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        check()
      }
      appState.current = nextState
    })

    return () => subscription.remove()
  }, [])

  return (
    <AlertsContext.Provider value={{ hasUnseenAlerts, refreshAlerts: check }}>
      {children}
    </AlertsContext.Provider>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd apps/mobile && bun run tsc --noEmit 2>&1 | head -20
```

Expected: no errors (or only pre-existing unrelated errors).

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/components/ScreenHeader.tsx apps/mobile/components/AlertsContext.tsx
git commit -m "feat(mobile): add ScreenHeader and AlertsContext components"
```

---

## Task 3: Update `app/_layout.tsx` — add provider + new stack routes

**Files:**
- Modify: `apps/mobile/app/_layout.tsx`

Add `AlertsContextProvider` wrapping the Stack. Register `notifications` and `settings` as stack screens (additive — keep all existing registrations).

- [ ] **Step 1: Update the file**

```tsx
// apps/mobile/app/_layout.tsx
import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { View, ActivityIndicator } from 'react-native'
import {
  useFonts,
  CourierPrime_400Regular,
  CourierPrime_700Bold,
  CourierPrime_400Regular_Italic,
  CourierPrime_700Bold_Italic,
} from '@expo-google-fonts/courier-prime'
import * as SplashScreen from 'expo-splash-screen'
import { colors } from '@/lib/theme'
import { AlertsContextProvider } from '@/components/AlertsContext'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    CourierPrime_400Regular,
    CourierPrime_700Bold,
    CourierPrime_400Regular_Italic,
    CourierPrime_700Bold_Italic,
  })

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync()
  }, [fontsLoaded])

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    )
  }

  return (
    <AlertsContextProvider>
      <StatusBar style="light" backgroundColor={colors.bg} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="profile/[username]" options={{ presentation: 'card' }} />
        <Stack.Screen name="post/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="notifications" options={{ presentation: 'card' }} />
        <Stack.Screen name="settings" options={{ presentation: 'card' }} />
      </Stack>
    </AlertsContextProvider>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd apps/mobile && bun run tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/_layout.tsx
git commit -m "feat(mobile): wrap root layout with AlertsContextProvider, register new stack routes"
```

---

## Task 4: Update `app/(tabs)/_layout.tsx` — 3 tabs, bracket labels, @username

**Files:**
- Modify: `apps/mobile/app/(tabs)/_layout.tsx`

Replace 5-tab layout with 3-tab layout. Fetch `@username` from auth on mount for the profile tab label. Bracket notation for active labels.

- [ ] **Step 1: Update the file**

```tsx
// apps/mobile/app/(tabs)/_layout.tsx
import { useEffect, useState } from 'react'
import { Tabs } from 'expo-router'
import { Text } from 'react-native'
import { supabase } from '@/lib/supabase'
import { colors, font } from '@/lib/theme'

function bracketLabel(label: string, focused: boolean) {
  return focused ? `[${label}]` : label
}

function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text style={{
      fontFamily: font.regular,
      fontSize: 10,
      color: focused ? colors.accent : colors.muted,
      fontWeight: focused ? 'bold' : 'normal',
    }}>
      {bracketLabel(label, focused)}
    </Text>
  )
}

export default function TabsLayout() {
  const [username, setUsername] = useState('@me')

  useEffect(() => {
    async function loadUsername() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single()
      if (profile?.username) setUsername(`@${profile.username}`)
    }
    loadUsername()
  }, [])

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 56,
          paddingBottom: 8,
        },
        tabBarShowIcon: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{ tabBarLabel: ({ focused }) => <TabLabel label="home" focused={focused} /> }}
      />
      <Tabs.Screen
        name="discover"
        options={{ tabBarLabel: ({ focused }) => <TabLabel label="discover" focused={focused} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ tabBarLabel: ({ focused }) => <TabLabel label={username} focused={focused} /> }}
      />
    </Tabs>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd apps/mobile && bun run tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/(tabs)/_layout.tsx
git commit -m "feat(mobile): restructure tab layout to 3 tabs with bracket labels"
```

---

## Task 5: Update `app/(tabs)/home/index.tsx` — replace ad-hoc header

**Files:**
- Modify: `apps/mobile/app/(tabs)/home/index.tsx`

Replace the inline header `View` + `useSafeAreaInsets` boilerplate with `<ScreenHeader title="home" showBell />`.

- [ ] **Step 1: Update the file**

Replace only the import block and the header section. The feed logic is unchanged.

```tsx
// apps/mobile/app/(tabs)/home/index.tsx
import React, { useCallback, useState } from 'react'
import { View, Text, FlatList, RefreshControl, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { colors, font } from '@/lib/theme'
import { PostCard } from '@/components/PostCard'
import { PostComposer } from '@/components/PostComposer'
import { ScreenHeader } from '@/components/ScreenHeader'
import { getHomeFeed, FeedPost } from '@/lib/api'

export default function HomeScreen() {
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [isFollowFeed, setIsFollowFeed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  async function load(replace = true) {
    const result = await getHomeFeed() as any
    if (replace) {
      setPosts(result.posts)
    }
    setNextCursor(result.nextCursor)
    setIsFollowFeed(result.isFollowFeed ?? false)
    setLoading(false)
    setRefreshing(false)
  }

  async function loadMore() {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    const result = await getHomeFeed(nextCursor) as any
    setPosts((prev) => [...prev, ...result.posts])
    setNextCursor(result.nextCursor)
    setLoadingMore(false)
  }

  useFocusEffect(useCallback(() => { load() }, []))

  function onRefresh() {
    setRefreshing(true)
    load()
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="home" showBell />
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PostCard {...item} onLikeToggled={load} />}
        ListHeaderComponent={
          <>
            <PostComposer onPosted={load} />
            {!isFollowFeed && (
              <View style={styles.hint}>
                <Text style={styles.hintText}>follow people to see their posts · showing all posts for now</Text>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            {isFollowFeed ? 'no posts from people you follow yet.' : 'no posts yet. be the first!'}
          </Text>
        }
        ListFooterComponent={
          nextCursor ? (
            <TouchableOpacity style={styles.loadMore} onPress={loadMore} disabled={loadingMore}>
              <Text style={styles.loadMoreText}>{loadingMore ? 'loading…' : 'load more →'}</Text>
            </TouchableOpacity>
          ) : null
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  hint: { paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  hintText: { fontFamily: font.regular, fontSize: 11, color: colors.muted },
  empty: { fontFamily: font.regular, fontSize: 14, color: colors.muted, textAlign: 'center', paddingVertical: 48 },
  loadMore: { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border },
  loadMoreText: { fontFamily: font.regular, fontSize: 14, color: colors.muted },
})
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/(tabs)/home/index.tsx
git commit -m "feat(mobile): replace home header with ScreenHeader"
```

---

## Task 6: Update `app/(tabs)/discover.tsx` — replace ad-hoc header

**Files:**
- Modify: `apps/mobile/app/(tabs)/discover.tsx`

- [ ] **Step 1: Update the file**

```tsx
// apps/mobile/app/(tabs)/discover.tsx
import React, { useCallback, useState } from 'react'
import { View, Text, FlatList, RefreshControl, StyleSheet, ActivityIndicator } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { colors, font } from '@/lib/theme'
import { PostCard } from '@/components/PostCard'
import { ScreenHeader } from '@/components/ScreenHeader'
import { getDiscoverFeed, FeedPost } from '@/lib/api'

export default function DiscoverScreen() {
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    const data = await getDiscoverFeed()
    setPosts(data)
    setLoading(false)
    setRefreshing(false)
  }

  useFocusEffect(useCallback(() => { load() }, []))

  function onRefresh() { setRefreshing(true); load() }

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator color={colors.accent} /></View>
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="discover" showBell />
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PostCard {...item} onLikeToggled={load} />}
        ListEmptyComponent={<Text style={styles.empty}>no trending posts yet.</Text>}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  empty: { fontFamily: font.regular, fontSize: 14, color: colors.muted, textAlign: 'center', paddingVertical: 48 },
})
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/(tabs)/discover.tsx
git commit -m "feat(mobile): replace discover header with ScreenHeader"
```

---

## Task 7: Create `app/notifications.tsx` — alerts stack screen

**Files:**
- Create: `apps/mobile/app/notifications.tsx`

Content is the same as the old `app/(tabs)/notifications.tsx` with three changes: `ScreenHeader` replaces the header View, the header renders outside the loading guard, and on mount we mark alerts seen then call `refreshAlerts()`.

- [ ] **Step 1: Create the file**

```tsx
// apps/mobile/app/notifications.tsx
import React, { useCallback, useEffect, useState } from 'react'
import { View, Text, FlatList, RefreshControl, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { colors, font } from '@/lib/theme'
import { getNotifications, Notification } from '@/lib/api'
import { ScreenHeader } from '@/components/ScreenHeader'
import { useRefreshAlerts } from '@/components/AlertsContext'

export default function NotificationsScreen() {
  const [items, setItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const refreshAlerts = useRefreshAlerts()

  async function load() {
    const data = await getNotifications()
    setItems(data)
    setLoading(false)
    setRefreshing(false)
  }

  async function markSeen() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase
      .from('profiles')
      .update({ alerts_last_seen_at: new Date().toISOString() })
      .eq('id', user.id)
    refreshAlerts()
  }

  useEffect(() => {
    markSeen()
  }, [])

  useFocusEffect(useCallback(() => { load() }, []))

  function onRefresh() { setRefreshing(true); load() }

  function renderItem({ item }: { item: Notification }) {
    if (item.type === 'follow') {
      return (
        <TouchableOpacity style={styles.item} onPress={() => router.push(`/profile/${item.username}`)}>
          <Text style={styles.itemText}>
            <Text style={styles.accent}>@{item.username}</Text>
            <Text style={styles.muted}> followed you</Text>
          </Text>
        </TouchableOpacity>
      )
    }
    return (
      <TouchableOpacity style={styles.item} onPress={() => item.postId && router.push(`/post/${item.postId}`)}>
        <Text style={styles.itemText}>
          <Text style={styles.accent}>@{item.username}</Text>
          <Text style={styles.muted}> liked · </Text>
          <Text style={styles.muted}>{item.postContent?.slice(0, 60)}{(item.postContent?.length ?? 0) > 60 ? '…' : ''}</Text>
        </Text>
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="alerts" showBack />
      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={colors.accent} /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={<Text style={styles.empty}>no notifications yet.</Text>}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  item: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 16, paddingVertical: 12 },
  itemText: { fontFamily: font.regular, fontSize: 14, lineHeight: 20 },
  accent: { color: colors.accent },
  muted: { color: colors.muted },
  empty: { fontFamily: font.regular, fontSize: 14, color: colors.muted, textAlign: 'center', paddingVertical: 48 },
})
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/notifications.tsx
git commit -m "feat(mobile): add notifications stack screen"
```

---

## Task 8: Create `app/settings.tsx` — settings stack screen

**Files:**
- Create: `apps/mobile/app/settings.tsx`

Same content as old `app/(tabs)/settings.tsx` with `ScreenHeader` replacing the header View and rendered outside the loading guard.

- [ ] **Step 1: Create the file**

```tsx
// apps/mobile/app/settings.tsx
import React, { useEffect, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ScrollView, ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { colors, font } from '@/lib/theme'
import { validateDisplayName } from '@solbook/shared/validation'
import { ScreenHeader } from '@/components/ScreenHeader'

export default function SettingsScreen() {
  const [profile, setProfile] = useState<{ username: string; display_name: string; bio: string | null } | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('username, display_name, bio')
        .eq('id', user.id)
        .single()
      if (data) {
        setProfile(data)
        setDisplayName(data.display_name)
        setBio(data.bio ?? '')
      }
    }
    load()
  }, [])

  async function handleSave() {
    const result = validateDisplayName(displayName.trim())
    if (!result.valid) { Alert.alert('Error', result.error); return }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName.trim(), bio: bio.trim() || null })
      .eq('id', user.id)
    setSaving(false)
    if (error) {
      Alert.alert('Error', 'Failed to save profile.')
    } else {
      Alert.alert('Saved', 'Profile updated.')
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.replace('/(auth)/login')
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="settings" showBack />
      {!profile ? (
        <View style={styles.centered}><ActivityIndicator color={colors.accent} /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>profile</Text>
            <Text style={styles.label}>display name</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              maxLength={50}
              placeholderTextColor={colors.muted}
            />
            <Text style={styles.label}>bio</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell people about yourself"
              placeholderTextColor={colors.muted}
              maxLength={160}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.disabled]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>{saving ? 'saving…' : 'save changes'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>account</Text>
            <Text style={styles.username}>@{profile.username}</Text>
            <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
              <Text style={styles.signOutText}>sign out</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { paddingBottom: 32 },
  section: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 16, paddingVertical: 16, gap: 8 },
  sectionTitle: { fontFamily: font.regular, fontSize: 11, color: colors.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  label: { fontFamily: font.regular, fontSize: 12, color: colors.muted },
  input: {
    fontFamily: font.regular, fontSize: 14, color: colors.text,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  textArea: { minHeight: 64 },
  saveButton: { backgroundColor: colors.accent, paddingVertical: 10, paddingHorizontal: 16, alignSelf: 'flex-start', marginTop: 4 },
  disabled: { opacity: 0.4 },
  saveButtonText: { fontFamily: font.bold, fontSize: 12, color: colors.bg },
  username: { fontFamily: font.regular, fontSize: 13, color: colors.muted },
  signOutButton: { borderWidth: 1, borderColor: colors.border, paddingVertical: 8, paddingHorizontal: 16, alignSelf: 'flex-start' },
  signOutText: { fontFamily: font.regular, fontSize: 13, color: colors.muted },
})
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/settings.tsx
git commit -m "feat(mobile): add settings stack screen"
```

---

## Task 9: Create `app/(tabs)/profile.tsx` — own-profile tab

**Files:**
- Create: `apps/mobile/app/(tabs)/profile.tsx`

Fetches current user then calls `getProfile(username)`. If `getUser()` returns no user, redirect to login. Shows "settings →" link. No bell, no back button.

- [ ] **Step 1: Create the file**

```tsx
// apps/mobile/app/(tabs)/profile.tsx
import React, { useEffect, useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { colors, font } from '@/lib/theme'
import { PostCard } from '@/components/PostCard'
import { ScreenHeader } from '@/components/ScreenHeader'
import { getProfile, FeedPost, Profile } from '@/lib/api'

export default function OwnProfileScreen() {
  const [username, setUsername] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.replace('/(auth)/login')
      return
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single()

    if (!profileData?.username) {
      setLoading(false)
      return
    }

    setUsername(profileData.username)

    const result = await getProfile(profileData.username)
    if (!result.profile) return

    setProfile(result.profile)
    setPosts(result.posts)
    setFollowerCount(result.followerCount)
    setFollowingCount(result.followingCount)
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { load() }, [])

  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={username ? `@${username}` : '@me'} />
        <View style={styles.centered}><ActivityIndicator color={colors.accent} /></View>
      </View>
    )
  }

  if (!profile) return null

  return (
    <View style={styles.container}>
      <ScreenHeader title={`@${profile.username}`} />
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PostCard {...item} onLikeToggled={load} />}
        ListHeaderComponent={
          <View style={styles.profileHeader}>
            <View style={styles.profileTop}>
              <View style={styles.profileInfo}>
                <Text style={styles.displayName}>{profile.display_name}</Text>
                <Text style={styles.usernameText}>@{profile.username}</Text>
                {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}
                <View style={styles.counts}>
                  <Text style={styles.count}><Text style={styles.countNum}>{followerCount}</Text> followers</Text>
                  <Text style={styles.count}><Text style={styles.countNum}>{followingCount}</Text> following</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => router.push('/settings')}>
                <Text style={styles.settingsLink}>settings →</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>no posts yet.</Text>}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={colors.accent} />}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  profileHeader: { borderBottomWidth: 1, borderBottomColor: colors.border, padding: 16 },
  profileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  profileInfo: { flex: 1 },
  displayName: { fontFamily: font.bold, fontSize: 16, color: colors.text },
  usernameText: { fontFamily: font.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
  bio: { fontFamily: font.regular, fontSize: 13, color: colors.text, marginTop: 8 },
  counts: { flexDirection: 'row', gap: 16, marginTop: 12 },
  count: { fontFamily: font.regular, fontSize: 12, color: colors.muted },
  countNum: { fontFamily: font.bold, color: colors.text },
  settingsLink: { fontFamily: font.regular, fontSize: 12, color: colors.muted },
  empty: { fontFamily: font.regular, fontSize: 14, color: colors.muted, textAlign: 'center', paddingVertical: 48 },
})
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/(tabs)/profile.tsx
git commit -m "feat(mobile): add own-profile tab screen"
```

---

## Task 10: Update `app/profile/[username].tsx` — use ScreenHeader, add settings link

**Files:**
- Modify: `apps/mobile/app/profile/[username].tsx`

Replace the `navBar` View + `useSafeAreaInsets` with `<ScreenHeader title={\`@${username}\`} showBack />`. Add "settings →" link in the profile header when `isOwnProfile`. Always show back (this screen is always pushed from elsewhere).

- [ ] **Step 1: Update the file**

```tsx
// apps/mobile/app/profile/[username].tsx
import React, { useEffect, useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { colors, font } from '@/lib/theme'
import { PostCard } from '@/components/PostCard'
import { ScreenHeader } from '@/components/ScreenHeader'
import { getProfile, toggleFollow, FeedPost, Profile } from '@/lib/api'

export default function ProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [isFollowing, setIsFollowing] = useState(false)
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    if (!username) return
    const result = await getProfile(username)
    if (!result.profile) { router.back(); return }

    const { data: { user } } = await supabase.auth.getUser()
    setProfile(result.profile)
    setPosts(result.posts)
    setFollowerCount(result.followerCount)
    setFollowingCount(result.followingCount)
    setIsFollowing(result.isFollowing)
    setIsOwnProfile(user?.id === result.profile.id)
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { load() }, [username])

  async function handleFollow() {
    if (!profile) return
    setIsFollowing((f) => !f)
    setFollowerCount((c) => isFollowing ? c - 1 : c + 1)
    await toggleFollow(profile.id)
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title={username ? `@${username}` : ''} showBack />
      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={colors.accent} /></View>
      ) : profile ? (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PostCard {...item} onLikeToggled={load} />}
          ListHeaderComponent={
            <View style={styles.profileHeader}>
              <View style={styles.profileTop}>
                <View style={styles.profileInfo}>
                  <Text style={styles.displayName}>{profile.display_name}</Text>
                  <Text style={styles.username}>@{profile.username}</Text>
                  {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}
                  <View style={styles.counts}>
                    <Text style={styles.count}><Text style={styles.countNum}>{followerCount}</Text> followers</Text>
                    <Text style={styles.count}><Text style={styles.countNum}>{followingCount}</Text> following</Text>
                  </View>
                </View>
                {isOwnProfile ? (
                  <TouchableOpacity onPress={() => router.push('/settings')}>
                    <Text style={styles.settingsLink}>settings →</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.followBtn, isFollowing && styles.followingBtn]}
                    onPress={handleFollow}
                  >
                    <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
                      {isFollowing ? 'unfollow' : 'follow'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          }
          ListEmptyComponent={<Text style={styles.empty}>no posts yet.</Text>}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={colors.accent} />}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  profileHeader: { borderBottomWidth: 1, borderBottomColor: colors.border, padding: 16 },
  profileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  profileInfo: { flex: 1 },
  displayName: { fontFamily: font.bold, fontSize: 16, color: colors.text },
  username: { fontFamily: font.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
  bio: { fontFamily: font.regular, fontSize: 13, color: colors.text, marginTop: 8 },
  counts: { flexDirection: 'row', gap: 16, marginTop: 12 },
  count: { fontFamily: font.regular, fontSize: 12, color: colors.muted },
  countNum: { fontFamily: font.bold, color: colors.text },
  settingsLink: { fontFamily: font.regular, fontSize: 12, color: colors.muted },
  followBtn: { borderWidth: 1, borderColor: colors.accent, paddingHorizontal: 12, paddingVertical: 6 },
  followingBtn: { borderColor: colors.border },
  followBtnText: { fontFamily: font.regular, fontSize: 12, color: colors.accent },
  followingBtnText: { color: colors.muted },
  empty: { fontFamily: font.regular, fontSize: 14, color: colors.muted, textAlign: 'center', paddingVertical: 48 },
})
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/profile/[username].tsx
git commit -m "feat(mobile): replace profile detail header with ScreenHeader, add settings link for own profile"
```

---

## Task 11: Update `app/post/[id].tsx` — use ScreenHeader

**Files:**
- Modify: `apps/mobile/app/post/[id].tsx`

- [ ] **Step 1: Update the file**

```tsx
// apps/mobile/app/post/[id].tsx
import React, { useEffect, useState } from 'react'
import { View, StyleSheet, ActivityIndicator } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { colors } from '@/lib/theme'
import { PostCard } from '@/components/PostCard'
import { ScreenHeader } from '@/components/ScreenHeader'
import { FeedPost } from '@/lib/api'

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [post, setPost] = useState<FeedPost | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!id) return
      const { data: { user } } = await supabase.auth.getUser()

      const { data } = await supabase
        .from('posts')
        .select(`
          id, content, created_at,
          profiles!posts_user_id_fkey ( username, display_name ),
          likes ( id, user_id )
        `)
        .eq('id', id)
        .single()

      if (!data) { router.back(); return }

      const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles
      const likes = (data.likes as any[]) ?? []

      setPost({
        id: data.id,
        content: data.content,
        createdAt: data.created_at,
        author: { username: profile?.username ?? 'unknown', displayName: profile?.display_name ?? 'Unknown' },
        likeCount: likes.length,
        likedByMe: likes.some((l) => l.user_id === user?.id),
      })
      setLoading(false)
    }
    load()
  }, [id])

  return (
    <View style={styles.container}>
      <ScreenHeader title="post" showBack />
      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={colors.accent} /></View>
      ) : (
        post && <PostCard {...post} />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
})
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/post/[id].tsx
git commit -m "feat(mobile): replace post detail header with ScreenHeader"
```

---

## Task 12: Delete old tab files

**Files:**
- Delete: `apps/mobile/app/(tabs)/compose.tsx`
- Delete: `apps/mobile/app/(tabs)/notifications.tsx`
- Delete: `apps/mobile/app/(tabs)/settings.tsx`

- [ ] **Step 1: Delete the files**

```bash
git rm apps/mobile/app/\(tabs\)/compose.tsx apps/mobile/app/\(tabs\)/notifications.tsx apps/mobile/app/\(tabs\)/settings.tsx
```

- [ ] **Step 2: Verify TypeScript — confirm no remaining imports of deleted files**

```bash
cd apps/mobile && bun run tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(mobile): remove compose, notifications, settings tab screens (moved to stack routes)"
```

---

## Final Verification

- [ ] **Start the app and verify manually**

```bash
cd apps/mobile && bun run start
```

Checklist:
- [ ] Bottom tab bar shows 3 items: `home`, `discover`, `@username` (your actual username)
- [ ] Active tab shows bracket notation: `[home]`, `[discover]`, `[@username]`
- [ ] Home screen header shows title "home" and bell icon (top right)
- [ ] Bell icon navigates to alerts screen; back button returns to home
- [ ] Visiting alerts screen marks them seen; bell clears
- [ ] Discover screen header shows title "discover" and bell icon
- [ ] Profile tab shows own profile with "settings →" link
- [ ] "settings →" navigates to settings screen with back button
- [ ] Profile detail (tap a post author) shows `← back` + `@username` header
- [ ] Post detail shows `← back` + `post` header
- [ ] No stale references to old tab routes (compose, notifications, settings tabs)
