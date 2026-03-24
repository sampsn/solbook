// apps/mobile/app/(tabs)/discover.tsx
import React, { useCallback, useMemo, useState } from 'react'
import { View, Text, FlatList, RefreshControl, StyleSheet, ActivityIndicator } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { useTheme } from '@/lib/ThemeContext'
import { font } from '@/lib/theme'
import { PostCard } from '@/components/PostCard'
import { ScreenHeader } from '@/components/ScreenHeader'
import { getDiscoverFeed, FeedPost } from '@/lib/api'

export default function DiscoverScreen() {
  const { colors } = useTheme()
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    centered: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
    empty: { fontFamily: font.regular, fontSize: 16, color: colors.muted, textAlign: 'center', paddingVertical: 48 },
  }), [colors])

  async function load() {
    const data = await getDiscoverFeed()
    setPosts(data)
    setLoading(false)
    setRefreshing(false)
  }

  useFocusEffect(useCallback(() => { load() }, []))

  function onRefresh() { setRefreshing(true); load() }

  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="discover" showBell showSearch />
        <View style={styles.centered}><ActivityIndicator color={colors.accent} /></View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="discover" showBell showSearch />
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
