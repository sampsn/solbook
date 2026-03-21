import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Create account' }

export default function SignupPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="max-w-sm w-full space-y-6">
        <h1 className="text-2xl font-bold text-center">Create your account</h1>
        <p className="text-zinc-500 text-center text-sm">Auth coming soon.</p>
      </div>
    </main>
  )
}
