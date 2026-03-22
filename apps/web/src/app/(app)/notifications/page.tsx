import { unstable_noStore as noStore } from 'next/cache'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createServerClient } from '@solbook/shared/supabase'
import { requireSession } from '@/lib/auth'
import { PageHeader } from '@/components/nav/PageHeader'

export const metadata: Metadata = { title: 'Alerts' }

export default async function NotificationsPage() {
  noStore()
  const session = await requireSession()
  const supabase = createServerClient()

  // Likes on my posts in the last 7 days
  const { data: likes } = await supabase
    .from('likes')
    .select(`
      id,
      created_at,
      posts!likes_post_id_fkey ( id, content ),
      profiles!likes_user_id_fkey ( username, display_name )
    `)
    .eq('posts.user_id', session.userId)
    .neq('user_id', session.userId)
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(50)

  // New followers in the last 7 days
  const { data: newFollowers } = await supabase
    .from('follows')
    .select(`
      created_at,
      profiles!follows_follower_id_fkey ( username, display_name )
    `)
    .eq('following_id', session.userId)
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(20)

  const hasNotifications = (likes ?? []).length > 0 || (newFollowers ?? []).length > 0

  return (
    <div className="max-w-xl mx-auto">
      <PageHeader title="alerts" showBack />

      {!hasNotifications ? (
        <p className="text-[#888880] text-center py-12 text-sm">no alerts yet. when someone likes your posts or follows you, you'll see it here.</p>
      ) : (
        <div>
          {(newFollowers ?? []).map((f: any) => {
            const p = Array.isArray(f.profiles) ? f.profiles[0] : f.profiles
            return (
              <div key={`follow-${f.created_at}`} className="border-b border-[#333333] px-4 py-3 text-sm">
                <Link href={`/${p?.username}`} className="text-[#ff6600] hover:underline">
                  @{p?.username}
                </Link>
                <span className="text-[#888880]"> followed you</span>
              </div>
            )
          })}
          {(likes ?? []).map((l: any) => {
            const post = Array.isArray(l.posts) ? l.posts[0] : l.posts
            const p = Array.isArray(l.profiles) ? l.profiles[0] : l.profiles
            if (!post || !p) return null
            return (
              <div key={l.id} className="border-b border-[#333333] px-4 py-3 text-sm">
                <Link href={`/${p.username}`} className="text-[#ff6600] hover:underline">
                  @{p.username}
                </Link>
                <span className="text-[#888880]"> liked · </span>
                <Link href={`/post/${post.id}`} className="text-[#888880] hover:text-[#ff6600] transition-colors">
                  {post.content.slice(0, 60)}{post.content.length > 60 ? '…' : ''}
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
