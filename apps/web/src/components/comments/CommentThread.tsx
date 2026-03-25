import { getComments } from '@/lib/comments'
import { CommentList } from './CommentList'

interface Props {
  postId: string
  userId: string | null
}

export async function CommentThread({ postId, userId }: Props) {
  const nodes = await getComments(postId, userId)

  if (nodes.length === 0) {
    return (
      <p className="text-xs text-[var(--color-muted)] px-4 py-6 text-center">
        no comments yet
      </p>
    )
  }

  return <CommentList nodes={nodes} postId={postId} userId={userId} />
}
