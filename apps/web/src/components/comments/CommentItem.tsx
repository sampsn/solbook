'use client'

import Link from 'next/link'
import { useState, useOptimistic, useTransition } from 'react'
import { toggleCommentLike } from '@/actions/comments'
import { ReplyComposer } from './ReplyComposer'
import type { CommentNode } from '@solbook/shared/types'

const MAX_VISUAL_DEPTH = 7
const INDENT_PX = 16

interface Props {
  node: CommentNode
  postId: string
  userId: string | null
  depth: number
  isCollapsed: boolean
  onToggleCollapse: () => void
  replyCount: number
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  return `${days}d`
}

export function CommentItem({ node, postId, userId, depth, isCollapsed, onToggleCollapse, replyCount }: Props) {
  const [showReply, setShowReply] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [optimistic, updateOptimistic] = useOptimistic(
    { liked: node.liked_by_me, count: node.like_count },
    (state, liked: boolean) => ({ liked, count: state.count + (liked ? 1 : -1) }),
  )

  const visualDepth = Math.min(depth, MAX_VISUAL_DEPTH)

  function handleLike() {
    if (!userId) return
    startTransition(async () => {
      updateOptimistic(!optimistic.liked)
      await toggleCommentLike(node.id, postId)
    })
  }

  return (
    <div style={{ paddingLeft: visualDepth * INDENT_PX }}>
      <div
        id={`comment-${node.id}`}
        className="border-b border-[var(--color-border)] px-4 py-2"
      >
        {/* Meta row */}
        <div className="flex items-center gap-2 text-xs mb-1">
          <button
            onClick={onToggleCollapse}
            className="text-[var(--color-muted)] hover:text-[var(--color-accent)] transition-colors font-mono leading-none"
            aria-label={isCollapsed ? 'expand' : 'collapse'}
          >
            {isCollapsed ? '[+]' : '[-]'}
          </button>
          <Link
            href={`/${node.profile.username}`}
            className="font-bold hover:text-[var(--color-accent)] transition-colors"
            style={{ color: 'var(--color-text-strong)' }}
          >
            {node.profile.username}
          </Link>
          <span style={{ color: 'var(--color-muted)' }}>
            {formatTimeAgo(node.created_at)}
          </span>
          {isCollapsed && replyCount > 0 && (
            <span style={{ color: 'var(--color-muted)' }}>· {replyCount} {replyCount === 1 ? 'reply' : 'replies'}</span>
          )}
        </div>

        {/* Content + actions (hidden when collapsed) */}
        {!isCollapsed && (
          <>
            <p
              className="text-sm leading-relaxed whitespace-pre-wrap break-words mb-2"
              style={{ color: 'var(--color-text-strong)' }}
            >
              {node.content}
            </p>
            <div className="flex gap-4 text-xs" style={{ color: 'var(--color-muted)' }}>
              {userId && (
                <button
                  onClick={handleLike}
                  disabled={isPending}
                  className={`transition-colors hover:text-[var(--color-accent)] ${optimistic.liked ? 'text-[var(--color-accent)]' : ''}`}
                >
                  {optimistic.liked ? '▲' : '△'} {optimistic.count > 0 ? optimistic.count : 'like'}
                </button>
              )}
              {userId && (
                <button
                  onClick={() => setShowReply(s => !s)}
                  className="hover:text-[var(--color-accent)] transition-colors"
                >
                  reply
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Inline reply composer */}
      {!isCollapsed && showReply && (
        <ReplyComposer
          postId={postId}
          parentId={node.id}
          parentUsername={node.profile.username}
          onCancel={() => setShowReply(false)}
        />
      )}
    </div>
  )
}
