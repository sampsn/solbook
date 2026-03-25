import { supabase } from './supabase'
import type { CommentNode } from '@solbook/shared/types'

export interface FlatComment {
  id: string
  post_id: string
  user_id: string
  parent_id: string | null
  content: string
  depth: number
  created_at: string
  profile: { id: string; username: string; display_name: string; bio: string | null; avatar_url: string | null; created_at: string }
  like_count: number
  liked_by_me: boolean
}

function hnScore(likes: number, createdAt: string): number {
  const ageHours = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60)
  return likes / Math.pow(ageHours + 2, 1.8)
}

function buildCommentTree(flat: FlatComment[]): CommentNode[] {
  const map = new Map<string, CommentNode>()
  const roots: CommentNode[] = []
  for (const c of flat) map.set(c.id, { ...c, children: [] })
  for (const node of map.values()) {
    if (node.parent_id === null) roots.push(node)
    else map.get(node.parent_id)?.children.push(node)
  }
  function sort(nodes: CommentNode[]): void {
    nodes.sort((a, b) => hnScore(b.like_count, b.created_at) - hnScore(a.like_count, a.created_at))
    nodes.forEach(n => sort(n.children))
  }
  sort(roots)
  return roots
}

export async function getComments(postId: string): Promise<CommentNode[]> {
  const { data: { user } } = await supabase.auth.getUser()

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

  const flat: FlatComment[] = data.map((row: any) => {
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
      liked_by_me: user ? likes.some(l => l.user_id === user.id) : false,
    }
  })

  return buildCommentTree(flat)
}

export async function createComment(
  postId: string,
  parentId: string | null,
  content: string,
): Promise<{ error?: string }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  let depth = 0
  if (parentId !== null) {
    const { data: parent } = await supabase
      .from('comments')
      .select('depth')
      .eq('id', parentId)
      .single()
    if (!parent) return { error: 'Parent comment not found.' }
    depth = (parent as any).depth + 1
  }

  const { error } = await supabase.from('comments').insert({
    post_id: postId,
    user_id: user.id,
    parent_id: parentId,
    content: content.trim(),
    depth,
  })

  if (error) return { error: 'Failed to post comment.' }
  return {}
}

export async function toggleCommentLike(commentId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: existing } = await supabase
    .from('comment_likes')
    .select('id')
    .eq('user_id', user.id)
    .eq('comment_id', commentId)
    .single()

  if (existing) {
    await supabase.from('comment_likes').delete().eq('id', (existing as any).id)
  } else {
    await supabase.from('comment_likes').insert({ user_id: user.id, comment_id: commentId })
  }
}
