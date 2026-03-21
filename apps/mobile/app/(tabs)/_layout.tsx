import { Tabs } from 'expo-router'
import { Text } from 'react-native'
import { colors, font } from '@/lib/theme'

function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text style={{ fontFamily: font.regular, fontSize: 10, color: focused ? colors.accent : colors.muted }}>
      {label}
    </Text>
  )
}

export default function TabsLayout() {
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
        name="compose"
        options={{ tabBarLabel: ({ focused }) => <TabLabel label="new" focused={focused} /> }}
      />
      <Tabs.Screen
        name="notifications"
        options={{ tabBarLabel: ({ focused }) => <TabLabel label="alerts" focused={focused} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ tabBarLabel: ({ focused }) => <TabLabel label="settings" focused={focused} /> }}
      />
    </Tabs>
  )
}
