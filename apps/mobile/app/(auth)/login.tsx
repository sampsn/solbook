import React, { useMemo, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native'
import { Link, router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/ThemeContext'
import { font } from '@/lib/theme'

export default function LoginScreen() {
  const { colors } = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const styles = useMemo(() => StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.bg },
    container: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 24,
      paddingVertical: 48,
    },
    brand: { fontFamily: font.bold, fontSize: 36, color: colors.accent, marginBottom: 8 },
    subtitle: { fontFamily: font.regular, fontSize: 14, color: colors.muted, marginBottom: 32 },
    form: { gap: 12, marginBottom: 24 },
    input: {
      fontFamily: font.regular, fontSize: 14, color: colors.text,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
      paddingHorizontal: 12, paddingVertical: 10,
    },
    button: { backgroundColor: colors.accent, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
    buttonDisabled: { opacity: 0.4 },
    buttonText: { fontFamily: font.bold, fontSize: 14, color: colors.bg },
    link: { alignSelf: 'center' },
    linkText: { fontFamily: font.regular, fontSize: 13, color: colors.muted },
    linkAccent: { color: colors.accent },
  }), [colors])

  async function handleLogin() {
    if (!email.trim() || !password) return
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setLoading(false)

    if (error) {
      Alert.alert('Sign in failed', error.message)
    } else {
      router.replace('/(tabs)/home')
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>solbook</Text>
        <Text style={styles.subtitle}>sign in with your email and password.</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="email"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="password"
            placeholderTextColor={colors.muted}
            secureTextEntry
            autoComplete="current-password"
          />
          <TouchableOpacity
            style={[styles.button, (!email.trim() || !password || loading) && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={!email.trim() || !password || loading}
          >
            <Text style={styles.buttonText}>{loading ? 'signing in…' : 'sign in'}</Text>
          </TouchableOpacity>
        </View>

        <Link href="/(auth)/signup" style={styles.link}>
          <Text style={styles.linkText}>don't have an account? <Text style={styles.linkAccent}>create one</Text></Text>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
