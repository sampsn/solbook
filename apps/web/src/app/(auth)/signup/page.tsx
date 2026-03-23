'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signUp } from '@/actions/auth'
import { createProfile } from '@/actions/profiles'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const signUpResult = await signUp(email, password)
    if (signUpResult.error) {
      setError(signUpResult.error)
      setLoading(false)
      return
    }

    const profileResult = await createProfile(signUpResult.userId!, username, displayName)
    if (profileResult?.error) {
      setError(profileResult.error)
      setLoading(false)
    }
    // createProfile redirects to /home on success
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="max-w-sm w-full space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">Join solbook</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-[var(--color-text)]">Display name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
              required
              placeholder="Your name"
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:outline-none focus:border-[var(--color-accent)]"
          style={{ fontSize: '16px' }}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-[var(--color-text)]">Username</label>
            <div className="flex items-center bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden focus-within:border-[var(--color-accent)]">
              <span className="px-3 py-2 text-sm text-[var(--color-muted)]">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                maxLength={20}
                pattern="[a-zA-Z0-9_]{3,20}"
                required
                placeholder="username"
                className="flex-1 bg-transparent px-0 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:outline-none"
                style={{ fontSize: '16px' }}
              />
            </div>
          </div>
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
              minLength={6}
              required
              placeholder="Min. 6 characters"
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
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-sm text-[var(--color-muted)]">
          Already have an account?{' '}
          <Link href="/login" className="text-[var(--color-accent)] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
