'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toggleLike } from '@/actions/posts'

interface PostCardProps {
  id: string
  content: string
  createdAt: string
  author: {
    username: string
    displayName: string
  }
  likeCount: number
  likedByMe: boolean
  commentCount?: number
  disableLink?: boolean
}

export function PostCard({ id, content, createdAt, author, likeCount, likedByMe, commentCount, disableLink }: PostCardProps) {
  const router = useRouter()
  const toggleLikeForPost = toggleLike.bind(null, id)
  const timeAgo = formatTimeAgo(createdAt)

  return (
    <article
      className={`border-b border-[var(--color-border)] px-4 py-3 hover:bg-[var(--color-surface)] transition-colors ${disableLink ? '' : 'cursor-pointer'}`}
      onClick={disableLink ? undefined : () => router.push(`/post/${id}`)}
    >
      <div className="text-xs text-[var(--color-muted)] mb-1">
        <Link
          href={`/${author.username}`}
          className="font-bold hover:text-[var(--color-accent)] transition-colors"
          style={{ color: 'var(--color-heading)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {author.displayName}
        </Link>
        {' '}
        <Link
          href={`/${author.username}`}
          className="hover:text-[var(--color-accent)] transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          (@{author.username})
        </Link>
        {' · '}
        <span>{timeAgo}</span>
      </div>

      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words mb-2" style={{ color: 'var(--color-text-strong)' }}>
        {content}
      </p>

      <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
        <form action={toggleLikeForPost} className="w-fit">
          <button
            type="submit"
            className={`text-xs transition-colors cursor-pointer p-2 -m-2 ${
              likedByMe ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted)] hover:text-[var(--color-accent)]'
            }`}
          >
            {likedByMe ? '▲' : '△'} {likeCount > 0 ? likeCount : 'like'}
          </button>
        </form>
        {typeof commentCount === 'number' && (
          <span className="text-xs text-[var(--color-muted)]">
            💬 {commentCount > 0 ? commentCount : ''}
          </span>
        )}
      </div>
    </article>
  )
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
