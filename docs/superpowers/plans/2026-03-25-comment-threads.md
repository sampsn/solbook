# Comment Thread System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Hacker News–style threaded, collapsible, ranked comment threads to posts on web and mobile.

**Architecture:** Adjacency list DB schema (`comments`, `comment_likes`). `getComments` fetches a flat list via Supabase, builds a tree in TypeScript, and sorts children at every level by HN score. Web uses server components + server actions (same as posts). Mobile uses direct Supabase client calls with authenticated RLS policies.

**Tech Stack:** PostgreSQL (Supabase), Next.js 15 App Router, React 19 `useOptimistic`, Expo/React Native, Vitest + Testing Library

**Spec:** `docs/superpowers/specs/2026-03-25-comment-threads-design.md`

---

## File Map

**Created:**
- `supabase/migrations/20260325000000_comments.sql`
- `packages/shared/src/types/index.ts` ← modified
- `packages/shared/src/validation/index.ts` ← modified
- `apps/web/src/lib/comments.ts`
- `apps/web/src/lib/comments.test.ts`
- `apps/web/src/actions/comments.ts`
- `apps/web/src/components/comments/CommentComposer.tsx`
- `apps/web/src/components/comments/ReplyComposer.tsx`
- `apps/web/src/components/comments/CommentItem.tsx`
- `apps/web/src/components/comments/CommentList.tsx`
- `apps/web/src/components/comments/CommentThread.tsx`
- `apps/web/src/app/post/[id]/page.tsx` ← modified
- `apps/web/src/components/posts/PostCard.tsx` ← modified
- `apps/web/src/app/(app)/notifications/page.tsx` ← modified
- `apps/mobile/lib/comments.ts`
- `apps/mobile/components/comments/CommentComposer.tsx`
- `apps/mobile/components/comments/CommentItem.tsx`
- `apps/mobile/components/comments/CommentList.tsx`
- `apps/mobile/app/post/[id].tsx` ← modified

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260325000000_comments.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Comments
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  content text not null,
  depth int not null default 0,
  created_at timestamptz not null default now(),
  constraint comment_content_length check (char_length(content) between 1 and 1000)
);

create index comments_post_id_created_at_idx on public.comments (post_id, created_at desc);
create index comments_parent_id_idx on public.comments (parent_id);
create index comments_user_id_idx on public.comments (user_id);

-- Comment likes
create table public.comment_likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  comment_id uuid not null references public.comments(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, comment_id)
);

create index comment_likes_comment_id_created_at_idx on public.comment_likes (comment_id, created_at desc);
create index comment_likes_user_id_idx on public.comment_likes (user_id);

-- RLS: enabled, no anon/authenticated policies — service role bypasses RLS (web)
alter table public.comments enable row level security;
alter table public.comment_likes enable row level security;

-- Mobile RLS: authenticated users can read all; insert/delete their own
create policy "authenticated users can read comments"
  on public.comments for select
  to authenticated
  using (true);

create policy "users can insert their own comments"
  on public.comments for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "authenticated users can read comment_likes"
  on public.comment_likes for select
  to authenticated
  using (true);

create policy "users can insert their own comment_likes"
  on public.comment_likes for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "users can delete their own comment_likes"
  on public.comment_likes for delete
  to authenticated
  using (user_id = auth.uid());
```

- [ ] **Step 2: Apply the migration**

```bash
cd /Users/gabriel.sampson/Dev/sampsn/projects/solbook
bun supabase db push
```

Expected: migration applied, no errors.

- [ ] **Step 3: Verify tables exist**

```bash
bun supabase db diff
```

Expected: no diff (all changes applied).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260325000000_comments.sql
git commit -m "feat(db): add comments and comment_likes tables"
```

---

## Task 2: Shared Types + Validation

**Files:**
- Modify: `packages/shared/src/types/index.ts`
- Modify: `packages/shared/src/validation/index.ts`

- [ ] **Step 1: Write the failing test**

In `packages/shared/src/validation/index.ts` — there is no `validateComment` yet, so the import will fail.

Create `apps/web/src/lib/validateComment.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { validateComment } from '@solbook/shared/validation'

describe('validateComment', () => {
  it('rejects empty string', () => {
    expect(validateComment('').valid).toBe(false)
  })

  it('rejects whitespace-only string', () => {
    expect(validateComment('   ').valid).toBe(false)
  })

  it('accepts a valid comment', () => {
    expect(validateComment('hello world').valid).toBe(true)
  })

  it('rejects content over 1000 chars', () => {
    expect(validateComment('a'.repeat(1001)).valid).toBe(false)
  })

  it('accepts exactly 1000 chars', () => {
    expect(validateComment('a'.repeat(1000)).valid).toBe(true)
  })
})
```

- [ ] **Step 2: Run the test — expect FAIL**

```bash
cd apps/web && bun run test src/lib/validateComment.test.ts
```

Expected: FAIL — `validateComment` not exported.

- [ ] **Step 3: Add Comment + CommentNode types to shared**

In `packages/shared/src/types/index.ts`, add after the `Like` interface:

```ts
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
```

Also add `comment_count?: number` to `Post`:

```ts
export interface Post {
  id: string
  user_id: string
  content: string
  created_at: string
  profile?: Profile
  like_count?: number
  liked_by_me?: boolean
  comment_count?: number  // ← add this line
}
```

- [ ] **Step 4: Add validateComment to shared validation**

