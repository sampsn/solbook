'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerClient } from '@solbook/shared/supabase'
import { createSessionToken } from '@/lib/session'

async function setSessionCookie(userId: string) {
  const token = createSessionToken(userId)
  const cookieStore = await cookies()
  cookieStore.set('sb-auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
}

export async function signUp(
  email: string,
  password: string,
): Promise<{ error?: string; userId?: string }> {
  const supabase = createServerClient()
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) return { error: error.message }
  if (!data.user) return { error: 'Signup failed.' }
  await setSessionCookie(data.user.id)
  return { userId: data.user.id }
}

export async function signIn(email: string, password: string): Promise<{ error?: string }> {
  const supabase = createServerClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: error.message }
  await setSessionCookie(data.user.id)
  redirect('/home')
}

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete('sb-auth-token')
  redirect('/login')
}
