import { unstable_noStore as noStore } from 'next/cache'
import type { Metadata } from 'next'
import { createServerClient } from '@solbook/shared/supabase'
import { requireSession } from '@/lib/auth'
import { PostComposer } from '@/components/posts/PostComposer'
import { PostCard } from '@/components/posts/PostCard'
import { PageHeader } from '@/components/nav/PageHeader'

export const metadata: Metadata = { title: 'Home' }

const PAGE_SIZE = 20

interface Props {
  searchParams: Promise<{ cursor?: string }>
}

export default async function HomePage({ searchParams }: Props) {
  noStore()
  const session = await requireSession()
  const supabase = createServerClient()
  const { cursor } = await searchParams

  const { data: follows } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', session.userId)

  const followingIds = [session.userId, ...(follows ?? []).map((f) => f.following_id)]

  let query = supabase
    .from('posts')
    .select(`
      id,
      content,
      created_at,
      profiles!posts_user_id_fkey ( username, display_name ),
      likes ( id, user_id )
    `)
    .in('user_id', followingIds)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(PAGE_SIZE + 1)

  if (cursor) {
    const [cursorCreatedAt] = Buffer.from(cursor, 'base64url').toString().split('|')
    query = query.lt('created_at', cursorCreatedAt)
  }

  const { data: posts } = await query

  const hasMore = (posts ?? []).length > PAGE_SIZE
  const pagePosts = (posts ?? []).slice(0, PAGE_SIZE)

  const feed = pagePosts.map((post) => {
    const profile = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles
    const likes = post.likes ?? []
    return {
      id: post.id,
      content: post.content,
      createdAt: post.created_at,
      author: {
        username: profile?.username ?? 'unknown',
        displayName: profile?.display_name ?? 'Unknown',
      },
      likeCount: likes.length,
      likedByMe: likes.some((l: { user_id: string }) => l.user_id === session.userId),
    }
  })

  const lastPost = pagePosts[pagePosts.length - 1]
  const nextCursor =
    hasMore && lastPost
      ? Buffer.from(`${lastPost.created_at}|${lastPost.id}`).toString('base64url')
      : null

  return (
    <div className="max-w-xl mx-auto">
      <PageHeader title="home" />
      <PostComposer />
      {feed.length === 0 ? (
        <p className="text-[#888880] text-center py-12 text-sm">
          no posts yet. follow people to see their posts here.
        </p>
      ) : (
        <>
          {feed.map((post) => <PostCard key={post.id} {...post} />)}
          {nextCursor && (
            <div className="border-t border-[#333333] px-4 py-3">
              <a href={`/home?cursor=${nextCursor}`} className="text-sm text-[#888880] hover:text-[#ff6600] transition-colors">
                load more →
              </a>
            </div>
          )}
        </>
      )}
    </div>
  )
}
