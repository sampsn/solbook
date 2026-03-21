import type { Metadata } from 'next'
import Link from 'next/link'
import SignupFlow from './SignupFlow'

export const metadata: Metadata = { title: 'Create account' }

export default function SignupPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="max-w-sm w-full space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">Join solbook</h1>
          <p className="text-zinc-500 text-sm">Human-only. Passkey required.</p>
        </div>
        <SignupFlow />
        <p className="text-center text-sm text-zinc-600">
          Already have an account?{' '}
          <Link href="/login" className="text-white hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
