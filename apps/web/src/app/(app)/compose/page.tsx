import type { Metadata } from 'next'
import { PostComposer } from '@/components/posts/PostComposer'

export const metadata: Metadata = { title: 'Compose' }

export default function ComposePage() {
  return (
    <div className="max-w-xl mx-auto">
      <div className="sticky top-0 bg-[#1c1c1c] border-b border-[#333333] px-4 py-3">
        <h1 className="text-sm font-bold text-[#ff6600]">new post</h1>
      </div>
      <PostComposer />
    </div>
  )
}
