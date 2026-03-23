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
              { borderColor: colors.border, backgroundColor: active ? colors.accent : colors.surface },
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
