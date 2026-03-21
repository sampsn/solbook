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
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })
  return token
}

export async function sendPhoneOtp(phone: string): Promise<{ error?: string }> {
  const supabase = createServerClient()
  const { error } = await supabase.auth.signInWithOtp({
    phone,
    options: { channel: 'sms' },
  })
  if (error) return { error: error.message }
  return {}
}

export async function verifyPhoneOtp(
  phone: string,
  token: string,
): Promise<{ error?: string; accessToken?: string; userId?: string }> {
  const supabase = createServerClient()
  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: 'sms',
  })

  if (error || !data.session || !data.user) {
    return { error: error?.message ?? 'Verification failed.' }
  }

  // Set persistent HttpOnly session cookie
  await setSessionCookie(data.user.id)

  // Also return the Supabase access token so the signup flow can use it
  // for passkey registration (which requires auth.admin.getUser validation)
  return { accessToken: data.session.access_token, userId: data.user.id }
}

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete('sb-auth-token')
  redirect('/login')
}
