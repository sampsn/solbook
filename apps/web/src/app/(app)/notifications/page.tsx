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

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

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
    .gte('created_at', sevenDaysAgo)
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
    .gte('created_at', sevenDaysAgo)
    .order('created_at', { ascending: false })
    .limit(20)

  // Comments on my posts (top-level only)
  const { data: commentsOnMyPosts } = await supabase
    .from('comments')
    .select(`
      id, created_at, content, post_id,
      profiles!comments_user_id_fkey ( username, display_name ),
      posts!comments_post_id_fkey ( user_id )
    `)
    .eq('posts.user_id', session.userId)
    .is('parent_id', null)
    .neq('user_id', session.userId)
    .gte('created_at', sevenDaysAgo)
    .order('created_at', { ascending: false })
    .limit(50)

  // Replies to my comments
  const { data: repliesToMyComments } = await supabase
    .from('comments')
    .select(`
      id, created_at, content, post_id,
      profiles!comments_user_id_fkey ( username, display_name ),
      comments!comments_parent_id_fkey ( user_id )
    `)
    .eq('comments.user_id', session.userId)
    .neq('user_id', session.userId)
    .not('parent_id', 'is', null)
    .gte('created_at', sevenDaysAgo)
    .order('created_at', { ascending: false })
    .limit(50)

  // Likes on my comments
  const { data: commentLikes } = await supabase
    .from('comment_likes')
    .select(`
      id, created_at,
      comments!comment_likes_comment_id_fkey ( id, content, post_id, user_id ),
      profiles!comment_likes_user_id_fkey ( username, display_name )
    `)
    .eq('comments.user_id', session.userId)
    .neq('user_id', session.userId)
    .gte('created_at', sevenDaysAgo)
    .order('created_at', { ascending: false })
    .limit(50)

  type AlertItem =
    | { kind: 'follow'; createdAt: string; username: string; key: string }
    | { kind: 'like'; createdAt: string; username: string; postId: string; postContent: string; key: string }
    | { kind: 'comment_on_post'; createdAt: string; username: string; commentId: string; postId: string; commentContent: string; key: string }
    | { kind: 'reply_to_comment'; createdAt: string; username: string; commentId: string; postId: string; replyContent: string; key: string }
    | { kind: 'comment_like'; createdAt: string; username: string; commentId: string; postId: string; commentContent: string; key: string }

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
    ...(commentsOnMyPosts ?? []).flatMap((c: any) => {
      const p = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles
      if (!p) return []
      return [{ kind: 'comment_on_post' as const, createdAt: c.created_at, username: p.username, commentId: c.id, postId: c.post_id, commentContent: c.content, key: `comment-on-post-${c.id}` }]
    }),
    ...(repliesToMyComments ?? []).flatMap((c: any) => {
      const p = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles
      if (!p) return []
      return [{ kind: 'reply_to_comment' as const, createdAt: c.created_at, username: p.username, commentId: c.id, postId: c.post_id, replyContent: c.content, key: `reply-${c.id}` }]
    }),
    ...(commentLikes ?? []).flatMap((l: any) => {
      const comment = Array.isArray(l.comments) ? l.comments[0] : l.comments
      const p = Array.isArray(l.profiles) ? l.profiles[0] : l.profiles
      if (!comment || !p) return []
      return [{ kind: 'comment_like' as const, createdAt: l.created_at, username: p.username, commentId: comment.id, postId: comment.post_id, commentContent: comment.content, key: `comment-like-${l.id}` }]
    }),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return (
    <div className="max-w-2xl mx-auto">
      <MarkAlertsSeen />
      <PageHeader title="alerts" showBack />

      {alerts.length === 0 ? (
        <p className="text-[var(--color-muted)] text-center py-12 text-sm">no alerts yet. when someone likes your posts or follows you, you'll see it here.</p>
      ) : (
        <div>
          {alerts.map((alert) => (
            <div key={alert.key} className="border-b border-[var(--color-border)] px-4 py-3 text-sm">
              <Link href={`/${alert.username}`} className="hover:underline" style={{ color: 'var(--color-text-strong)' }}>
                @{alert.username}
              </Link>
              {alert.kind === 'follow' ? (
                <span style={{ color: 'var(--color-muted)' }}> followed you</span>
              ) : alert.kind === 'like' ? (
                <>
                  <span style={{ color: 'var(--color-muted)' }}> liked · </span>
                  <Link href={`/post/${alert.postId}`} className="transition-colors hover:text-[var(--color-accent)]" style={{ color: 'var(--color-text-strong)' }}>
                    {alert.postContent.slice(0, 60)}{alert.postContent.length > 60 ? '…' : ''}
                  </Link>
                </>
              ) : alert.kind === 'comment_on_post' ? (
                <>
                  <span style={{ color: 'var(--color-muted)' }}> commented · </span>
                  <Link href={`/post/${alert.postId}#comment-${alert.commentId}`} className="transition-colors hover:text-[var(--color-accent)]" style={{ color: 'var(--color-text-strong)' }}>
                    {alert.commentContent.slice(0, 60)}{alert.commentContent.length > 60 ? '…' : ''}
                  </Link>
                </>
              ) : alert.kind === 'reply_to_comment' ? (
                <>
                  <span style={{ color: 'var(--color-muted)' }}> replied · </span>
                  <Link href={`/post/${alert.postId}#comment-${alert.commentId}`} className="transition-colors hover:text-[var(--color-accent)]" style={{ color: 'var(--color-text-strong)' }}>
                    {alert.replyContent.slice(0, 60)}{alert.replyContent.length > 60 ? '…' : ''}
                  </Link>
                </>
              ) : (
                <>
                  <span style={{ color: 'var(--color-muted)' }}> liked your comment · </span>
                  <Link href={`/post/${alert.postId}#comment-${alert.commentId}`} className="transition-colors hover:text-[var(--color-accent)]" style={{ color: 'var(--color-text-strong)' }}>
                    {alert.commentContent.slice(0, 60)}{alert.commentContent.length > 60 ? '…' : ''}
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
