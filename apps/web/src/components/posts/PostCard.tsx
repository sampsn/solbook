import Link from 'next/link'
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
}

export function PostCard({ id, content, createdAt, author, likeCount, likedByMe }: PostCardProps) {
  const toggleLikeForPost = toggleLike.bind(null, id)

  const timeAgo = formatTimeAgo(createdAt)

  return (
    <article className="border-b border-zinc-800 px-4 py-4 hover:bg-zinc-950 transition-colors">
      <div className="flex gap-3">
        <Link href={`/${author.username}`} className="shrink-0">
          <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-semibold">
            {author.displayName[0].toUpperCase()}
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <Link href={`/${author.username}`} className="font-semibold hover:underline truncate">
              {author.displayName}
            </Link>
            <Link href={`/${author.username}`} className="text-zinc-500 text-sm truncate">
              @{author.username}
            </Link>
            <span className="text-zinc-600 text-sm shrink-0">· {timeAgo}</span>
          </div>
          <Link href={`/post/${id}`}>
            <p className="mt-1 text-white whitespace-pre-wrap break-words">{content}</p>
          </Link>
          <form action={toggleLikeForPost} className="mt-3">
            <button
              type="submit"
              className={`flex items-center gap-1.5 text-sm transition-colors ${
                likedByMe ? 'text-red-400' : 'text-zinc-500 hover:text-red-400'
              }`}
            >
              <span>{likedByMe ? '♥' : '♡'}</span>
              <span>{likeCount > 0 ? likeCount : ''}</span>
            </button>
          </form>
        </div>
      </div>
    </article>
  )
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
