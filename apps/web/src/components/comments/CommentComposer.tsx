'use client'

import { useState } from 'react'
import { createComment } from '@/actions/comments'
import { validateComment } from '@solbook/shared/validation'

interface Props {
  postId: string
}

export function CommentComposer({ postId }: Props) {
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
    const result = await createComment(postId, null, content)
    if (result.error) {
      setError(result.error)
    } else {
      setContent('')
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="border-b border-[var(--color-border)] px-4 py-3">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onPaste={(e) => e.preventDefault()}
        placeholder="add a comment…"
        rows={3}
        className="w-full bg-transparent placeholder:text-[var(--color-muted)] resize-none focus:outline-none leading-relaxed"
        style={{ color: 'var(--color-text-strong)', fontSize: '14px' }}
      />
      {error && <p className="text-[var(--color-danger)] text-xs mb-1">{error}</p>}
      <div className="flex items-center justify-between">
        <span className={`text-xs ${overLimit ? 'text-[var(--color-danger)]' : 'text-[var(--color-muted)]'}`}>
          {remaining}
        </span>
        <button
          type="submit"
          disabled={loading || !content.trim() || overLimit}
          className="bg-[var(--color-accent)] text-[var(--color-bg)] text-xs font-bold px-4 py-1 disabled:opacity-40 hover:bg-[var(--color-accent-hover)] transition-colors"
        >
          {loading ? 'posting…' : 'comment'}
        </button>
      </div>
    </form>
  )
}
