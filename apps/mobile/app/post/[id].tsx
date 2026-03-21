import React, { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { colors, font } from '@/lib/theme'
import { PostCard } from '@/components/PostCard'
import { FeedPost } from '@/lib/api'

export default function PostDetailScreen() {
  const insets = useSafeAreaInsets()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [post, setPost] = useState<FeedPost | null>(null)
  const [loading, setLoading] = useState(true)

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

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator color={colors.accent} /></View>
  }

  return (
    <View style={styles.container}>
      <View style={[styles.navBar, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← back</Text>
        </TouchableOpacity>
      </View>
      {post && <PostCard {...post} />}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  navBar: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  back: { fontFamily: font.regular, fontSize: 13, color: colors.muted },
})
