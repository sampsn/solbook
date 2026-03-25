import React, { useMemo, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native'
import { router } from 'expo-router'
import { useTheme } from '@/lib/ThemeContext'
import { font } from '@/lib/theme'
import { toggleLike, FeedPost } from '@/lib/api'

interface Props extends FeedPost {
  onLikeToggled?: () => void
}


function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function PostCard({ id, content, createdAt, author, likeCount, likedByMe, commentCount, onLikeToggled }: Props) {
  const { colors } = useTheme()
  const [liked, setLiked] = useState(likedByMe)
  const [count, setCount] = useState(likeCount)

  const styles = useMemo(() => StyleSheet.create({
    container: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.bg,
    },
    meta: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' },
    displayName: { fontFamily: font.bold, fontSize: 14, color: colors.heading },
    username: { fontFamily: font.regular, fontSize: 14, color: colors.muted },
    separator: { fontFamily: font.regular, fontSize: 14, color: colors.muted },
    time: { fontFamily: font.regular, fontSize: 14, color: colors.muted },
    content: { fontFamily: font.regular, fontSize: 16, color: colors.textStrong, lineHeight: 24, marginBottom: 8 },
    actionRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    likeBtn: { fontFamily: font.regular, fontSize: 14, color: colors.muted },
    likeBtnActive: { color: colors.accent },
    commentCount: { fontFamily: font.regular, fontSize: 14, color: colors.muted },
  }), [colors])

  async function handleLike() {
    const newLiked = !liked
    setLiked(newLiked)
    setCount((c) => c + (newLiked ? 1 : -1))
    await toggleLike(id)
    onLikeToggled?.()
  }

  return (
    <Pressable style={styles.container} onPress={() => router.push(`/post/${id}`)}>
      <View style={styles.meta}>
        <TouchableOpacity onPress={() => router.push(`/profile/${author.username}`)}>
          <Text style={styles.displayName}>{author.displayName}</Text>
        </TouchableOpacity>
        <Text style={styles.separator}> </Text>
        <TouchableOpacity onPress={() => router.push(`/profile/${author.username}`)}>
          <Text style={styles.username}>(@{author.username})</Text>
        </TouchableOpacity>
        <Text style={styles.separator}> · </Text>
        <Text style={styles.time}>{formatTimeAgo(createdAt)}</Text>
      </View>

      <Text style={styles.content}>{content}</Text>

      <View style={styles.actionRow}>
        <TouchableOpacity onPress={handleLike}>
          <Text style={[styles.likeBtn, liked && styles.likeBtnActive]}>
            {liked ? '▲' : '△'} {count > 0 ? count : 'like'}
          </Text>
        </TouchableOpacity>
        {typeof commentCount === 'number' && (
          <Text style={styles.commentCount}>◻ {commentCount > 0 ? commentCount : ''}</Text>
        )}
      </View>
    </Pressable>
  )
}
