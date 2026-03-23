import type { Metadata } from 'next'
import Link from 'next/link'
import LoginForm from './LoginForm'

export const metadata: Metadata = { title: 'Sign in' }

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="max-w-sm w-full space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-strong)' }}>Sign in to solbook</h1>
          <p className="text-[var(--color-muted)] text-sm">Sign in with your email and password.</p>
        </div>
        <LoginForm />
        <p className="text-center text-sm text-[var(--color-muted)]">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-[var(--color-accent)] hover:underline">
            Create one
          </Link>
        </p>

      </div>
    </main>
  )
}
