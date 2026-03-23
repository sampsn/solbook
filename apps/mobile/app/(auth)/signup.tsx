import React, { useMemo, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native'
import { Link, router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/ThemeContext'
import { font } from '@/lib/theme'
import { validateUsername, validateDisplayName } from '@solbook/shared/validation'

export default function SignupScreen() {
  const { colors } = useTheme()
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const styles = useMemo(() => StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.bg },
    container: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 48 },
    brand: { fontFamily: font.bold, fontSize: 36, color: colors.brand, marginBottom: 8 },
    subtitle: { fontFamily: font.regular, fontSize: 14, color: colors.muted, marginBottom: 32 },
    form: { gap: 12, marginBottom: 24 },
    label: { fontFamily: font.regular, fontSize: 12, color: colors.textStrong, marginBottom: 4 },
    input: {
      fontFamily: font.regular, fontSize: 14, color: colors.textStrong,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
      paddingHorizontal: 12, paddingVertical: 10,
    },
    usernameRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    at: { fontFamily: font.regular, fontSize: 14, color: colors.muted, paddingHorizontal: 12 },
    usernameInput: { flex: 1, borderWidth: 0, backgroundColor: 'transparent' },
    button: { backgroundColor: colors.brand, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
    buttonDisabled: { opacity: 0.4 },
    buttonText: { fontFamily: font.bold, fontSize: 14, color: colors.bg },
    link: { alignSelf: 'center' },
    linkText: { fontFamily: font.regular, fontSize: 13, color: colors.muted },
    linkAccent: { color: colors.accent },
  }), [colors])

  async function handleSignup() {
    const dnResult = validateDisplayName(displayName.trim())
    if (!dnResult.valid) { Alert.alert('Error', dnResult.error); return }

    const unResult = validateUsername(username.trim())
    if (!unResult.valid) { Alert.alert('Error', unResult.error); return }

    if (!email.trim() || password.length < 6) {
      Alert.alert('Error', 'Please enter a valid email and a password of at least 6 characters.')
      return
    }

    setLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    })

    if (signUpError || !data.user) {
      setLoading(false)
      Alert.alert('Sign up failed', signUpError?.message ?? 'Unknown error')
      return
    }

    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      username: username.trim().toLowerCase(),
      display_name: displayName.trim(),
    })

    setLoading(false)

    if (profileError) {
      if (profileError.code === '23505') {
        Alert.alert('Error', 'That username is already taken.')
      } else {
        Alert.alert('Error', 'Failed to create profile.')
      }
      return
    }

    router.replace('/(tabs)/home')
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>solbook</Text>
        <Text style={styles.subtitle}>join the human-only social network.</Text>

        <View style={styles.form}>
          <View>
            <Text style={styles.label}>display name</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your name"
              placeholderTextColor={colors.muted}
              maxLength={50}
            />
          </View>
          <View>
            <Text style={styles.label}>username</Text>
            <View style={styles.usernameRow}>
              <Text style={styles.at}>@</Text>
              <TextInput
                style={[styles.input, styles.usernameInput]}
                value={username}
                onChangeText={(t) => setUsername(t.toLowerCase())}
                placeholder="username"
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
                maxLength={20}
              />
            </View>
          </View>
          <View>
            <Text style={styles.label}>email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>
          <View>
            <Text style={styles.label}>password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="min. 6 characters"
              placeholderTextColor={colors.muted}
              secureTextEntry
            />
          </View>
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignup}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'creating account…' : 'create account'}</Text>
          </TouchableOpacity>
        </View>

        <Link href="/(auth)/login" style={styles.link}>
          <Text style={styles.linkText}>already have an account? <Text style={styles.linkAccent}>sign in</Text></Text>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
