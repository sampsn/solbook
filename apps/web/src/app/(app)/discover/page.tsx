import { unstable_noStore as noStore } from 'next/cache'
import type { Metadata } from 'next'
import { createServerClient } from '@solbook/shared/supabase'
import { requireSession } from '@/lib/auth'
import { PostCard } from '@/components/posts/PostCard'
import { PageHeader } from '@/components/nav/PageHeader'

export const metadata: Metadata = { title: 'Discover' }

export default async function DiscoverPage() {
  noStore()
  const session = await requireSession()
  const supabase = createServerClient()

  const { data: rows } = await supabase.rpc('get_discover_feed', {
    window_hours: 48,
    page_size: 20,
  })

  const postIds = (rows ?? []).map((r: any) => r.id)
  const [{ data: myLikes }, { data: postCounts }] = await Promise.all([
    postIds.length > 0
      ? supabase
          .from('likes')
          .select('post_id')
          .eq('user_id', session.userId)
          .in('post_id', postIds)
      : Promise.resolve({ data: [] }),
    postIds.length > 0
      ? supabase
          .from('posts')
          .select('id, comments(count)')
          .in('id', postIds)
      : Promise.resolve({ data: [] }),
  ])

  const likedSet = new Set((myLikes ?? []).map((l: any) => l.post_id))
  const commentCountMap = new Map(
    (postCounts ?? []).map((p: any) => [p.id, (p.comments as any)?.[0]?.count ?? 0])
  )

  const feed = (rows ?? []).map((r: any) => ({
    id: r.id,
    content: r.content,
    createdAt: r.created_at,
    author: {
      username: r.username,
      displayName: r.display_name,
    },
    likeCount: Number(r.like_count),
    likedByMe: likedSet.has(r.id),
    commentCount: commentCountMap.get(r.id) ?? 0,
  }))

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader title="discover" />
      {feed.length === 0 ? (
        <p className="text-[var(--color-muted)] text-center py-12 text-sm">no trending posts yet.</p>
      ) : (
        feed.map((post: any) => <PostCard key={post.id} {...post} />)
      )}
    </div>
  )
}
