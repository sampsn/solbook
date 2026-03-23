// apps/mobile/components/ScreenHeader.tsx
import React, { useMemo } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTheme } from '@/lib/ThemeContext'
import { font } from '@/lib/theme'
import { useHasUnseenAlerts } from '@/components/AlertsContext'

interface ScreenHeaderProps {
  title: string
  showBack?: boolean
  showBell?: boolean
}

function BellIcon({ filled, color }: { filled: boolean; color: string }) {
  return (
    <Svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill={filled ? color : 'none'}
      stroke={color}
      strokeWidth={filled ? 0 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <Path d="M13.73 21a2 2 0 0 1-3.46 0" strokeWidth={2} stroke={color} fill="none" />
    </Svg>
  )
}

export function ScreenHeader({ title, showBack, showBell }: ScreenHeaderProps) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const hasUnseenAlerts = useHasUnseenAlerts()
  const bellColor = hasUnseenAlerts ? colors.accent : colors.muted

  const styles = useMemo(() => StyleSheet.create({
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
    back: { fontFamily: font.regular, fontSize: 15, color: colors.muted },
    title: { fontFamily: font.bold, fontSize: 20, color: colors.accent },
    bellBtn: { padding: 4 },
    placeholder: { minWidth: 48 },
  }), [colors])

  if (showBack) {
    return (
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.back}>← back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.placeholder} />
      </View>
    )
  }

  return (
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      <Text style={styles.title}>{title}</Text>
      {showBell && (
        <TouchableOpacity onPress={() => router.push('/notifications')} style={styles.bellBtn}>
          <BellIcon filled={hasUnseenAlerts} color={bellColor} />
        </TouchableOpacity>
      )}
    </View>
  )
}
