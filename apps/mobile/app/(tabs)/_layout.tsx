// apps/mobile/app/(tabs)/_layout.tsx
import { useEffect, useState } from 'react'
import { Tabs } from 'expo-router'
import { View, Text, Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { supabase } from '@/lib/supabase'
import { colors, font } from '@/lib/theme'

function CustomTabBar({ state, navigation, username }: BottomTabBarProps & { username: string }) {
  const insets = useSafeAreaInsets()

  function getLabel(routeName: string) {
    if (routeName === 'profile') return username
    return routeName
  }

  return (
    <View style={{
      flexDirection: 'row',
      backgroundColor: colors.bg,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      height: 52 + insets.bottom,
      paddingBottom: insets.bottom,
    }}>
      {state.routes.map((route, index) => {
        const focused = state.index === index
        const label = getLabel(route.name)
        const displayLabel = focused ? `[${label}]` : label

        return (
          <Pressable
            key={route.key}
            style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name)
            }}
            onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
          >
            <Text style={{
              fontFamily: focused ? font.bold : font.regular,
              fontSize: 16,
              color: focused ? colors.accent : colors.muted,
            }}>
              {displayLabel}
            </Text>
          </Pressable>
        )
      })}
    </View>
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
      tabBar={(props) => <CustomTabBar {...props} username={username} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="discover" />
      <Tabs.Screen name="profile" />
    </Tabs>
  )
}
