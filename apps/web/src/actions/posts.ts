'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@solbook/shared/supabase'
import { validatePost } from '@solbook/shared/validation'
import { requireSession } from '@/lib/auth'

export async function createPost(content: string): Promise<{ error?: string }> {
  const session = await requireSession()

  const result = validatePost(content)
  if (!result.valid) return { error: result.error }

  const supabase = createServerClient()
  const { error } = await supabase.from('posts').insert({
    user_id: session.userId,
    content: content.trim(),
  })

  if (error) return { error: 'Failed to create post.' }

  revalidatePath('/home')
  return {}
}

export async function toggleLike(postId: string): Promise<void> {
  const session = await requireSession()
  const supabase = createServerClient()

  const { data: existing } = await supabase
    .from('likes')
    .select('id')
    .eq('user_id', session.userId)
    .eq('post_id', postId)
    .single()

  if (existing) {
    await supabase.from('likes').delete().eq('id', existing.id)
  } else {
    await supabase.from('likes').insert({ user_id: session.userId, post_id: postId })
  }

  revalidatePath('/home')
}
