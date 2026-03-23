import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createServerClient } from '@solbook/shared/supabase'
import { getSession } from '@/lib/auth'
import { PostCard } from '@/components/posts/PostCard'

export const metadata: Metadata = { title: 'Post' }

interface Props {
  params: Promise<{ id: string }>
}

export default async function PostPage({ params }: Props) {
  const { id } = await params
  const session = await getSession()
  const supabase = createServerClient()

  const { data: post } = await supabase
    .from('posts')
    .select(`
      id,
      content,
      created_at,
      profiles!posts_user_id_fkey ( username, display_name ),
      likes ( id, user_id )
    `)
    .eq('id', id)
    .single()

  if (!post) notFound()

  const profile = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles
  const likes = post.likes ?? []

  return (
    <div className="max-w-2xl mx-auto">
      <div className="border-b border-[var(--color-border)] px-4 py-3">
        <Link href="/home" className="text-xs text-[var(--color-muted)] hover:text-[var(--color-accent)] transition-colors">
          ← back
        </Link>
      </div>
      <PostCard
        id={post.id}
        content={post.content}
        createdAt={post.created_at}
        author={{
          username: profile?.username ?? 'unknown',
          displayName: profile?.display_name ?? 'Unknown',
        }}
        likeCount={likes.length}
        likedByMe={likes.some((l: { user_id: string }) => l.user_id === session?.userId)}
      />
    </div>
  )
}
