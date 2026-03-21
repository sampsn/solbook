'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifySessionToken } from './session'

// Returns the authenticated user's ID from the HttpOnly session cookie, or null.
export async function getSession(): Promise<{ userId: string } | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('sb-auth-token')?.value
  if (!token) return null
  const payload = verifySessionToken(token)
  if (!payload) return null
  return { userId: payload.userId }
}

// Redirects to /login if no valid session.
export async function requireSession() {
  const session = await getSession()
  if (!session) redirect('/login')
  return session
}
