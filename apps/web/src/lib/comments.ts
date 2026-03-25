import { createServerClient } from '@solbook/shared/supabase'
import type { Comment, CommentNode } from '@solbook/shared/types'

export function hnScore(likes: number, createdAt: string): number {
  const ageHours = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60)
  return likes / Math.pow(ageHours + 2, 1.8)
}

export function buildCommentTree(flat: Comment[], _userId: string | null): CommentNode[] {
  const map = new Map<string, CommentNode>()
  const roots: CommentNode[] = []

  for (const c of flat) {
    map.set(c.id, { ...c, children: [] })
  }

  for (const node of map.values()) {
    if (node.parent_id === null) {
      roots.push(node)
    } else {
      const parent = map.get(node.parent_id)
      if (parent) parent.children.push(node)
    }
  }

  function sortChildren(nodes: CommentNode[]): void {
    nodes.sort((a, b) => hnScore(b.like_count, b.created_at) - hnScore(a.like_count, a.created_at))
    for (const node of nodes) sortChildren(node.children)
  }

  sortChildren(roots)
  return roots
}

export async function getComments(postId: string, userId: string | null): Promise<CommentNode[]> {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('comments')
    .select(`
      id, post_id, user_id, parent_id, content, depth, created_at,
      profiles!comments_user_id_fkey ( id, username, display_name, bio, avatar_url, created_at ),
      comment_likes ( user_id )
    `)
    .eq('post_id', postId)
    .order('created_at', { ascending: true })

  if (error || !data) return []

  const flat: Comment[] = data.map((row: any) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
    const likes: { user_id: string }[] = row.comment_likes ?? []
    return {
      id: row.id,
      post_id: row.post_id,
      user_id: row.user_id,
      parent_id: row.parent_id,
      content: row.content,
      depth: row.depth,
      created_at: row.created_at,
      profile: profile ?? { id: '', username: 'unknown', display_name: 'Unknown', bio: null, avatar_url: null, created_at: '' },
      like_count: likes.length,
      liked_by_me: userId ? likes.some(l => l.user_id === userId) : false,
    }
  })

  return buildCommentTree(flat, userId)
}
