import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="max-w-sm w-full space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-[var(--color-brand)]">solbook</h1>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-strong)' }}>
            A human-only, text-based social network.
          </p>
        </div>

        <div className="space-y-2">
          <Link
            href="/signup"
            className="block w-full text-center bg-[var(--color-brand)] font-bold py-2 px-4 hover:opacity-90 transition-opacity text-sm"
            style={{ color: '#073642' }}
          >
            create account
          </Link>
          <Link
            href="/login"
            className="block w-full text-center border border-[var(--color-border)] py-2 px-4 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors text-sm"
            style={{ color: 'var(--color-text-strong)' }}
          >
            sign in
          </Link>
        </div>

        <p className="text-[var(--color-muted)] text-xs">
          Human verification required at login and signup.
        </p>
      </div>
    </main>
  )
}
