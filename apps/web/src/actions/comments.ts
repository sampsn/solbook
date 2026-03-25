'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@solbook/shared/supabase'
import { validateComment } from '@solbook/shared/validation'
import { requireSession } from '@/lib/auth'

export async function createComment(
  postId: string,
  parentId: string | null,
  content: string,
): Promise<{ error?: string }> {
  const session = await requireSession()

  const result = validateComment(content)
  if (!result.valid) return { error: result.error }

  const supabase = createServerClient()

  let depth = 0
  if (parentId !== null) {
    const { data: parent } = await supabase
      .from('comments')
      .select('depth')
      .eq('id', parentId)
      .single()
    if (!parent) return { error: 'Parent comment not found.' }
    depth = parent.depth + 1
  }

  const { error } = await supabase.from('comments').insert({
    post_id: postId,
    user_id: session.userId,
    parent_id: parentId,
    content: content.trim(),
    depth,
  })

  if (error) return { error: 'Failed to post comment.' }

  revalidatePath('/post/[id]', 'page')
  return {}
}

export async function toggleCommentLike(
  commentId: string,
  postId: string,
): Promise<{ error?: string }> {
  const session = await requireSession()
  const supabase = createServerClient()

  const { data: existing } = await supabase
    .from('comment_likes')
    .select('id')
    .eq('user_id', session.userId)
    .eq('comment_id', commentId)
    .single()

  if (existing) {
    await supabase.from('comment_likes').delete().eq('id', existing.id)
  } else {
    await supabase.from('comment_likes').insert({
      user_id: session.userId,
      comment_id: commentId,
    })
  }

  revalidatePath('/post/[id]', 'page')
  return {}
}