In `packages/shared/src/validation/index.ts`, add after `validatePost`:

```ts
export function validateComment(content: string): ValidationResult {
  if (!content || content.trim().length === 0) {
    return { valid: false, error: 'Comment cannot be empty.' }
  }
  if (content.length > 1000) {
    return { valid: false, error: 'Comment must be 1000 characters or fewer.' }
  }
  return { valid: true }
}
```

- [ ] **Step 5: Run the test — expect PASS**

```bash
cd apps/web && bun run test src/lib/validateComment.test.ts
```

Expected: 5 passing.

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/types/index.ts packages/shared/src/validation/index.ts apps/web/src/lib/validateComment.test.ts
git commit -m "feat(shared): add Comment, CommentNode types and validateComment"
```

---

## Task 3: Comment Tree Logic (lib/comments.ts)

**Files:**
- Create: `apps/web/src/lib/comments.ts`
- Create: `apps/web/src/lib/comments.test.ts`

This is the most important task — pure functions (`hnScore`, `buildCommentTree`) are fully unit-testable. `getComments` wraps a Supabase query and is not unit-tested.

- [ ] **Step 1: Write the failing tests**

Create `apps/web/src/lib/comments.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { hnScore, buildCommentTree } from './comments'
import type { Comment } from '@solbook/shared/types'

// Helper to create a minimal Comment fixture
function comment(overrides: Partial<Comment> & { id: string }): Comment {
  return {
    post_id: 'p1',
    user_id: 'u1',
    parent_id: null,
    content: 'test',
    depth: 0,
    created_at: new Date().toISOString(),
    profile: { id: 'u1', username: 'alice', display_name: 'Alice', bio: null, avatar_url: null, created_at: new Date().toISOString() },
    like_count: 0,
    liked_by_me: false,
    ...overrides,
  }
}

describe('hnScore', () => {
  it('returns a number for zero likes at age 0', () => {
    const score = hnScore(0, new Date().toISOString())
    expect(typeof score).toBe('number')
    expect(score).toBeGreaterThanOrEqual(0)
  })

  it('higher likes = higher score at same age', () => {
    const now = new Date().toISOString()
    expect(hnScore(10, now)).toBeGreaterThan(hnScore(1, now))
  })

  it('older comments score lower than newer ones with same likes', () => {
    const old = new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString() // 10h ago
    const recent = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() // 1h ago
    expect(hnScore(5, recent)).toBeGreaterThan(hnScore(5, old))
  })
})

