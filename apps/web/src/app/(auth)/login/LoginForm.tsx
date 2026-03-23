'use client'

import { useState } from 'react'
import { signIn } from '@/actions/auth'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await signIn(email, password)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
    // signIn redirects to /home on success
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label className="text-sm font-medium text-[var(--color-text)]">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="you@example.com"
          className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:outline-none focus:border-[var(--color-accent)]"
          style={{ fontSize: '16px' }}
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium text-[var(--color-text)]">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="••••••••"
          className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:outline-none focus:border-[var(--color-accent)]"
          style={{ fontSize: '16px' }}
        />
      </div>
      {error && <p className="text-[var(--color-danger)] text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[var(--color-brand)] text-[var(--color-bg)] py-2 text-sm font-bold disabled:opacity-40 hover:opacity-90 transition-opacity"
      >
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
