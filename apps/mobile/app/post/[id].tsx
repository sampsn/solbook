import React, { useEffect, useMemo, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/ThemeContext'
import { font } from '@/lib/theme'
import { PostCard } from '@/components/PostCard'
import { ScreenHeader } from '@/components/ScreenHeader'
import { CommentComposer } from '@/components/comments/CommentComposer'
import { CommentList } from '@/components/comments/CommentList'
import { getComments } from '@/lib/comments'
import { FeedPost } from '@/lib/api'
import type { CommentNode } from '@solbook/shared/types'

export default function PostDetailScreen() {
  const { colors } = useTheme()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [post, setPost] = useState<FeedPost | null>(null)
  const [comments, setComments] = useState<CommentNode[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    empty: { fontFamily: font.regular, fontSize: 13, color: colors.muted, textAlign: 'center', padding: 24 },
  }), [colors])

  async function loadData() {
    if (!id) return
    const { data: { user } } = await supabase.auth.getUser()
    setUserId(user?.id ?? null)

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

    const tree = await getComments(id)
    setComments(tree)
    setLoading(false)
  }

  useEffect(() => { loadData() }, [id])

  return (
    <View style={styles.container}>
      <ScreenHeader title="post" showBack />
      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={colors.accent} /></View>
      ) : (
        <ScrollView>
          {post && <PostCard {...post} />}
          {userId && <CommentComposer postId={id!} onSubmit={loadData} />}
          {comments.length === 0 ? (
            <Text style={styles.empty}>no comments yet</Text>
          ) : (
            <CommentList nodes={comments} postId={id!} userId={userId} />
          )}
        </ScrollView>
      )}
    </View>
  )
}
