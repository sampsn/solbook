'use server'

import { redirect } from 'next/navigation'
import { createServerClient } from '@solbook/shared/supabase'
import { validateUsername, validateDisplayName } from '@solbook/shared/validation'

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
