import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Compose' }

export default function ComposePage() {
  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold mb-6">New post</h1>
      <p className="text-zinc-500">Post composer coming soon.</p>
    </div>
  )
}
