import { supabase } from './supabase'

export interface FeedPost {
  id: string
  content: string
  createdAt: string
  author: { username: string; displayName: string }
  likeCount: number
  likedByMe: boolean
}

export interface Profile {
  id: string
  username: string
  display_name: string
  bio: string | null
  created_at: string
}

// ── Posts ────────────────────────────────────────────────────────────────────

export async function createPost(content: string): Promise<{ error?: string }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('posts').insert({
    user_id: user.id,
    content: content.trim(),
  })

  if (error) return { error: 'Failed to create post.' }
  return {}
}

export async function toggleLike(postId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: existing } = await supabase
    .from('likes')
    .select('id')
    .eq('user_id', user.id)
    .eq('post_id', postId)
    .single()

  if (existing) {
    await supabase.from('likes').delete().eq('id', existing.id)
  } else {
    await supabase.from('likes').insert({ user_id: user.id, post_id: postId })
  }
}

// ── Home feed ────────────────────────────────────────────────────────────────

export async function getHomeFeed(cursor?: string): Promise<{
  posts: FeedPost[]
  nextCursor: string | null
}> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { posts: [], nextCursor: null }

  const PAGE_SIZE = 20

  const { data: follows } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id)

  const followingIds = (follows ?? []).map((f) => f.following_id)

  let query = supabase
    .from('posts')
    .select(`
      id, content, created_at,
      profiles!posts_user_id_fkey ( username, display_name ),
      likes ( id, user_id )
    `)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(PAGE_SIZE + 1)

  if (followingIds.length > 0) query = query.in('user_id', followingIds)

  if (cursor) {
    const [cursorCreatedAt] = atob(cursor.replace(/-/g, '+').replace(/_/g, '/')).split('|')
    query = query.lt('created_at', cursorCreatedAt)
  }

  const { data: posts } = await query
  const hasMore = (posts ?? []).length > PAGE_SIZE
  const pagePosts = (posts ?? []).slice(0, PAGE_SIZE)

  const feed = pagePosts.map((post: any) => {
    const profile = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles
    const likes = post.likes ?? []
    return {
      id: post.id,
      content: post.content,
      createdAt: post.created_at,
      author: {
        username: profile?.username ?? 'unknown',
        displayName: profile?.display_name ?? 'Unknown',
      },
      likeCount: likes.length,
      likedByMe: likes.some((l: any) => l.user_id === user.id),
    }
  })

  const lastPost = pagePosts[pagePosts.length - 1]
  const nextCursor =
    hasMore && lastPost
      ? btoa(`${lastPost.created_at}|${lastPost.id}`).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
      : null

  return { posts: feed, nextCursor, isFollowFeed: followingIds.length > 0 } as any
}

// ── Discover feed ────────────────────────────────────────────────────────────

export async function getDiscoverFeed(): Promise<FeedPost[]> {
  const { data: { user } } = await supabase.auth.getUser()

  const { data: rows } = await supabase.rpc('get_discover_feed', {
    window_hours: 48,
    page_size: 20,
  })

  if (!rows) return []

  const postIds = rows.map((r: any) => r.id)
  const { data: myLikes } = user && postIds.length > 0
    ? await supabase.from('likes').select('post_id').eq('user_id', user.id).in('post_id', postIds)
    : { data: [] }

  const likedSet = new Set((myLikes ?? []).map((l: any) => l.post_id))

  return rows.map((r: any) => ({
    id: r.id,
    content: r.content,
    createdAt: r.created_at,
    author: { username: r.username, displayName: r.display_name },
    likeCount: Number(r.like_count),
    likedByMe: likedSet.has(r.id),
  }))
}

// ── Profiles ─────────────────────────────────────────────────────────────────

export async function getProfile(username: string): Promise<{
  profile: Profile | null
  posts: FeedPost[]
  followerCount: number
  followingCount: number
  isFollowing: boolean
}> {
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, display_name, bio, created_at')
    .eq('username', username)
    .single()

  if (!profile) return { profile: null, posts: [], followerCount: 0, followingCount: 0, isFollowing: false }

  const [{ count: followerCount }, { count: followingCount }, followRow, { data: posts }] =
    await Promise.all([
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', profile.id),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profile.id),
      user && user.id !== profile.id
        ? supabase.from('follows').select('follower_id').eq('follower_id', user.id).eq('following_id', profile.id).single()
        : Promise.resolve({ data: null }),
      supabase
        .from('posts')
        .select(`id, content, created_at, profiles!posts_user_id_fkey ( username, display_name ), likes ( id, user_id )`)
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(50),
    ])

  const feed = (posts ?? []).map((post: any) => {
    const p = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles
    const likes = post.likes ?? []
    return {
      id: post.id,
      content: post.content,
      createdAt: post.created_at,
      author: { username: p?.username ?? username, displayName: p?.display_name ?? profile.display_name },
      likeCount: likes.length,
      likedByMe: likes.some((l: any) => l.user_id === user?.id),
    }
  })

  return {
    profile,
    posts: feed,
    followerCount: followerCount ?? 0,
    followingCount: followingCount ?? 0,
    isFollowing: !!(followRow as any)?.data,
  }
}

export async function toggleFollow(targetUserId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id === targetUserId) return

  const { data: existing } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', user.id)
    .eq('following_id', targetUserId)
    .single()

  if (existing) {
    await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', targetUserId)
  } else {
    await supabase.from('follows').insert({ follower_id: user.id, following_id: targetUserId })
  }
}

// ── Notifications ────────────────────────────────────────────────────────────

export interface Notification {
  type: 'like' | 'follow'
  id: string
  username: string
  displayName: string
  postId?: string
  postContent?: string
  createdAt: string
}

export async function getNotifications(): Promise<Notification[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [{ data: likes }, { data: followers }] = await Promise.all([
    supabase
      .from('likes')
      .select(`id, created_at, posts!likes_post_id_fkey ( id, content, user_id ), profiles!likes_user_id_fkey ( username, display_name )`)
      .neq('user_id', user.id)
      .eq('posts.user_id', user.id)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('follows')
      .select(`created_at, profiles!follows_follower_id_fkey ( username, display_name )`)
      .eq('following_id', user.id)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const notifications: Notification[] = []

  for (const f of followers ?? []) {
    const p = Array.isArray(f.profiles) ? f.profiles[0] : f.profiles
    if (!p) continue
    notifications.push({
      type: 'follow',
      id: `follow-${f.created_at}`,
      username: p.username,
      displayName: p.display_name,
      createdAt: f.created_at,
    })
  }

  for (const l of likes ?? []) {
    const post = Array.isArray(l.posts) ? l.posts[0] : l.posts
    const p = Array.isArray(l.profiles) ? l.profiles[0] : l.profiles
    if (!post || !p) continue
    notifications.push({
      type: 'like',
      id: l.id,
      username: p.username,
      displayName: p.display_name,
      postId: post.id,
      postContent: post.content,
      createdAt: l.created_at,
    })
  }

  return notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}
