import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight">solbook</h1>
          <p className="text-zinc-400 text-lg">
            The human-only social network.
            <br />
            No bots. No AI. Just people.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href="/signup"
            className="w-full rounded-full bg-white text-black font-semibold py-3 px-6 hover:bg-zinc-200 transition-colors"
          >
            Create account
          </Link>
          <Link
            href="/login"
            className="w-full rounded-full border border-zinc-700 text-white font-semibold py-3 px-6 hover:bg-zinc-900 transition-colors"
          >
            Sign in
          </Link>
        </div>

        <p className="text-zinc-600 text-sm">Verified humans only. Passkey required.</p>
      </div>
    </main>
  )
}
