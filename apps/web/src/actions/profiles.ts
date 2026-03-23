'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@solbook/shared/supabase'
import { validateUsername, validateDisplayName } from '@solbook/shared/validation'
import { requireSession } from '@/lib/auth'

export async function createProfile(
  userId: string,
  username: string,
  displayName: string,
): Promise<{ error?: string }> {
  const usernameResult = validateUsername(username)
  if (!usernameResult.valid) return { error: usernameResult.error }

  const displayNameResult = validateDisplayName(displayName)
  if (!displayNameResult.valid) return { error: displayNameResult.error }

  const supabase = createServerClient()
  const { error } = await supabase.from('profiles').insert({
    id: userId,
    username: username.toLowerCase(),
    display_name: displayName,
  })

  if (error) {
    if (error.code === '23505') return { error: 'That username is already taken.' }
    return { error: 'Failed to create profile. Please try again.' }
  }

  redirect('/home')
}

export async function updateProfile(formData: FormData): Promise<void> {
  const session = await requireSession()
  const displayName = (formData.get('displayName') as string)?.trim()
  const bio = (formData.get('bio') as string)?.trim() ?? ''

  if (!displayName) return

  const result = validateDisplayName(displayName)
  if (!result.valid) return

  const supabase = createServerClient()
  await supabase
    .from('profiles')
    .update({ display_name: displayName, bio: bio || null })
    .eq('id', session.userId)

  revalidatePath('/settings')
}

export async function updateTheme(theme: 'system' | 'dark' | 'light'): Promise<void> {
  const session = await requireSession()
  const supabase = createServerClient()
  await supabase
    .from('profiles')
    .update({ theme })
    .eq('id', session.userId)
}
