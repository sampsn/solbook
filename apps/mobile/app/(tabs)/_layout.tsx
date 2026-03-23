// apps/mobile/app/(tabs)/_layout.tsx
import { useEffect, useState } from 'react'
import { Tabs } from 'expo-router'
import { Text } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { colors, font } from '@/lib/theme'

function bracketLabel(label: string, focused: boolean) {
  return focused ? `[${label}]` : label
}

function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text style={{
      fontFamily: font.regular,
      fontSize: 11,
      color: focused ? colors.accent : colors.muted,
      fontWeight: focused ? 'bold' : 'normal',
    }}>
      {bracketLabel(label, focused)}
    </Text>
  )
}

export default function TabsLayout() {
  const [username, setUsername] = useState('@me')
  const insets = useSafeAreaInsets()

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
        tabBarIcon: () => null,
        tabBarShowIcon: false,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 52 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 10,
        },
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
