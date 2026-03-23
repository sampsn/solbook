import { unstable_noStore as noStore } from 'next/cache'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createServerClient } from '@solbook/shared/supabase'
import { requireSession } from '@/lib/auth'
import { PageHeader } from '@/components/nav/PageHeader'
import { MarkAlertsSeen } from '@/components/nav/MarkAlertsSeen'

export const metadata: Metadata = { title: 'Alerts' }

export default async function NotificationsPage() {
  noStore()
  const session = await requireSession()
  const supabase = createServerClient()

  // Mark alerts as seen
  await supabase
    .from('profiles')
    .update({ alerts_last_seen_at: new Date().toISOString() })
    .eq('id', session.userId)

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

  type AlertItem =
    | { kind: 'follow'; createdAt: string; username: string; key: string }
    | { kind: 'like'; createdAt: string; username: string; postId: string; postContent: string; key: string }

  const alerts: AlertItem[] = [
    ...(newFollowers ?? []).map((f: any) => {
      const p = Array.isArray(f.profiles) ? f.profiles[0] : f.profiles
      return { kind: 'follow' as const, createdAt: f.created_at, username: p?.username ?? '', key: `follow-${f.created_at}` }
    }),
    ...(likes ?? []).flatMap((l: any) => {
      const post = Array.isArray(l.posts) ? l.posts[0] : l.posts
      const p = Array.isArray(l.profiles) ? l.profiles[0] : l.profiles
      if (!post || !p) return []
      return [{ kind: 'like' as const, createdAt: l.created_at, username: p.username, postId: post.id, postContent: post.content, key: l.id }]
    }),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return (
    <div className="max-w-xl mx-auto">
      <MarkAlertsSeen />
      <PageHeader title="alerts" showBack />

      {alerts.length === 0 ? (
        <p className="text-[var(--color-muted)] text-center py-12 text-sm">no alerts yet. when someone likes your posts or follows you, you'll see it here.</p>
      ) : (
        <div>
          {alerts.map((alert) => (
            <div key={alert.key} className="border-b border-[var(--color-border)] px-4 py-3 text-sm">
              <Link href={`/${alert.username}`} className="text-[var(--color-accent)] hover:underline">
                @{alert.username}
              </Link>
              {alert.kind === 'follow' ? (
                <span className="text-[var(--color-muted)]"> followed you</span>
              ) : (
                <>
                  <span className="text-[var(--color-muted)]"> liked · </span>
                  <Link href={`/post/${alert.postId}`} className="text-[var(--color-muted)] hover:text-[var(--color-accent)] transition-colors">
                    {alert.postContent.slice(0, 60)}{alert.postContent.length > 60 ? '…' : ''}
                  </Link>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
