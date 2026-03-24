// apps/mobile/app/(tabs)/home.tsx
import React, { useCallback, useMemo, useState } from 'react'
import { View, Text, FlatList, RefreshControl, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { useTheme } from '@/lib/ThemeContext'
import { font } from '@/lib/theme'
import { PostCard } from '@/components/PostCard'
import { PostComposer } from '@/components/PostComposer'
import { ScreenHeader } from '@/components/ScreenHeader'
import { getHomeFeed, FeedPost } from '@/lib/api'

export default function HomeScreen() {
  const { colors } = useTheme()
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [isFollowFeed, setIsFollowFeed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    centered: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
    hint: { paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
    hintText: { fontFamily: font.regular, fontSize: 13, color: colors.muted },
    empty: { fontFamily: font.regular, fontSize: 16, color: colors.muted, textAlign: 'center', paddingVertical: 48 },
    loadMore: { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border },
    loadMoreText: { fontFamily: font.regular, fontSize: 16, color: colors.muted },
  }), [colors])

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
      <View style={styles.container}>
        <ScreenHeader title="home" showBell showSearch />
        <View style={styles.centered}><ActivityIndicator color={colors.accent} /></View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="home" showBell showSearch />
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
