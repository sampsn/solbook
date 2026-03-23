import React, { useMemo, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useTheme } from '@/lib/ThemeContext'
import { font } from '@/lib/theme'
import { createPost } from '@/lib/api'
import { validatePost } from '@solbook/shared/validation'

interface Props {
  onPosted?: () => void
}

export function PostComposer({ onPosted }: Props) {
  const { colors } = useTheme()
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)

  const remaining = 280 - content.length
  const overLimit = remaining < 0

  const styles = useMemo(() => StyleSheet.create({
    container: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    input: {
      fontFamily: font.regular,
      fontSize: 16,
      color: colors.textStrong,
      lineHeight: 24,
      minHeight: 60,
      marginBottom: 8,
    },
    footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    counter: { fontFamily: font.regular, fontSize: 14, color: colors.muted },
    counterOver: { color: colors.danger },
    button: { backgroundColor: colors.accent, paddingHorizontal: 16, paddingVertical: 6 },
    buttonDisabled: { opacity: 0.4 },
    buttonText: { fontFamily: font.bold, fontSize: 14, color: colors.bg },
  }), [colors])

  async function handlePost() {
    const trimmed = content.trim()
    const validation = validatePost(trimmed)
    if (!validation.valid) {
      Alert.alert('Error', validation.error)
      return
    }

    setLoading(true)
    const result = await createPost(trimmed)
    setLoading(false)

    if (result.error) {
      Alert.alert('Error', result.error)
    } else {
      setContent('')
      onPosted?.()
    }
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={content}
        onChangeText={setContent}
        placeholder="what's on your mind?"
        placeholderTextColor={colors.muted}
        multiline
        numberOfLines={3}
        contextMenuHidden={true}
        textAlignVertical="top"
      />
      <View style={styles.footer}>
        <Text style={[styles.counter, overLimit && styles.counterOver]}>{remaining}</Text>
        <TouchableOpacity
          style={[styles.button, (loading || !content.trim() || overLimit) && styles.buttonDisabled]}
          onPress={handlePost}
          disabled={loading || !content.trim() || overLimit}
        >
          <Text style={styles.buttonText}>{loading ? 'posting…' : 'post'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
