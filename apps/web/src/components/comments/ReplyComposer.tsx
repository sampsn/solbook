'use client'

import { useState } from 'react'
import { createComment } from '@/actions/comments'
import { validateComment } from '@solbook/shared/validation'

interface Props {
  postId: string
  parentId: string
  parentUsername: string
  onCancel: () => void
}

export function ReplyComposer({ postId, parentId, parentUsername, onCancel }: Props) {
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const remaining = 1000 - content.length
  const overLimit = remaining < 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validation = validateComment(content)
    if (!validation.valid) { setError(validation.error ?? ''); return }
    setLoading(true)
    setError('')
    const result = await createComment(postId, parentId, content)
    if (result.error) {
      setError(result.error)
    } else {
      onCancel()
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="pl-4 pr-4 py-2 border-b border-[var(--color-border)]">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onPaste={(e) => e.preventDefault()}
        placeholder={`reply to ${parentUsername}…`}
        rows={2}
        autoFocus
        className="w-full bg-transparent placeholder:text-[var(--color-muted)] resize-none focus:outline-none leading-relaxed"
        style={{ color: 'var(--color-text-strong)', fontSize: '13px' }}
      />
      {error && <p className="text-[var(--color-danger)] text-xs mb-1">{error}</p>}
      <div className="flex items-center justify-between">
        <span className={`text-xs ${overLimit ? 'text-[var(--color-danger)]' : 'text-[var(--color-muted)]'}`}>
          {remaining}
        </span>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
          >
            cancel
          </button>
          <button
            type="submit"
            disabled={loading || !content.trim() || overLimit}
            className="bg-[var(--color-accent)] text-[var(--color-bg)] text-xs font-bold px-3 py-1 disabled:opacity-40 hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            {loading ? 'replying…' : 'reply'}
          </button>
        </div>
      </div>
    </form>
  )
}
