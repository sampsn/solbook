import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createServerClient } from '@solbook/shared/supabase'
import { getSession } from '@/lib/auth'
import { PostCard } from '@/components/posts/PostCard'
import { PageHeader } from '@/components/nav/PageHeader'
import { toggleFollow } from '@/actions/follows'

interface Props {
  params: Promise<{ username: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  return { title: `@${username}` }
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params
  const session = await getSession()
  const supabase = createServerClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, display_name, bio, created_at')
    .eq('username', username)
    .single()

  if (!profile) notFound()

  const isOwnProfile = session?.userId === profile.id

  const [{ count: followerCount }, { count: followingCount }, followRow] = await Promise.all([
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', profile.id),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profile.id),
    session && !isOwnProfile
      ? supabase
          .from('follows')
          .select('follower_id')
          .eq('follower_id', session.userId)
          .eq('following_id', profile.id)
          .single()
      : Promise.resolve({ data: null }),
  ])

  const isFollowing = !!followRow.data

  const { data: posts } = await supabase
    .from('posts')
    .select(`
      id,
      content,
      created_at,
      profiles!posts_user_id_fkey ( username, display_name ),
      likes ( id, user_id )
    `)
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const feed = (posts ?? []).map((post) => {
    const p = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles
    const likes = post.likes ?? []
    return {
      id: post.id,
      content: post.content,
      createdAt: post.created_at,
      author: {
        username: p?.username ?? username,
        displayName: p?.display_name ?? profile.display_name,
      },
      likeCount: likes.length,
      likedByMe: likes.some((l: { user_id: string }) => l.user_id === session?.userId),
    }
  })

  const followAction = toggleFollow.bind(null, profile.id)

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader title={`@${username}`} />
      <div className="border-b border-[var(--color-border)] px-4 py-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-bold" style={{ color: 'var(--color-text-strong)' }}>{profile.display_name}</h1>
            <p className="text-[var(--color-accent-alt)] text-sm">@{profile.username}</p>
            {profile.bio && <p className="text-sm mt-2 text-[var(--color-text)]">{profile.bio}</p>}
            <div className="flex gap-4 mt-3 text-xs text-[var(--color-muted)]">
              <span><span className="text-[var(--color-text)] font-bold">{followerCount ?? 0}</span> followers</span>
              <span><span className="text-[var(--color-text)] font-bold">{followingCount ?? 0}</span> following</span>
            </div>
          </div>
          {isOwnProfile ? (
            <Link href="/settings" className="text-xs hover:text-[var(--color-accent)] transition-colors" style={{ color: 'var(--color-text-strong)' }}>
              settings →
            </Link>
          ) : session && (
            <form action={followAction}>
              <button
                type="submit"
                className={`text-xs px-3 py-1 border transition-colors ${
                  isFollowing
                    ? 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-danger)] hover:text-[var(--color-danger)]'
                    : 'border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-[var(--color-bg)]'
                }`}
              >
                {isFollowing ? 'unfollow' : 'follow'}
              </button>
            </form>
          )}
        </div>
      </div>

      {feed.length === 0 ? (
        <p className="text-[var(--color-muted)] text-center py-12 text-sm">no posts yet.</p>
      ) : (
        feed.map((post) => <PostCard key={post.id} {...post} />)
      )}
    </div>
  )
}
