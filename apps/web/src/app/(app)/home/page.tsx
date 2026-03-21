import { unstable_noStore as noStore } from 'next/cache'
import type { Metadata } from 'next'
import { createServerClient } from '@solbook/shared/supabase'
import { requireSession } from '@/lib/auth'
import { PostComposer } from '@/components/posts/PostComposer'
import { PostCard } from '@/components/posts/PostCard'

export const metadata: Metadata = { title: 'Home' }

export default async function HomePage() {
  noStore()
  const session = await requireSession()
  const supabase = createServerClient()

  const { data: posts } = await supabase
    .from('posts')
    .select(`
      id,
      content,
      created_at,
      profiles!posts_user_id_fkey ( username, display_name ),
      likes ( id, user_id )
    `)
    .order('created_at', { ascending: false })
    .limit(50)

  const feed = (posts ?? []).map((post) => {
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

  return (
    <div className="max-w-xl mx-auto">
      <div className="sticky top-0 bg-[#1c1c1c] border-b border-[#333333] px-4 py-3">
        <h1 className="text-sm font-bold text-[#ff6600]">home</h1>
      </div>
      <PostComposer />
      {feed.length === 0 ? (
        <p className="text-[#888880] text-center py-12">No posts yet. Be the first!</p>
      ) : (
        feed.map((post) => <PostCard key={post.id} {...post} />)
      )}
    </div>
  )
}
