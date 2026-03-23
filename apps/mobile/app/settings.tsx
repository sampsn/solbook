// apps/mobile/app/settings.tsx
import React, { useEffect, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ScrollView, ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { colors, font } from '@/lib/theme'
import { validateDisplayName } from '@solbook/shared/validation'
import { ScreenHeader } from '@/components/ScreenHeader'

export default function SettingsScreen() {
  const [profile, setProfile] = useState<{ username: string; display_name: string; bio: string | null } | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/(auth)/login'); return }
      const { data } = await supabase
        .from('profiles')
        .select('username, display_name, bio')
        .eq('id', user.id)
        .single()
      if (data) {
        setProfile(data)
        setDisplayName(data.display_name)
        setBio(data.bio ?? '')
      }
    }
    load()
  }, [])

  async function handleSave() {
    const result = validateDisplayName(displayName.trim())
    if (!result.valid) { Alert.alert('Error', result.error); return }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName.trim(), bio: bio.trim() || null })
      .eq('id', user.id)
    setSaving(false)
    if (error) {
      Alert.alert('Error', 'Failed to save profile.')
    } else {
      Alert.alert('Saved', 'Profile updated.')
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.replace('/(auth)/login')
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="settings" showBack />
      {!profile ? (
        <View style={styles.centered}><ActivityIndicator color={colors.accent} /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>profile</Text>
            <Text style={styles.label}>display name</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              maxLength={50}
              placeholderTextColor={colors.muted}
            />
            <Text style={styles.label}>bio</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell people about yourself"
              placeholderTextColor={colors.muted}
              maxLength={160}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.disabled]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>{saving ? 'saving…' : 'save changes'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>account</Text>
            <Text style={styles.username}>@{profile.username}</Text>
            <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
              <Text style={styles.signOutText}>sign out</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { paddingBottom: 32 },
  section: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 16, paddingVertical: 16, gap: 8 },
  sectionTitle: { fontFamily: font.regular, fontSize: 13, color: colors.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  label: { fontFamily: font.regular, fontSize: 14, color: colors.muted },
  input: {
    fontFamily: font.regular, fontSize: 16, color: colors.text,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  textArea: { minHeight: 64 },
  saveButton: { backgroundColor: colors.accent, paddingVertical: 10, paddingHorizontal: 16, alignSelf: 'flex-start', marginTop: 4 },
  disabled: { opacity: 0.4 },
  saveButtonText: { fontFamily: font.bold, fontSize: 14, color: colors.bg },
  username: { fontFamily: font.regular, fontSize: 15, color: colors.muted },
  signOutButton: { borderWidth: 1, borderColor: colors.border, paddingVertical: 8, paddingHorizontal: 16, alignSelf: 'flex-start' },
  signOutText: { fontFamily: font.regular, fontSize: 15, color: colors.muted },
})
