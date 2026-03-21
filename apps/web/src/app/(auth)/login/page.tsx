import type { Metadata } from 'next'
import Link from 'next/link'
import LoginForm from './LoginForm'

export const metadata: Metadata = { title: 'Sign in' }

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="max-w-sm w-full space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">Sign in to solbook</h1>
          <p className="text-zinc-500 text-sm">Use your passkey to authenticate.</p>
        </div>
        <LoginForm />
        <p className="text-center text-sm text-zinc-600">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-white hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </main>
  )
}
