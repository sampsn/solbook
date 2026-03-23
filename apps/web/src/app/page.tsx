import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="max-w-sm w-full space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-[#ff6600]">solbook</h1>
          <p className="text-[#888880] text-sm leading-relaxed">
            A human-only, text-based social network.
          </p>
        </div>

        <div className="space-y-2">
          <Link
            href="/signup"
            className="block w-full text-center bg-[#ff6600] text-[#1c1c1c] font-bold py-2 px-4 hover:bg-[#ff7722] transition-colors text-sm"
          >
            create account
          </Link>
          <Link
            href="/login"
            className="block w-full text-center border border-[#333333] text-[#e8e6d9] py-2 px-4 hover:border-[#ff6600] hover:text-[#ff6600] transition-colors text-sm"
          >
            sign in
          </Link>
        </div>

        <p className="text-[#888880] text-xs">
          Human verification required at signup.
        </p>
      </div>
    </main>
  )
}
