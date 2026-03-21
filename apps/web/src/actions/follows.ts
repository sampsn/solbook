'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@solbook/shared/supabase'
import { requireSession } from '@/lib/auth'

export async function toggleFollow(targetUserId: string): Promise<void> {
  const session = await requireSession()
  if (session.userId === targetUserId) return

  const supabase = createServerClient()

  const { data: existing } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', session.userId)
    .eq('following_id', targetUserId)
    .single()

  if (existing) {
    await supabase
      .from('follows')
      .delete()
      .eq('follower_id', session.userId)
      .eq('following_id', targetUserId)
  } else {
    await supabase
      .from('follows')
      .insert({ follower_id: session.userId, following_id: targetUserId })
  }

  revalidatePath(`/home`)
}
