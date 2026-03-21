import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { colors, font } from '@/lib/theme'
import { PostComposer } from '@/components/PostComposer'

export default function ComposeScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>new post</Text>
      </View>
      <PostComposer onPosted={() => router.push('/(tabs)/home')} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 16, paddingVertical: 12, paddingTop: 52 },
  headerText: { fontFamily: font.bold, fontSize: 14, color: colors.accent },
})
