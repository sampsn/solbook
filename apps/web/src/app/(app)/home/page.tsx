import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Home' }

export default function HomePage() {
  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold mb-6">Home</h1>
      <p className="text-zinc-500">Your feed will appear here.</p>
    </div>
  )
}
