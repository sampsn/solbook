import React, { useState } from 'react'
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native'
import { useTheme } from '@/lib/ThemeContext'
import { font } from '@/lib/theme'
import { createComment } from '@/lib/comments'

interface Props {
  postId: string
  parentId?: string
  parentUsername?: string
  onSubmit?: () => void
  onCancel?: () => void
}

export function CommentComposer({ postId, parentId, parentUsername, onSubmit, onCancel }: Props) {
  const { colors } = useTheme()
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const remaining = 1000 - content.length
  const overLimit = remaining < 0

  async function handleSubmit() {
    if (!content.trim() || overLimit) return
    setLoading(true)
    setError('')
    const result = await createComment(postId, parentId ?? null, content)
    if (result.error) {
      setError(result.error)
    } else {
      setContent('')
      onSubmit?.()
    }
    setLoading(false)
  }

  const styles = StyleSheet.create({
    container: { borderBottomWidth: 1, borderBottomColor: colors.border, padding: 12 },
    input: {
      fontFamily: font.regular, fontSize: 14, color: colors.textStrong,
      minHeight: 60, textAlignVertical: 'top',
    },
    footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
    count: { fontFamily: font.regular, fontSize: 12, color: overLimit ? colors.danger : colors.muted },
    actions: { flexDirection: 'row', gap: 12 },
    cancelBtn: { fontFamily: font.regular, fontSize: 12, color: colors.muted },
    submitBtn: {
      backgroundColor: colors.accent, paddingHorizontal: 14, paddingVertical: 5,
    },
    submitText: { fontFamily: font.bold, fontSize: 12, color: colors.bg },
    error: { fontFamily: font.regular, fontSize: 12, color: colors.danger, marginBottom: 4 },
  })

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={content}
        onChangeText={setContent}
        placeholder={parentUsername ? `reply to ${parentUsername}…` : 'add a comment…'}
        placeholderTextColor={colors.muted}
        multiline
        autoFocus={!!parentId}
      />
      {!!error && <Text style={styles.error}>{error}</Text>}
      <View style={styles.footer}>
        <Text style={styles.count}>{remaining}</Text>
        <View style={styles.actions}>
          {onCancel && (
            <TouchableOpacity onPress={onCancel}>
              <Text style={styles.cancelBtn}>cancel</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.submitBtn, (!content.trim() || overLimit || loading) && { opacity: 0.4 }]}
            onPress={handleSubmit}
            disabled={!content.trim() || overLimit || loading}
          >
            <Text style={styles.submitText}>{loading ? '…' : parentId ? 'reply' : 'comment'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}
