// apps/mobile/app/post/[id].tsx
import React, { useEffect, useMemo, useState } from 'react'
import { View, StyleSheet, ActivityIndicator } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/ThemeContext'
import { PostCard } from '@/components/PostCard'
import { ScreenHeader } from '@/components/ScreenHeader'
import { FeedPost } from '@/lib/api'

export default function PostDetailScreen() {
  const { colors } = useTheme()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [post, setPost] = useState<FeedPost | null>(null)
  const [loading, setLoading] = useState(true)

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  }), [colors])

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