describe('buildCommentTree', () => {
  it('returns empty array for empty input', () => {
    expect(buildCommentTree([], null)).toEqual([])
  })

  it('returns top-level comments with no children', () => {
    const c = comment({ id: 'c1' })
    const result = buildCommentTree([c], null)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('c1')
    expect(result[0].children).toEqual([])
  })

  it('nests a child under its parent', () => {
    const parent = comment({ id: 'c1', depth: 0 })
    const child = comment({ id: 'c2', parent_id: 'c1', depth: 1 })
    const result = buildCommentTree([parent, child], null)
    expect(result).toHaveLength(1)
    expect(result[0].children).toHaveLength(1)
    expect(result[0].children[0].id).toBe('c2')
  })

  it('sorts siblings by HN score descending', () => {
    const now = new Date().toISOString()
    const low = comment({ id: 'c-low', like_count: 1, created_at: now })
    const high = comment({ id: 'c-high', like_count: 10, created_at: now })
    const result = buildCommentTree([low, high], null)
    expect(result[0].id).toBe('c-high')
    expect(result[1].id).toBe('c-low')
  })

  it('sets liked_by_me based on userId', () => {
    const c = comment({ id: 'c1' })
    // liked_by_me is computed by the query layer; buildCommentTree preserves it
    const resultWithUser = buildCommentTree([{ ...c, liked_by_me: true }], 'u1')
    expect(resultWithUser[0].liked_by_me).toBe(true)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd apps/web && bun run test src/lib/comments.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement lib/comments.ts**

Create `apps/web/src/lib/comments.ts`:

```ts
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
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd apps/web && bun run test src/lib/comments.test.ts
```

Expected: all passing.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/comments.ts apps/web/src/lib/comments.test.ts
git commit -m "feat(web): add comment tree logic and HN ranking"
```

---

## Task 4: Server Actions (createComment + toggleCommentLike)

**Files:**
- Create: `apps/web/src/actions/comments.ts`

- [ ] **Step 1: Create the actions file**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@solbook/shared/supabase'
import { validateComment } from '@solbook/shared/validation'
import { requireSession } from '@/lib/auth'

export async function createComment(
  postId: string,
  parentId: string | null,
  content: string,
): Promise<{ error?: string }> {
  const session = await requireSession()

  const result = validateComment(content)
  if (!result.valid) return { error: result.error }

  const supabase = createServerClient()

  let depth = 0
  if (parentId !== null) {
    const { data: parent } = await supabase
      .from('comments')
      .select('depth')
      .eq('id', parentId)
      .single()
    if (!parent) return { error: 'Parent comment not found.' }
    depth = parent.depth + 1
  }

  const { error } = await supabase.from('comments').insert({
    post_id: postId,
    user_id: session.userId,
    parent_id: parentId,
    content: content.trim(),
    depth,
  })

  if (error) return { error: 'Failed to post comment.' }

  revalidatePath('/post/[id]', 'page')
  return {}
}

export async function toggleCommentLike(
  commentId: string,
  postId: string,
): Promise<{ error?: string }> {
  const session = await requireSession()
  const supabase = createServerClient()

  const { data: existing } = await supabase
    .from('comment_likes')
    .select('id')
    .eq('user_id', session.userId)
    .eq('comment_id', commentId)
    .single()

  if (existing) {
    await supabase.from('comment_likes').delete().eq('id', existing.id)
  } else {
    await supabase.from('comment_likes').insert({
      user_id: session.userId,
      comment_id: commentId,
    })
  }

  revalidatePath('/post/[id]', 'page')
  return {}
}
```

- [ ] **Step 2: Run all tests to confirm no regressions**

```bash
cd apps/web && bun run test
```

Expected: all passing.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/actions/comments.ts
git commit -m "feat(web): add createComment and toggleCommentLike server actions"
```

---

## Task 5: CommentComposer (web)

**Files:**
- Create: `apps/web/src/components/comments/CommentComposer.tsx`

Follows the exact same pattern as `PostComposer.tsx` — same layout, same paste-prevention, same error/loading state pattern.

- [ ] **Step 1: Create the component**

```tsx
'use client'

import { useState } from 'react'
import { createComment } from '@/actions/comments'
import { validateComment } from '@solbook/shared/validation'

interface Props {
  postId: string
}

export function CommentComposer({ postId }: Props) {
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const remaining = 1000 - content.length
  const overLimit = remaining < 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validation = validateComment(content)
    if (!validation.valid) { setError(validation.error ?? ''); return }
    setLoading(true)
    setError('')
    const result = await createComment(postId, null, content)
    if (result.error) {
      setError(result.error)
    } else {
      setContent('')
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="border-b border-[var(--color-border)] px-4 py-3">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onPaste={(e) => e.preventDefault()}
        placeholder="add a comment…"
        rows={3}
        className="w-full bg-transparent placeholder:text-[var(--color-muted)] resize-none focus:outline-none leading-relaxed"
        style={{ color: 'var(--color-text-strong)', fontSize: '14px' }}
      />
      {error && <p className="text-[var(--color-danger)] text-xs mb-1">{error}</p>}
      <div className="flex items-center justify-between">
        <span className={`text-xs ${overLimit ? 'text-[var(--color-danger)]' : 'text-[var(--color-muted)]'}`}>
          {remaining}
        </span>
        <button
          type="submit"
          disabled={loading || !content.trim() || overLimit}
          className="bg-[var(--color-accent)] text-[var(--color-bg)] text-xs font-bold px-4 py-1 disabled:opacity-40 hover:bg-[var(--color-accent-hover)] transition-colors"
        >
          {loading ? 'posting…' : 'comment'}
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Run all tests**

```bash
cd apps/web && bun run test
```

Expected: all passing.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/comments/CommentComposer.tsx
git commit -m "feat(web): add CommentComposer component"
```

---

## Task 6: ReplyComposer (web)

**Files:**
- Create: `apps/web/src/components/comments/ReplyComposer.tsx`

Inline reply composer — opened by clicking "reply" on a comment. Has a cancel button. Uses `createComment` with `parentId` set.

- [ ] **Step 1: Create the component**

```tsx
'use client'

import { useState } from 'react'
import { createComment } from '@/actions/comments'
import { validateComment } from '@solbook/shared/validation'

interface Props {
  postId: string
  parentId: string
  parentUsername: string
  onCancel: () => void
}

export function ReplyComposer({ postId, parentId, parentUsername, onCancel }: Props) {
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const remaining = 1000 - content.length
  const overLimit = remaining < 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validation = validateComment(content)
    if (!validation.valid) { setError(validation.error ?? ''); return }
    setLoading(true)
    setError('')
    const result = await createComment(postId, parentId, content)
    if (result.error) {
      setError(result.error)
    } else {
      onCancel()
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="pl-4 pr-4 py-2 border-b border-[var(--color-border)]">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onPaste={(e) => e.preventDefault()}
        placeholder={`reply to ${parentUsername}…`}
        rows={2}
        autoFocus
        className="w-full bg-transparent placeholder:text-[var(--color-muted)] resize-none focus:outline-none leading-relaxed"
        style={{ color: 'var(--color-text-strong)', fontSize: '13px' }}
      />
      {error && <p className="text-[var(--color-danger)] text-xs mb-1">{error}</p>}
      <div className="flex items-center justify-between">
        <span className={`text-xs ${overLimit ? 'text-[var(--color-danger)]' : 'text-[var(--color-muted)]'}`}>
          {remaining}
        </span>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
          >
            cancel
          </button>
          <button
            type="submit"
            disabled={loading || !content.trim() || overLimit}
            className="bg-[var(--color-accent)] text-[var(--color-bg)] text-xs font-bold px-3 py-1 disabled:opacity-40 hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            {loading ? 'replying…' : 'reply'}
          </button>
        </div>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Run all tests**

```bash
cd apps/web && bun run test
```

Expected: all passing.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/comments/ReplyComposer.tsx
git commit -m "feat(web): add ReplyComposer component"
```

---

## Task 7: CommentItem (web)

**Files:**
- Create: `apps/web/src/components/comments/CommentItem.tsx`

Single comment row. Has the `-`/`+` collapse button, meta line, content, like + reply actions. Uses `useOptimistic` for the like toggle. Opens `ReplyComposer` inline.

- [ ] **Step 1: Create the component**

```tsx
'use client'

import Link from 'next/link'
import { useState, useOptimistic, useTransition } from 'react'
import { toggleCommentLike } from '@/actions/comments'
import { ReplyComposer } from './ReplyComposer'
import type { CommentNode } from '@solbook/shared/types'

const MAX_VISUAL_DEPTH = 7
const INDENT_PX = 16

interface Props {
  node: CommentNode
  postId: string
  userId: string | null
  depth: number
  isCollapsed: boolean
  onToggleCollapse: () => void
  replyCount: number
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  return `${days}d`
}

export function CommentItem({ node, postId, userId, depth, isCollapsed, onToggleCollapse, replyCount }: Props) {
  const [showReply, setShowReply] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [optimistic, updateOptimistic] = useOptimistic(
    { liked: node.liked_by_me, count: node.like_count },
    (state, liked: boolean) => ({ liked, count: state.count + (liked ? 1 : -1) }),
  )

  const visualDepth = Math.min(depth, MAX_VISUAL_DEPTH)

  function handleLike() {
    if (!userId) return
    startTransition(async () => {
      updateOptimistic(!optimistic.liked)
      await toggleCommentLike(node.id, postId)
    })
  }

  return (
    <div style={{ paddingLeft: visualDepth * INDENT_PX }}>
      <div
        id={`comment-${node.id}`}
        className="border-b border-[var(--color-border)] px-4 py-2"
      >
        {/* Meta row */}
        <div className="flex items-center gap-2 text-xs mb-1">
          <button
            onClick={onToggleCollapse}
            className="text-[var(--color-muted)] hover:text-[var(--color-accent)] transition-colors font-mono leading-none"
            aria-label={isCollapsed ? 'expand' : 'collapse'}
          >
            {isCollapsed ? '[+]' : '[-]'}
          </button>
          <Link
            href={`/${node.profile.username}`}
            className="font-bold hover:text-[var(--color-accent)] transition-colors"
            style={{ color: 'var(--color-text-strong)' }}
          >
            {node.profile.username}
          </Link>
          <span style={{ color: 'var(--color-muted)' }}>
            {formatTimeAgo(node.created_at)}
          </span>
          <span style={{ color: 'var(--color-muted)' }}>
            ▲ {optimistic.count > 0 ? optimistic.count : '0'}
          </span>
          {isCollapsed && replyCount > 0 && (
            <span style={{ color: 'var(--color-muted)' }}>· {replyCount} {replyCount === 1 ? 'reply' : 'replies'}</span>
          )}
        </div>

        {/* Content + actions (hidden when collapsed) */}
        {!isCollapsed && (
          <>
            <p
              className="text-sm leading-relaxed whitespace-pre-wrap break-words mb-2"
              style={{ color: 'var(--color-text-strong)' }}
            >
              {node.content}
            </p>
            <div className="flex gap-4 text-xs" style={{ color: 'var(--color-muted)' }}>
              {userId && (
                <button
                  onClick={handleLike}
                  disabled={isPending}
                  className={`transition-colors hover:text-[var(--color-accent)] ${optimistic.liked ? 'text-[var(--color-accent)]' : ''}`}
                >
                  {optimistic.liked ? '▲ liked' : '△ like'}
                </button>
              )}
              {userId && (
                <button
                  onClick={() => setShowReply(s => !s)}
                  className="hover:text-[var(--color-accent)] transition-colors"
                >
                  reply
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Inline reply composer */}
      {!isCollapsed && showReply && (
        <ReplyComposer
          postId={postId}
          parentId={node.id}
          parentUsername={node.profile.username}
          onCancel={() => setShowReply(false)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run all tests**

```bash
cd apps/web && bun run test
```

Expected: all passing.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/comments/CommentItem.tsx
git commit -m "feat(web): add CommentItem component with optimistic likes"
```

---

## Task 8: CommentList (web)

**Files:**
- Create: `apps/web/src/components/comments/CommentList.tsx`

Client component. Owns collapse state. Renders the tree recursively using `CommentItem`. Uses a `Set<string>` of collapsed IDs.

A helper function `countDescendants` counts all descendants of a node (used to display "N replies" in collapsed state).

- [ ] **Step 1: Create the component**

```tsx
'use client'

import { useState, useCallback } from 'react'
import { CommentItem } from './CommentItem'
import type { CommentNode } from '@solbook/shared/types'

interface Props {
  nodes: CommentNode[]
  postId: string
  userId: string | null
}

function countDescendants(node: CommentNode): number {
  return node.children.reduce((acc, child) => acc + 1 + countDescendants(child), 0)
}

export function CommentList({ nodes, postId, userId }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const toggle = useCallback((id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  function renderNode(node: CommentNode, depth: number): React.ReactNode {
    const isCollapsed = collapsed.has(node.id)
    return (
      <div key={node.id}>
        <CommentItem
          node={node}
          postId={postId}
          userId={userId}
          depth={depth}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => toggle(node.id)}
          replyCount={countDescendants(node)}
        />
        {!isCollapsed && node.children.map(child => renderNode(child, depth + 1))}
      </div>
    )
  }

  return <div>{nodes.map(n => renderNode(n, 0))}</div>
}
```

- [ ] **Step 2: Run all tests**

```bash
cd apps/web && bun run test
```

Expected: all passing.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/comments/CommentList.tsx
git commit -m "feat(web): add CommentList with collapse state"
```

---

## Task 9: CommentThread (web server component)

**Files:**
- Create: `apps/web/src/components/comments/CommentThread.tsx`

- [ ] **Step 1: Create the component**

```tsx
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
```

- [ ] **Step 2: Run all tests**

```bash
cd apps/web && bun run test
```

Expected: all passing.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/comments/CommentThread.tsx
git commit -m "feat(web): add CommentThread server component"
```

---

## Task 10: Wire Up Post Page + PostCard (web)

**Files:**
- Modify: `apps/web/src/app/post/[id]/page.tsx`
- Modify: `apps/web/src/components/posts/PostCard.tsx`

- [ ] **Step 1: Update PostCard to accept and display commentCount**

In `apps/web/src/components/posts/PostCard.tsx`:

1. Add `commentCount?: number` to `PostCardProps` interface:
```ts
interface PostCardProps {
  id: string
  content: string
  createdAt: string
  author: { username: string; displayName: string }
  likeCount: number
  likedByMe: boolean
  commentCount?: number  // ← add
  disableLink?: boolean
}
```

2. Destructure it in the function signature:
```ts
export function PostCard({ id, content, createdAt, author, likeCount, likedByMe, commentCount, disableLink }: PostCardProps) {
```

3. Add the comment count button in the `<form>` area — after the like form, add:
```tsx
{typeof commentCount === 'number' && (
  <span className="text-xs text-[var(--color-muted)] p-2 -m-2">
    💬 {commentCount > 0 ? commentCount : ''}
  </span>
)}
```

Wrap both the like form and comment count in a flex container:
```tsx
<div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
  <form action={toggleLikeForPost} className="w-fit">
    {/* existing like button unchanged */}
  </form>
  {typeof commentCount === 'number' && (
    <span className="text-xs text-[var(--color-muted)]">
      💬 {commentCount > 0 ? commentCount : ''}
    </span>
  )}
</div>
```

- [ ] **Step 2: Update the post detail page**

Replace the contents of `apps/web/src/app/post/[id]/page.tsx` with:

```tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createServerClient } from '@solbook/shared/supabase'
import { getSession } from '@/lib/auth'
import { PostCard } from '@/components/posts/PostCard'
import { CommentComposer } from '@/components/comments/CommentComposer'
import { CommentThread } from '@/components/comments/CommentThread'

export const metadata: Metadata = { title: 'Post' }

interface Props {
  params: Promise<{ id: string }>
}

export default async function PostPage({ params }: Props) {
  const { id } = await params
  const session = await getSession()
  const supabase = createServerClient()

  const { data: post } = await supabase
    .from('posts')
    .select(`
      id,
      content,
      created_at,
      profiles!posts_user_id_fkey ( username, display_name ),
      likes ( id, user_id ),
      comments ( count )
    `)
    .eq('id', id)
    .single()

  if (!post) notFound()

  const profile = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles
  const likes = post.likes ?? []
  const commentCount = (post.comments as any)?.[0]?.count ?? 0

  return (
    <div className="max-w-2xl mx-auto">
      <div className="border-b border-[var(--color-border)] px-4 py-3">
        <Link href="/home" className="text-xs text-[var(--color-muted)] hover:text-[var(--color-accent)] transition-colors">
          ← back
        </Link>
      </div>
      <PostCard
        id={post.id}
        content={post.content}
        createdAt={post.created_at}
        author={{
          username: profile?.username ?? 'unknown',
          displayName: profile?.display_name ?? 'Unknown',
        }}
        likeCount={likes.length}
        likedByMe={likes.some((l: { user_id: string }) => l.user_id === session?.userId)}
        commentCount={commentCount}
        disableLink
      />
      {session && <CommentComposer postId={id} />}
      <CommentThread postId={id} userId={session?.userId ?? null} />
    </div>
  )
}
```

- [ ] **Step 3: Run all tests**

```bash
cd apps/web && bun run test
```

Expected: all passing.

- [ ] **Step 4: Smoke-test locally**

```bash
cd /Users/gabriel.sampson/Dev/sampsn/projects/solbook && bun run dev
```

Navigate to a post at `/post/[id]`. Verify:
- Comment count appears on the post card
- Comment composer is shown when logged in
- "no comments yet" is shown below
- Posting a comment works and the thread appears
- Reply, collapse, and like all work

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/post/[id]/page.tsx apps/web/src/components/posts/PostCard.tsx
git commit -m "feat(web): wire comment thread into post detail page"
```

---

## Task 11: Web Notifications

**Files:**
- Modify: `apps/web/src/app/(app)/notifications/page.tsx`

- [ ] **Step 1: Update the AlertItem type and add three new queries**

Open `apps/web/src/app/(app)/notifications/page.tsx` and:

1. Extend the `AlertItem` union type (add three new variants after the existing `like` variant):

```ts
type AlertItem =
  | { kind: 'follow'; createdAt: string; username: string; key: string }
  | { kind: 'like'; createdAt: string; username: string; postId: string; postContent: string; key: string }
  | { kind: 'comment_on_post'; createdAt: string; username: string; commentId: string; postId: string; commentContent: string; key: string }
  | { kind: 'reply_to_comment'; createdAt: string; username: string; commentId: string; postId: string; replyContent: string; key: string }
  | { kind: 'comment_like'; createdAt: string; username: string; commentId: string; postId: string; commentContent: string; key: string }
```

2. Add three new queries after the existing `newFollowers` query. The existing queries have the date inline — extract it into a `const sevenDaysAgo` **before all queries** (top of the query block) so it's shared:

```ts
const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
// Replace the existing inline `.gte(...)` date expressions with sevenDaysAgo too.

// Comments on my posts (top-level only)
const { data: commentsOnMyPosts } = await supabase
  .from('comments')
  .select(`
    id, created_at, content, post_id,
    profiles!comments_user_id_fkey ( username, display_name ),
    posts!comments_post_id_fkey ( user_id )
  `)
  .eq('posts.user_id', session.userId)
  .is('parent_id', null)
  .neq('user_id', session.userId)
  .gte('created_at', sevenDaysAgo)
  .order('created_at', { ascending: false })
  .limit(50)

// Replies to my comments
const { data: repliesToMyComments } = await supabase
  .from('comments')
  .select(`
    id, created_at, content, post_id,
    profiles!comments_user_id_fkey ( username, display_name ),
    comments!comments_parent_id_fkey ( user_id )
  `)
  .eq('comments.user_id', session.userId)
  .neq('user_id', session.userId)
  .not('parent_id', 'is', null)
  .gte('created_at', sevenDaysAgo)
  .order('created_at', { ascending: false })
  .limit(50)

// Likes on my comments
const { data: commentLikes } = await supabase
  .from('comment_likes')
  .select(`
    id, created_at,
    comments!comment_likes_comment_id_fkey ( id, content, post_id, user_id ),
    profiles!comment_likes_user_id_fkey ( username, display_name )
  `)
  .eq('comments.user_id', session.userId)
  .neq('user_id', session.userId)
  .gte('created_at', sevenDaysAgo)
  .order('created_at', { ascending: false })
  .limit(50)
```

3. Add the three new kinds to the `alerts` array (after the existing `likes` spread):

```ts
...(commentsOnMyPosts ?? []).flatMap((c: any) => {
  const p = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles
  if (!p) return []
  return [{ kind: 'comment_on_post' as const, createdAt: c.created_at, username: p.username, commentId: c.id, postId: c.post_id, commentContent: c.content, key: `comment-on-post-${c.id}` }]
}),
...(repliesToMyComments ?? []).flatMap((c: any) => {
  const p = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles
  if (!p) return []
  return [{ kind: 'reply_to_comment' as const, createdAt: c.created_at, username: p.username, commentId: c.id, postId: c.post_id, replyContent: c.content, key: `reply-${c.id}` }]
}),
...(commentLikes ?? []).flatMap((l: any) => {
  const comment = Array.isArray(l.comments) ? l.comments[0] : l.comments
  const p = Array.isArray(l.profiles) ? l.profiles[0] : l.profiles
  if (!comment || !p) return []
  return [{ kind: 'comment_like' as const, createdAt: l.created_at, username: p.username, commentId: comment.id, postId: comment.post_id, commentContent: comment.content, key: `comment-like-${l.id}` }]
}),
```

4. Add the three new rendering cases inside the `alerts.map` JSX (after the existing `like` branch):

```tsx
{alert.kind === 'comment_on_post' && (
  <>
    <span style={{ color: 'var(--color-muted)' }}> commented · </span>
    <Link href={`/post/${alert.postId}#comment-${alert.commentId}`} className="transition-colors hover:text-[var(--color-accent)]" style={{ color: 'var(--color-text-strong)' }}>
      {alert.commentContent.slice(0, 60)}{alert.commentContent.length > 60 ? '…' : ''}
    </Link>
  </>
)}
{alert.kind === 'reply_to_comment' && (
  <>
    <span style={{ color: 'var(--color-muted)' }}> replied · </span>
    <Link href={`/post/${alert.postId}#comment-${alert.commentId}`} className="transition-colors hover:text-[var(--color-accent)]" style={{ color: 'var(--color-text-strong)' }}>
      {alert.replyContent.slice(0, 60)}{alert.replyContent.length > 60 ? '…' : ''}
    </Link>
  </>
)}
{alert.kind === 'comment_like' && (
  <>
    <span style={{ color: 'var(--color-muted)' }}> liked your comment · </span>
    <Link href={`/post/${alert.postId}#comment-${alert.commentId}`} className="transition-colors hover:text-[var(--color-accent)]" style={{ color: 'var(--color-text-strong)' }}>
      {alert.commentContent.slice(0, 60)}{alert.commentContent.length > 60 ? '…' : ''}
    </Link>
  </>
)}
```

- [ ] **Step 2: Run all tests**

```bash
cd apps/web && bun run test
```

Expected: all passing.

- [ ] **Step 3: Smoke-test notifications page**

Navigate to `/notifications`. Verify the page loads without TypeScript errors. With another account, comment on a post / reply / like a comment and verify the alerts appear.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/\(app\)/notifications/page.tsx
git commit -m "feat(web): add comment notifications to alerts page"
```

---

## Task 12: Mobile — Comment API (lib/comments.ts)

**Files:**
- Create: `apps/mobile/lib/comments.ts`

The mobile app uses the Supabase anon client (authenticated role). Comment mutations go through RLS policies added in Task 1.

- [ ] **Step 1: Create the mobile comments API module**

```ts
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
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/lib/comments.ts
git commit -m "feat(mobile): add comment API functions"
```

---

## Task 13: Mobile — Comment Components + Wire Up Post Screen

**Files:**
- Create: `apps/mobile/components/comments/CommentComposer.tsx`
- Create: `apps/mobile/components/comments/CommentItem.tsx`
- Create: `apps/mobile/components/comments/CommentList.tsx`
- Modify: `apps/mobile/app/post/[id].tsx`

- [ ] **Step 1: CommentComposer (mobile)**

```tsx
import React, { useState } from 'react'
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native'
import { useTheme } from '@/lib/ThemeContext'
import { font } from '@/lib/theme'
import { createComment } from '@/lib/comments'

interface Props {
  postId: string
  parentId?: string
  parentUsername?: string
  onSubmit?: () => void
  onCancel?: () => void
}

export function CommentComposer({ postId, parentId, parentUsername, onSubmit, onCancel }: Props) {
  const { colors } = useTheme()
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const remaining = 1000 - content.length
  const overLimit = remaining < 0

  async function handleSubmit() {
    if (!content.trim() || overLimit) return
    setLoading(true)
    setError('')
    const result = await createComment(postId, parentId ?? null, content)
    if (result.error) {
      setError(result.error)
    } else {
      setContent('')
      onSubmit?.()
    }
    setLoading(false)
  }

  const styles = StyleSheet.create({
    container: { borderBottomWidth: 1, borderBottomColor: colors.border, padding: 12 },
    input: {
      fontFamily: font.regular, fontSize: 14, color: colors.textStrong,
      minHeight: 60, textAlignVertical: 'top',
    },
    footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
    count: { fontFamily: font.regular, fontSize: 12, color: overLimit ? colors.danger : colors.muted },
    actions: { flexDirection: 'row', gap: 12 },
    cancelBtn: { fontFamily: font.regular, fontSize: 12, color: colors.muted },
    submitBtn: {
      backgroundColor: colors.accent, paddingHorizontal: 14, paddingVertical: 5,
    },
    submitText: { fontFamily: font.bold, fontSize: 12, color: colors.bg },
    error: { fontFamily: font.regular, fontSize: 12, color: colors.danger, marginBottom: 4 },
  })

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={content}
        onChangeText={setContent}
        placeholder={parentUsername ? `reply to ${parentUsername}…` : 'add a comment…'}
        placeholderTextColor={colors.muted}
        multiline
        autoFocus={!!parentId}
      />
      {!!error && <Text style={styles.error}>{error}</Text>}
      <View style={styles.footer}>
        <Text style={styles.count}>{remaining}</Text>
        <View style={styles.actions}>
          {onCancel && (
            <TouchableOpacity onPress={onCancel}>
              <Text style={styles.cancelBtn}>cancel</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.submitBtn, (!content.trim() || overLimit || loading) && { opacity: 0.4 }]}
            onPress={handleSubmit}
            disabled={!content.trim() || overLimit || loading}
          >
            <Text style={styles.submitText}>{loading ? '…' : parentId ? 'reply' : 'comment'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}
```

- [ ] **Step 2: CommentItem (mobile)**

```tsx
import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { useTheme } from '@/lib/ThemeContext'
import { font } from '@/lib/theme'
import { toggleCommentLike } from '@/lib/comments'
import { CommentComposer } from './CommentComposer'
import type { CommentNode } from '@solbook/shared/types'

const MAX_VISUAL_DEPTH = 7
const INDENT_PX = 14

interface Props {
  node: CommentNode
  postId: string
  userId: string | null
  depth: number
  isCollapsed: boolean
  onToggleCollapse: () => void
  replyCount: number
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

export function CommentItem({ node, postId, userId, depth, isCollapsed, onToggleCollapse, replyCount }: Props) {
  const { colors } = useTheme()
  const [showReply, setShowReply] = useState(false)
  const [liked, setLiked] = useState(node.liked_by_me)
  const [count, setCount] = useState(node.like_count)

  const visualDepth = Math.min(depth, MAX_VISUAL_DEPTH)

  async function handleLike() {
    if (!userId) return
    const newLiked = !liked
    setLiked(newLiked)
    setCount(c => c + (newLiked ? 1 : -1))
    await toggleCommentLike(node.id)
  }

  const styles = StyleSheet.create({
    container: { paddingLeft: visualDepth * INDENT_PX, borderBottomWidth: 1, borderBottomColor: colors.border },
    inner: { paddingHorizontal: 16, paddingVertical: 8 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' },
    collapseBtn: { fontFamily: font.mono ?? font.regular, fontSize: 12, color: colors.muted },
    username: { fontFamily: font.bold, fontSize: 12, color: colors.textStrong },
    meta: { fontFamily: font.regular, fontSize: 12, color: colors.muted },
    content: { fontFamily: font.regular, fontSize: 14, color: colors.textStrong, lineHeight: 20, marginBottom: 6 },
    actions: { flexDirection: 'row', gap: 16 },
    action: { fontFamily: font.regular, fontSize: 12, color: colors.muted },
    actionActive: { color: colors.accent },
  })

  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <View style={styles.metaRow}>
          <TouchableOpacity onPress={onToggleCollapse}>
            <Text style={styles.collapseBtn}>{isCollapsed ? '[+]' : '[-]'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push(`/profile/${node.profile.username}`)}>
            <Text style={styles.username}>{node.profile.username}</Text>
          </TouchableOpacity>
          <Text style={styles.meta}>{formatTimeAgo(node.created_at)}</Text>
          <Text style={styles.meta}>▲ {count}</Text>
          {isCollapsed && replyCount > 0 && (
            <Text style={styles.meta}>· {replyCount} {replyCount === 1 ? 'reply' : 'replies'}</Text>
          )}
        </View>

        {!isCollapsed && (
          <>
            <Text style={styles.content}>{node.content}</Text>
            <View style={styles.actions}>
              {userId && (
                <TouchableOpacity onPress={handleLike}>
                  <Text style={[styles.action, liked && styles.actionActive]}>
                    {liked ? '▲ liked' : '△ like'}
                  </Text>
                </TouchableOpacity>
              )}
              {userId && (
                <TouchableOpacity onPress={() => setShowReply(s => !s)}>
                  <Text style={styles.action}>reply</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </View>

      {!isCollapsed && showReply && (
        <CommentComposer
          postId={postId}
          parentId={node.id}
          parentUsername={node.profile.username}
          onSubmit={() => setShowReply(false)}
          onCancel={() => setShowReply(false)}
        />
      )}
    </View>
  )
}
```

- [ ] **Step 3: CommentList (mobile)**

```tsx
import React, { useState, useCallback } from 'react'
import { View } from 'react-native'
import { CommentItem } from './CommentItem'
import type { CommentNode } from '@solbook/shared/types'

interface Props {
  nodes: CommentNode[]
  postId: string
  userId: string | null
}

function countDescendants(node: CommentNode): number {
  return node.children.reduce((acc, child) => acc + 1 + countDescendants(child), 0)
}

export function CommentList({ nodes, postId, userId }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const toggle = useCallback((id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  function renderNode(node: CommentNode, depth: number): React.ReactNode {
    const isCollapsed = collapsed.has(node.id)
    return (
      <View key={node.id}>
        <CommentItem
          node={node}
          postId={postId}
          userId={userId}
          depth={depth}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => toggle(node.id)}
          replyCount={countDescendants(node)}
        />
        {!isCollapsed && node.children.map(child => renderNode(child, depth + 1))}
      </View>
    )
  }

  return <View>{nodes.map(n => renderNode(n, 0))}</View>
}
```

- [ ] **Step 4: Wire up the mobile post detail screen**

Replace `apps/mobile/app/post/[id].tsx` with:

```tsx
import React, { useEffect, useMemo, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/ThemeContext'
import { font } from '@/lib/theme'
import { PostCard } from '@/components/PostCard'
import { ScreenHeader } from '@/components/ScreenHeader'
import { CommentComposer } from '@/components/comments/CommentComposer'
import { CommentList } from '@/components/comments/CommentList'
import { getComments } from '@/lib/comments'
import { FeedPost } from '@/lib/api'
import type { CommentNode } from '@solbook/shared/types'

export default function PostDetailScreen() {
  const { colors } = useTheme()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [post, setPost] = useState<FeedPost | null>(null)
  const [comments, setComments] = useState<CommentNode[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    empty: { fontFamily: font.regular, fontSize: 13, color: colors.muted, textAlign: 'center', padding: 24 },
  }), [colors])

  async function loadData() {
    if (!id) return
    const { data: { user } } = await supabase.auth.getUser()
    setUserId(user?.id ?? null)

    const { data } = await supabase
      .from('posts')
      .select(`
        id, content, created_at,
        profiles!posts_user_id_fkey ( username, display_name ),
        likes ( id, user_id )
      `)
      .eq('id', id)
      .single()

    if (!data) { router.back(); return }

    const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles
    const likes = (data.likes as any[]) ?? []

    setPost({
      id: data.id,
      content: data.content,
      createdAt: data.created_at,
      author: { username: profile?.username ?? 'unknown', displayName: profile?.display_name ?? 'Unknown' },
      likeCount: likes.length,
      likedByMe: likes.some((l) => l.user_id === user?.id),
    })

    const tree = await getComments(id)
    setComments(tree)
    setLoading(false)
  }

  useEffect(() => { loadData() }, [id])

  return (
    <View style={styles.container}>
      <ScreenHeader title="post" showBack />
      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={colors.accent} /></View>
      ) : (
        <ScrollView>
          {post && <PostCard {...post} />}
          {userId && <CommentComposer postId={id!} onSubmit={loadData} />}
          {comments.length === 0 ? (
            <Text style={styles.empty}>no comments yet</Text>
          ) : (
            <CommentList nodes={comments} postId={id!} userId={userId} />
          )}
        </ScrollView>
      )}
    </View>
  )
}
```

- [ ] **Step 5: Smoke-test on mobile**

```bash
cd apps/mobile && bun run start
```

Open the post detail screen. Verify comments load, composer works, reply + collapse + like all function correctly.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/lib/comments.ts apps/mobile/components/comments/ apps/mobile/app/post/\[id\].tsx
git commit -m "feat(mobile): add comment thread to post detail screen"
```

---

## Final Verification

- [ ] Run all web tests: `cd apps/web && bun run test` — expect all passing
- [ ] Build check: `cd /Users/gabriel.sampson/Dev/sampsn/projects/solbook && bun run build` — expect no type errors
- [ ] Verify comment on post → appears in alerts as "commented"
- [ ] Verify reply to comment → appears in alerts as "replied"
- [ ] Verify like on comment → appears in alerts as "liked your comment"
