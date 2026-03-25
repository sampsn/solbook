import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { useTheme } from '@/lib/ThemeContext'
import { font } from '@/lib/theme'
import { toggleCommentLike } from '@/lib/comments'
import { CommentComposer } from './CommentComposer'
import type { CommentNode } from '@solbook/shared/types'

const MAX_VISUAL_DEPTH = 7
const INDENT_PX = 14

interface Props {
  node: CommentNode
  postId: string
  userId: string | null
  depth: number
  isCollapsed: boolean
  onToggleCollapse: () => void
  replyCount: number
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

export function CommentItem({ node, postId, userId, depth, isCollapsed, onToggleCollapse, replyCount }: Props) {
  const { colors } = useTheme()
  const [showReply, setShowReply] = useState(false)
  const [liked, setLiked] = useState(node.liked_by_me)
  const [count, setCount] = useState(node.like_count)

  const visualDepth = Math.min(depth, MAX_VISUAL_DEPTH)

  async function handleLike() {
    if (!userId) return
    const newLiked = !liked
    setLiked(newLiked)
    setCount(c => c + (newLiked ? 1 : -1))
    await toggleCommentLike(node.id)
  }

  const styles = StyleSheet.create({
    container: { paddingLeft: visualDepth * INDENT_PX, borderBottomWidth: 1, borderBottomColor: colors.border },
    inner: { paddingHorizontal: 16, paddingVertical: 8 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' },
    collapseBtn: { fontFamily: font.regular, fontSize: 12, color: colors.muted },
    username: { fontFamily: font.bold, fontSize: 12, color: colors.textStrong },
    meta: { fontFamily: font.regular, fontSize: 12, color: colors.muted },
    content: { fontFamily: font.regular, fontSize: 14, color: colors.textStrong, lineHeight: 20, marginBottom: 6 },
    actions: { flexDirection: 'row', gap: 16 },
    action: { fontFamily: font.regular, fontSize: 12, color: colors.muted },
    actionActive: { color: colors.accent },
  })

  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <View style={styles.metaRow}>
          <TouchableOpacity onPress={onToggleCollapse}>
            <Text style={styles.collapseBtn}>{isCollapsed ? '[+]' : '[-]'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push(`/profile/${node.profile.username}`)}>
            <Text style={styles.username}>{node.profile.username}</Text>
          </TouchableOpacity>
          <Text style={styles.meta}>{formatTimeAgo(node.created_at)}</Text>
          <Text style={styles.meta}>▲ {count}</Text>
          {isCollapsed && replyCount > 0 && (
            <Text style={styles.meta}>· {replyCount} {replyCount === 1 ? 'reply' : 'replies'}</Text>
          )}
        </View>

        {!isCollapsed && (
          <>
            <Text style={styles.content}>{node.content}</Text>
            <View style={styles.actions}>
              {userId && (
                <TouchableOpacity onPress={handleLike}>
                  <Text style={[styles.action, liked && styles.actionActive]}>
                    {liked ? '▲ liked' : '△ like'}
                  </Text>
                </TouchableOpacity>
              )}
              {userId && (
                <TouchableOpacity onPress={() => setShowReply(s => !s)}>
                  <Text style={styles.action}>reply</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </View>

      {!isCollapsed && showReply && (
        <CommentComposer
          postId={postId}
          parentId={node.id}
          parentUsername={node.profile.username}
          onSubmit={() => setShowReply(false)}
          onCancel={() => setShowReply(false)}
        />
      )}
    </View>
  )
}
