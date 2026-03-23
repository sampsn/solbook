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
