'use client'

import { useState, useRef } from 'react'
import { createPost } from '@/actions/posts'

export function PostComposer() {
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const remaining = 280 - content.length
  const overLimit = remaining < 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim() || overLimit) return
    setLoading(true)
    setError('')
    const result = await createPost(content)
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
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onPaste={(e) => e.preventDefault()}
        placeholder="what's on your mind?"
        rows={3}
        className="w-full bg-transparent text-[var(--color-text)] placeholder:text-[var(--color-muted)] resize-none focus:outline-none leading-relaxed"
        style={{ fontSize: '16px' }}
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
          {loading ? 'posting…' : 'post'}
        </button>
      </div>
    </form>
  )
}
