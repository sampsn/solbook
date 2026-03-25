import { unstable_noStore as noStore } from 'next/cache'
import type { Metadata } from 'next'
import Link from 'next/link'
import { createServerClient } from '@solbook/shared/supabase'
import { requireSession } from '@/lib/auth'
import { PostCard } from '@/components/posts/PostCard'
import { PageHeader } from '@/components/nav/PageHeader'
import { SearchBar } from '@/components/search/SearchBar'

export const metadata: Metadata = { title: 'Search' }

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  noStore()
  const session = await requireSession()
  const supabase = createServerClient()
  const { q } = await searchParams
  const query = q?.trim() ?? ''

  let profiles: any[] = []
  let posts: any[] = []
  let comments: any[] = []

  if (query) {
    const [profilesResult, postsResult, commentsResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, username, display_name, bio')
        .textSearch('fts_doc', query, { type: 'plain', config: 'english' })
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('posts')
        .select(`
          id, content, created_at,
          profiles!posts_user_id_fkey ( username, display_name ),
          likes ( id, user_id ),
          comments ( count )
        `)
        .textSearch('fts_doc', query, { type: 'plain', config: 'english' })
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('comments')
        .select(`
          id, content, created_at, post_id,
          profiles!comments_user_id_fkey ( username, display_name ),
          posts!comments_post_id_fkey ( content )
        `)
        .textSearch('fts_doc', query, { type: 'plain', config: 'english' })
        .order('created_at', { ascending: false })
        .limit(20),
    ])

    profiles = profilesResult.data ?? []

    const rawPosts = postsResult.data ?? []
    posts = rawPosts.map((post: any) => {
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
        likedByMe: likes.some((l: any) => l.user_id === session.userId),
        commentCount: (post.comments as any)?.[0]?.count ?? 0,
      }
    })

    comments = (commentsResult.data ?? []).map((c: any) => {
      const profile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles
      const post = Array.isArray(c.posts) ? c.posts[0] : c.posts
      return {
        id: c.id,
        content: c.content,
        createdAt: c.created_at,
        postId: c.post_id,
        postContent: post?.content ?? null,
        username: profile?.username ?? 'unknown',
        displayName: profile?.display_name ?? 'Unknown',
      }
    })
  }

  const noResults = query && profiles.length === 0 && posts.length === 0 && comments.length === 0

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader title="search" />

      <div className="px-4 py-3 border-b border-[var(--color-border)]">
        <SearchBar initialQuery={query} />
      </div>

      {!query && (
        <p className="text-[var(--color-muted)] text-center py-12 text-sm">
          search for people, posts, and comments
        </p>
      )}

      {noResults && (
        <p className="text-[var(--color-muted)] text-center py-12 text-sm">
          no results for &ldquo;{query}&rdquo;
        </p>
      )}

      {profiles.length > 0 && (
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-muted)] px-4 pt-4 pb-2">
            People
          </h2>
          {profiles.map((p: any) => (
            <Link
              key={p.id}
              href={`/${p.username}`}
              className="flex flex-col px-4 py-3 border-b border-[var(--color-border)] hover:bg-[var(--color-surface)] transition-colors"
            >
              <span className="text-sm font-bold" style={{ color: 'var(--color-heading)' }}>
                {p.display_name}
              </span>
              <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
                @{p.username}
              </span>
              {p.bio && (
                <span className="text-xs mt-1" style={{ color: 'var(--color-text-strong)' }}>
                  {p.bio}
                </span>
              )}
            </Link>
          ))}
        </section>
      )}

      {posts.length > 0 && (
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-muted)] px-4 pt-4 pb-2">
            Posts
          </h2>
          {posts.map((post: any) => (
            <PostCard key={post.id} {...post} />
          ))}
        </section>
      )}

      {comments.length > 0 && (
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-muted)] px-4 pt-4 pb-2">
            Comments
          </h2>
          {comments.map((c: any) => (
            <Link
              key={c.id}
              href={`/post/${c.postId}#comment-${c.id}`}
              className="flex flex-col px-4 py-3 border-b border-[var(--color-border)] hover:bg-[var(--color-surface)] transition-colors"
            >
              {c.postContent && (
                <p className="text-xs px-2 py-1 mb-2 border-l-2 border-[var(--color-border)] truncate" style={{ color: 'var(--color-muted)' }}>
                  {c.postContent.slice(0, 80)}{c.postContent.length > 80 ? '…' : ''}
                </p>
              )}
              <div className="text-xs text-[var(--color-muted)] mb-1">
                <span className="font-bold" style={{ color: 'var(--color-heading)' }}>{c.displayName}</span>
                {' '}
                <span>(@{c.username})</span>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words" style={{ color: 'var(--color-text-strong)' }}>
                {c.content}
              </p>
            </Link>
          ))}
        </section>
      )}
    </div>
  )
}
