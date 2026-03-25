export interface Profile {
  id: string
  username: string
  display_name: string
  bio: string | null
  avatar_url: string | null
  created_at: string
}

export interface Post {
  id: string
  user_id: string
  content: string
  created_at: string
  profile?: Profile
  like_count?: number
  liked_by_me?: boolean
  comment_count?: number
}

export interface Like {
  id: string
  user_id: string
  post_id: string
  created_at: string
}

export interface Comment {
  id: string
  post_id: string
  user_id: string
  parent_id: string | null
  content: string
  depth: number
  created_at: string
  profile: Profile
  like_count: number
  liked_by_me: boolean
}

export interface CommentNode extends Comment {
  children: CommentNode[]
}

export interface Follow {
  follower_id: string
  following_id: string
  created_at: string
}

export interface PasskeyCredential {
  id: string
  user_id: string
  credential_id: string
  public_key: string
  counter: number
  device_type: string | null
  backed_up: boolean
  created_at: string
}

// Cursor pagination
export interface PageCursor {
  created_at: string
  id: string
}

export interface PaginatedResult<T> {
  data: T[]
  nextCursor: PageCursor | null
}
