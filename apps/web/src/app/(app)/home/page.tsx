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
      <div className="sticky top-0 bg-black/80 backdrop-blur border-b border-zinc-800 px-4 py-3">
        <h1 className="text-lg font-bold">Home</h1>
      </div>
      <PostComposer />
      {feed.length === 0 ? (
        <p className="text-zinc-500 text-center py-12">No posts yet. Be the first!</p>
      ) : (
        feed.map((post) => <PostCard key={post.id} {...post} />)
      )}
    </div>
  )
}
