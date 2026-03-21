import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Post' }

interface Props {
  params: Promise<{ id: string }>
}

export default async function PostPage({ params }: Props) {
  const { id } = await params
  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold mb-2">Post</h1>
      <p className="text-zinc-500">Post {id} coming soon.</p>
    </div>
  )
}
