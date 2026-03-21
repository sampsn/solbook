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
    <form onSubmit={handleSubmit} className="border-b border-zinc-800 px-4 py-4">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onPaste={(e) => e.preventDefault()}
        placeholder="What's on your mind?"
        rows={3}
        className="w-full bg-transparent text-white placeholder:text-zinc-600 resize-none focus:outline-none text-base"
      />
      {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
      <div className="flex items-center justify-between mt-2">
        <span className={`text-sm ${overLimit ? 'text-red-400' : 'text-zinc-500'}`}>
          {remaining}
        </span>
        <button
          type="submit"
          disabled={loading || !content.trim() || overLimit}
          className="bg-white text-black text-sm font-semibold px-5 py-1.5 rounded-full disabled:opacity-40 hover:bg-zinc-200 transition-colors"
        >
          {loading ? 'Posting…' : 'Post'}
        </button>
      </div>
    </form>
  )
}
