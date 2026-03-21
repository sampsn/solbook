# Solbook MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Solbook MVP — a human-only text-based social media platform with text posts, likes, follows, feeds, passkey + phone auth, and a layered anti-AI protection system.

**Architecture:** Turborepo monorepo with Next.js 15 (App Router) as the frontend and Supabase as the backend (Auth, PostgreSQL, RLS). All data access flows exclusively through Next.js server components and server actions using the Supabase service role key — the `anon` role has zero permissions and PostgREST is effectively locked down. Anti-AI protections are enforced at the edge (Vercel Middleware + Upstash Redis), at the application layer (no public API), and at the input layer (paste prevention in the composer).

**Tech Stack:** pnpm + Turborepo, Next.js 15 (App Router), Supabase CLI, Tailwind CSS v4, Vitest, @simplewebauthn/server + @simplewebauthn/browser, @upstash/ratelimit + @upstash/redis, Vercel CLI, GitHub CLI (`gh`)

---

## Scope Note

This plan is organized in 4 phases. Each phase produces deployable, testable software:

- **Phase 1 — Foundation:** Monorepo, DB schema, shared package, Next.js scaffold, README/ROADMAP, anti-AI infrastructure
- **Phase 2 — Authentication:** Phone OTP signup, passkey registration, login, profile creation
- **Phase 3 — App Shell:** Layouts, navigation, landing page
- **Phase 4 — Core Features:** Posts, likes, follows, feeds, notifications, settings

---

## File Map

```
solbook/
├── apps/
│   ├── web/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── layout.tsx                     # Root HTML shell, meta tags, X-Robots-Tag
│   │   │   │   ├── page.tsx                       # Landing page
│   │   │   │   ├── (auth)/
│   │   │   │   │   ├── login/page.tsx             # Passkey login + OTP fallback
│   │   │   │   │   └── signup/page.tsx            # Multi-step signup
│   │   │   │   ├── (app)/
│   │   │   │   │   ├── layout.tsx                 # Authenticated shell (sidebar/bottom nav)
│   │   │   │   │   ├── home/page.tsx
│   │   │   │   │   ├── discover/page.tsx
│   │   │   │   │   ├── compose/page.tsx
│   │   │   │   │   ├── notifications/page.tsx
│   │   │   │   │   └── settings/page.tsx
│   │   │   │   ├── [username]/page.tsx            # Public profile
│   │   │   │   └── post/[id]/page.tsx             # Single post view
│   │   │   ├── components/
│   │   │   │   ├── nav/
│   │   │   │   │   ├── Sidebar.tsx
│   │   │   │   │   └── BottomNav.tsx
│   │   │   │   ├── posts/
│   │   │   │   │   ├── PostCard.tsx
│   │   │   │   │   ├── PostComposer.tsx           # Paste-prevention textarea
│   │   │   │   │   └── PostFeed.tsx
│   │   │   │   ├── profiles/
│   │   │   │   │   └── ProfileHeader.tsx
│   │   │   │   └── ui/
│   │   │   │       └── Button.tsx
│   │   │   ├── actions/
│   │   │   │   ├── auth.ts                        # signup, login, logout server actions
│   │   │   │   ├── posts.ts                       # createPost server action
│   │   │   │   ├── likes.ts                       # toggleLike server action
│   │   │   │   └── follows.ts                     # toggleFollow server action
│   │   │   └── middleware.ts                      # Rate limit, UA block, honeypot
│   │   ├── public/
│   │   │   ├── robots.txt
│   │   │   └── ai.txt
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   └── package.json
│   └── mobile/
│       └── package.json                           # Stub only
├── packages/
│   └── shared/
│       ├── src/
│       │   ├── types/index.ts                     # Profile, Post, Like, Follow types
│       │   ├── validation/index.ts                # validatePost, validateUsername
│       │   └── supabase/server.ts                 # Service-role Supabase client
│       ├── package.json
│       └── tsconfig.json
├── supabase/
│   ├── migrations/
│   │   └── 20260320000000_initial_schema.sql
│   └── config.toml
├── turbo.json
├── package.json
├── pnpm-workspace.yaml
├── README.md
└── ROADMAP.md
```

---

## Phase 1 — Foundation

---

### Task 1: Initialize Turborepo monorepo

**Files:**
- Create: `package.json` (root)
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `apps/web/package.json`
- Create: `apps/mobile/package.json`
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `.gitignore` (update)

- [ ] **Step 1: Install pnpm globally if not already installed**

```bash
npm install -g pnpm
pnpm --version
```
Expected: version 9.x or higher printed

- [ ] **Step 2: Initialize root package.json**

```bash
cd /path/to/solbook
```

Create `package.json`:
```json
{
  "name": "solbook",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "test": "turbo test",
    "lint": "turbo lint"
  },
  "devDependencies": {
    "turbo": "latest",
    "typescript": "^5"
  }
}
```

- [ ] **Step 3: Create pnpm workspace config**

Create `pnpm-workspace.yaml`:
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 4: Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "lint": {}
  }
}
```

- [ ] **Step 5: Create apps/web/package.json**

```json
{
  "name": "web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run"
  },
  "dependencies": {
    "@solbook/shared": "workspace:*",
    "next": "15.x",
    "react": "^19",
    "react-dom": "^19"
  },
  "devDependencies": {
    "@types/node": "^22",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@vitejs/plugin-react": "^4",
    "vitest": "^3",
    "@testing-library/react": "^16",
    "@testing-library/user-event": "^14",
    "typescript": "^5"
  }
}
```

- [ ] **Step 6: Create apps/mobile/package.json (stub)**

```json
{
  "name": "mobile",
  "version": "0.1.0",
  "private": true,
  "description": "React Native / Expo app — placeholder, not yet implemented"
}
```

- [ ] **Step 7: Create packages/shared/package.json**

```json
{
  "name": "@solbook/shared",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./types": "./src/types/index.ts",
    "./validation": "./src/validation/index.ts",
    "./supabase": "./src/supabase/server.ts"
  },
  "scripts": {
    "test": "vitest run"
  },
  "devDependencies": {
    "typescript": "^5",
    "vitest": "^3"
  }
}
```

- [ ] **Step 8: Create packages/shared/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

- [ ] **Step 9: Create packages/shared/src/index.ts**

```ts
export * from './types/index'
export * from './validation/index'
```

- [ ] **Step 10: Install root dependencies**

```bash
pnpm install
```
Expected: `node_modules` created, lockfile generated

- [ ] **Step 11: Commit**

```bash
git add .
git commit -m "feat: initialize turborepo monorepo with pnpm workspaces"
```

---

### Task 2: Set up Supabase locally

**Files:**
- Create: `supabase/config.toml` (via CLI)
- Create: `.env.local` template

- [ ] **Step 1: Initialize Supabase in the repo root**

```bash
supabase init
```
Expected: `supabase/` directory created with `config.toml`

- [ ] **Step 2: Start local Supabase**

```bash
supabase start
```
Expected: Local Supabase stack running. Note the printed `API URL`, `anon key`, and `service_role key`.

- [ ] **Step 3: Create .env.local.example in apps/web**

```bash
# apps/web/.env.local.example
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
# No NEXT_PUBLIC_SUPABASE_URL — client code never talks to Supabase directly
# No NEXT_PUBLIC_SUPABASE_ANON_KEY — anon role has no permissions
NEXT_PUBLIC_RP_ID=localhost
NEXT_PUBLIC_ORIGIN=http://localhost:3000
UPSTASH_REDIS_REST_URL=your-upstash-url
UPSTASH_REDIS_REST_TOKEN=your-upstash-token
```

- [ ] **Step 4: Copy to .env.local and fill in local values from step 2 output**

```bash
cp apps/web/.env.local.example apps/web/.env.local
```

Fill in `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from `supabase start` output.

- [ ] **Step 5: Verify .gitignore excludes .env.local**

Ensure `.gitignore` contains:
```
.env.local
.env*.local
```

- [ ] **Step 6: Commit**

```bash
git add supabase/ apps/web/.env.local.example
git commit -m "feat: initialize supabase local development setup"
```

---

### Task 3: Database schema migrations

**Files:**
- Create: `supabase/migrations/20260320000000_initial_schema.sql`

- [ ] **Step 1: Create the migration file**

```bash
supabase migration new initial_schema
```
Expected: `supabase/migrations/20260320000000_initial_schema.sql` created

- [ ] **Step 2: Write the migration**

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles (extends auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null,
  bio text,
  avatar_url text,
  created_at timestamptz not null default now(),
  constraint username_format check (username ~ '^[a-zA-Z0-9_]{3,20}$'),
  constraint username_not_reserved check (
    username not in (
      'home', 'discover', 'compose', 'notifications',
      'settings', 'login', 'signup', 'api', 'admin', 'post'
    )
  ),
  constraint display_name_length check (char_length(display_name) between 1 and 50),
  constraint bio_length check (bio is null or char_length(bio) <= 160)
);

-- Posts
create table public.posts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  constraint content_length check (char_length(content) between 1 and 280)
);

-- Likes
create table public.likes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, post_id)
);

-- Follows
create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint no_self_follow check (follower_id <> following_id)
);

-- Passkey credentials (for SimpleWebAuthn)
create table public.passkey_credentials (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  credential_id text unique not null,
  public_key text not null,
  counter bigint not null default 0,
  device_type text,
  backed_up boolean not null default false,
  created_at timestamptz not null default now()
);

-- Indexes for query performance
create index posts_user_id_created_at_idx on public.posts (user_id, created_at desc);
create index posts_created_at_idx on public.posts (created_at desc);
create index likes_post_id_created_at_idx on public.likes (post_id, created_at desc);
create index likes_user_id_idx on public.likes (user_id);
create index follows_follower_id_idx on public.follows (follower_id);
create index follows_following_id_idx on public.follows (following_id);
create index passkey_credentials_user_id_idx on public.passkey_credentials (user_id);

-- Row Level Security: enabled on all tables
-- anon role has NO permissions — all access via service role key in Next.js server layer
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.likes enable row level security;
alter table public.follows enable row level security;
alter table public.passkey_credentials enable row level security;

-- No RLS policies granted to anon or authenticated roles.
-- Service role bypasses RLS entirely — used exclusively in server-side code.
```

- [ ] **Step 3: Apply the migration locally**

```bash
supabase db push
```
Expected: Migration applied, no errors

- [ ] **Step 4: Verify tables exist**

```bash
supabase db diff
```
Expected: No diff (migration is in sync)

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/
git commit -m "feat: add initial database schema with RLS enabled, anon role locked out"
```

---

### Task 4: Build the shared package

**Files:**
- Create: `packages/shared/src/types/index.ts`
- Create: `packages/shared/src/validation/index.ts`
- Create: `packages/shared/src/validation/index.test.ts`
- Create: `packages/shared/src/supabase/server.ts`

- [ ] **Step 1: Write failing tests for validation**

Create `packages/shared/src/validation/index.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { validatePost, validateUsername, RESERVED_USERNAMES } from './index'

describe('validatePost', () => {
  it('accepts valid content', () => {
    expect(validatePost('Hello world').valid).toBe(true)
  })

  it('rejects empty content', () => {
    const result = validatePost('')
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/empty/i)
  })

  it('rejects content over 280 chars', () => {
    const result = validatePost('a'.repeat(281))
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/280/i)
  })

  it('accepts content of exactly 280 chars', () => {
    expect(validatePost('a'.repeat(280)).valid).toBe(true)
  })
})

describe('validateUsername', () => {
  it('accepts valid username', () => {
    expect(validateUsername('gabriel_99').valid).toBe(true)
  })

  it('rejects username shorter than 3 chars', () => {
    const result = validateUsername('ab')
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/3/i)
  })

  it('rejects username longer than 20 chars', () => {
    const result = validateUsername('a'.repeat(21))
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/20/i)
  })

  it('rejects username with invalid characters', () => {
    const result = validateUsername('bad-name!')
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/letters/i)
  })

  it('rejects reserved usernames', () => {
    for (const reserved of RESERVED_USERNAMES) {
      const result = validateUsername(reserved)
      expect(result.valid).toBe(false)
      expect(result.error).toMatch(/reserved/i)
    }
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd packages/shared && pnpm test
```
Expected: FAIL — `validatePost` and `validateUsername` not found

- [ ] **Step 3: Implement types**

Create `packages/shared/src/types/index.ts`:
```ts
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
}

export interface Like {
  id: string
  user_id: string
  post_id: string
  created_at: string
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
```

- [ ] **Step 4: Implement validation**

Create `packages/shared/src/validation/index.ts`:
```ts
export const RESERVED_USERNAMES = [
  'home', 'discover', 'compose', 'notifications',
  'settings', 'login', 'signup', 'api', 'admin', 'post',
] as const

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/

interface ValidationResult {
  valid: boolean
  error?: string
}

export function validatePost(content: string): ValidationResult {
  if (!content || content.trim().length === 0) {
    return { valid: false, error: 'Post cannot be empty.' }
  }
  if (content.length > 280) {
    return { valid: false, error: 'Post must be 280 characters or fewer.' }
  }
  return { valid: true }
}

export function validateUsername(username: string): ValidationResult {
  if (username.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters.' }
  }
  if (username.length > 20) {
    return { valid: false, error: 'Username must be 20 characters or fewer.' }
  }
  if (!USERNAME_REGEX.test(username)) {
    return { valid: false, error: 'Username may only contain letters, numbers, and underscores.' }
  }
  if ((RESERVED_USERNAMES as readonly string[]).includes(username.toLowerCase())) {
    return { valid: false, error: 'That username is reserved.' }
  }
  return { valid: true }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd packages/shared && pnpm test
```
Expected: All tests PASS

- [ ] **Step 6: Create Supabase server client**

Create `packages/shared/src/supabase/server.ts`:
```ts
import { createClient } from '@supabase/supabase-js'

// Service role client — NEVER import this in client components.
// Used only in Next.js server components and server actions.
export function createServerClient() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.'
    )
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
```

- [ ] **Step 7: Install Supabase JS in shared package**

```bash
pnpm --filter @solbook/shared add @supabase/supabase-js
```

- [ ] **Step 8: Commit**

```bash
git add packages/shared/
git commit -m "feat: add shared package with types, validation, and server-side supabase client"
```

---

### Task 5: Scaffold Next.js app

**Files:**
- Create: `apps/web/next.config.ts`
- Create: `apps/web/tailwind.config.ts`
- Create: `apps/web/src/app/globals.css`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/vitest.config.ts`

- [ ] **Step 1: Install Next.js app dependencies**

```bash
pnpm --filter web add next@15 react@19 react-dom@19
pnpm --filter web add -D typescript @types/node @types/react @types/react-dom tailwindcss @tailwindcss/vite vitest @vitejs/plugin-react @testing-library/react @testing-library/user-event jsdom
```

- [ ] **Step 2: Create tsconfig.json**

Create `apps/web/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create next.config.ts**

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // No client-side Supabase env vars exposed
  // All data access via server components/actions
}

export default nextConfig
```

- [ ] **Step 4: Create tailwind.config.ts**

```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
}

export default config
```

- [ ] **Step 5: Create vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
```

- [ ] **Step 6: Create src/app/globals.css**

```css
@import "tailwindcss";
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/
git commit -m "feat: scaffold next.js app with tailwind and vitest configuration"
```

---

### Task 6: Write README and ROADMAP

**Files:**
- Modify: `README.md`
- Create: `ROADMAP.md`

- [ ] **Step 1: Write README.md**

```markdown
# Solbook

A human-only, text-based social media platform. A sanctuary where you know you're talking to humans.

Solbook is open source. The goal is simple: build a space free from AI-generated content, bots, and scrapers — where real people can have real conversations.

---

## The Mission

As AI-generated content floods the internet, genuine human connection online becomes harder to find. Solbook is a deliberate counter to that. Every design decision prioritizes human presence over scale, authenticity over virality.

---

## Anti-AI Protections

All protections are documented here so contributors can understand, maintain, and improve them.

### Declarative
- **`robots.txt`** — Disallows all known AI crawler user-agents by name
- **`ai.txt`** — Opts out of AI training under the emerging `ai.txt` standard
- **`noai` / `noimageai` meta tags** — On every page, signals to compliant crawlers that content must not be used for training
- **`X-Robots-Tag: noai, noimageai`** — Same signal delivered as an HTTP response header

### Edge-Level (Vercel Middleware + Upstash Redis)
- **Rate limiting** — Strict per-IP request limits on all routes; tighter limits on unauthenticated routes, enforced before any request reaches the application
- **User-agent blocking** — Known scraper and bot user-agents are blocked at the edge
- **Honeypot routes** — Fake API-style routes (e.g. `/api/v1/feed`) that real users never visit. Any IP that hits a honeypot is written to Upstash Redis and blacklisted on all subsequent requests

### Application-Level
- **No public API** — There is no REST or GraphQL API. All data is served via Next.js server components (SSR). No endpoint exists for a scraper to query programmatically.
- **Supabase locked down** — The Supabase `anon` role has zero permissions. The PostgREST endpoint is effectively inaccessible. All database access requires the service role key, which lives only in server-side environment variables.
- **No client-side database queries** — The browser never talks to Supabase directly.

### Input-Level
- **Paste disabled in the composer** — Users must type their posts manually. This makes it significantly harder to generate content at scale using AI tools.

### Human Verification
- **Phone number + SMS OTP** — Required at signup, links accounts to real phone numbers
- **Passkeys (WebAuthn)** — Hardware-bound credentials tied to the user's device secure enclave. Phishing-resistant, cannot be scripted from a headless environment.

### Future Protections (see ROADMAP)
- Behavioral biometrics (typing cadence analysis)
- Red-team agent test suite — automated CI tests that simulate scrapers and bot signups to verify protections hold
- End-to-end encryption of post content

---

## Tech Stack

- **Monorepo:** Turborepo + pnpm workspaces
- **Frontend:** Next.js 15 (App Router)
- **Backend:** Supabase (Auth, PostgreSQL, RLS)
- **Styling:** Tailwind CSS
- **Hosting:** Vercel (web), Supabase Cloud
- **Edge:** Upstash Redis (IP blacklisting)
- **Mobile:** React Native / Expo (planned)

---

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for the full list of planned features.

---

## Contributing

This is an open source project. Contributions to both features and anti-AI protections are welcome.

- Each feature or fix should be on its own branch
- Open a PR and describe what you're changing and why
- If you're adding or improving an anti-AI protection, document it in this README

---

## License

See [LICENSE](./LICENSE).
```

- [ ] **Step 2: Write ROADMAP.md**

```markdown
# Solbook Roadmap

This is a living document. Items move, get added, and get removed as the project evolves.

---

## MVP (In Progress)

- [x] Monorepo setup (Turborepo + pnpm)
- [x] Supabase schema (profiles, posts, likes, follows)
- [x] Anti-AI infrastructure (robots.txt, ai.txt, middleware, rate limiting, honeypots)
- [ ] Authentication (phone OTP + passkey / WebAuthn)
- [ ] Post creation (280 char limit, paste disabled)
- [ ] Likes
- [ ] Follow / Unfollow
- [ ] Home feed (followed users, cursor-paginated)
- [ ] Discovery feed (trending by likes in 48h window)
- [ ] Public profiles
- [ ] Single post view
- [ ] Notifications (computed on read)
- [ ] Settings page
- [ ] README anti-AI documentation

---

## Next Up

- [ ] Comments (flat replies on posts)
- [ ] Threaded replies (Hacker News-style nested conversations)
- [ ] Reposts / reshares
- [ ] Real-time notifications (persistent table + Supabase Realtime)
- [ ] Avatar / image uploads (Supabase Storage)
- [ ] Blog/article posts (long-form with title; two post type selector)

---

## Future

- [ ] React Native mobile app (Expo)
- [ ] Go backend (replace Supabase-direct when API complexity demands it)
- [ ] Behavioral biometrics (typing cadence analysis, with privacy policy)
- [ ] End-to-end encryption of post content
- [ ] Red-team agent test suite — Claude Code agents that simulate scrapers and bot signups, run in CI to verify anti-AI protections hold
- [ ] Advanced human verification (device attestation: Apple App Attest, Android Play Integrity)
```

- [ ] **Step 3: Commit**

```bash
git add README.md ROADMAP.md
git commit -m "docs: add README with anti-AI documentation and ROADMAP"
```

---

### Task 7: Anti-AI infrastructure

**Files:**
- Create: `apps/web/public/robots.txt`
- Create: `apps/web/public/ai.txt`
- Create: `apps/web/src/middleware.ts`
- Create: `apps/web/src/middleware.test.ts`

- [ ] **Step 1: Install Upstash dependencies**

```bash
pnpm --filter web add @upstash/ratelimit @upstash/redis
```

- [ ] **Step 2: Create robots.txt**

```
User-agent: *
Disallow: /api/

# AI crawlers — disallowed
User-agent: GPTBot
Disallow: /

User-agent: ChatGPT-User
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: anthropic-ai
Disallow: /

User-agent: Claude-Web
Disallow: /

User-agent: cohere-ai
Disallow: /

User-agent: Diffbot
Disallow: /

User-agent: FacebookBot
Disallow: /

User-agent: Omgilibot
Disallow: /

User-agent: PerplexityBot
Disallow: /

User-agent: YouBot
Disallow: /
```

- [ ] **Step 3: Create ai.txt**

```
# ai.txt — https://site.ai/
# This site opts out of AI training.

disallow: *
```

- [ ] **Step 4: Write failing tests for middleware helpers**

Create `apps/web/src/middleware.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { isKnownBot, isHoneypotRoute } from './middleware'

describe('isKnownBot', () => {
  it('detects GPTBot', () => {
    expect(isKnownBot('GPTBot/1.0')).toBe(true)
  })

  it('detects CCBot', () => {
    expect(isKnownBot('CCBot/2.0')).toBe(true)
  })

  it('allows normal browsers', () => {
    expect(isKnownBot('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe(false)
  })

  it('is case-insensitive', () => {
    expect(isKnownBot('gptbot/1.0')).toBe(true)
  })
})

describe('isHoneypotRoute', () => {
  it('detects honeypot API routes', () => {
    expect(isHoneypotRoute('/api/v1/feed')).toBe(true)
    expect(isHoneypotRoute('/api/v1/posts')).toBe(true)
    expect(isHoneypotRoute('/sitemap.xml')).toBe(true)
  })

  it('allows real routes', () => {
    expect(isHoneypotRoute('/home')).toBe(false)
    expect(isHoneypotRoute('/')).toBe(false)
  })
})
```

- [ ] **Step 5: Run tests to verify they fail**

```bash
cd apps/web && pnpm test
```
Expected: FAIL — `isKnownBot` and `isHoneypotRoute` not found

- [ ] **Step 6: Create middleware.ts**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// --- Bot detection ---

const BOT_USER_AGENTS = [
  'gptbot', 'chatgpt-user', 'google-extended', 'ccbot', 'anthropic-ai',
  'claude-web', 'cohere-ai', 'diffbot', 'facebookbot', 'omgilibot',
  'perplexitybot', 'youbot', 'applebot', 'bingbot', 'semrushbot',
  'ahrefsbot', 'mj12bot',
]

export function isKnownBot(userAgent: string): boolean {
  const ua = userAgent.toLowerCase()
  return BOT_USER_AGENTS.some((bot) => ua.includes(bot))
}

// --- Honeypot routes ---

const HONEYPOT_ROUTES = [
  '/api/v1/feed',
  '/api/v1/posts',
  '/api/v1/users',
  '/api/feed',
  '/api/posts',
  '/feed.json',
  '/sitemap.xml',
  '/wp-admin',
  '/wp-login.php',
  '/.env',
]

export function isHoneypotRoute(pathname: string): boolean {
  return HONEYPOT_ROUTES.some((route) => pathname.startsWith(route))
}

// --- Rate limiter (lazy-initialized to avoid build-time errors) ---

let ratelimit: Ratelimit | null = null
let blacklist: Redis | null = null

function getRatelimit() {
  if (!ratelimit) {
    const redis = Redis.fromEnv()
    ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, '1 m'), // 60 req/min per IP
    })
    blacklist = redis
  }
  return { ratelimit: ratelimit!, blacklist: blacklist! }
}

// --- Middleware ---

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const ip = request.ip ?? request.headers.get('x-forwarded-for') ?? 'unknown'
  const userAgent = request.headers.get('user-agent') ?? ''

  // Block known bots immediately
  if (isKnownBot(userAgent)) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  // Honeypot: blacklist the IP and return 404
  if (isHoneypotRoute(pathname)) {
    try {
      const { blacklist: redis } = getRatelimit()
      await redis.set(`blacklist:${ip}`, '1', { ex: 60 * 60 * 24 * 7 }) // 7 days
    } catch {
      // Don't fail if Redis is unavailable
    }
    return new NextResponse(null, { status: 404 })
  }

  // Check IP blacklist
  try {
    const { blacklist: redis } = getRatelimit()
    const isBlacklisted = await redis.get(`blacklist:${ip}`)
    if (isBlacklisted) {
      return new NextResponse('Forbidden', { status: 403 })
    }
  } catch {
    // Don't fail if Redis is unavailable
  }

  // Rate limiting
  try {
    const { ratelimit: limiter } = getRatelimit()
    const { success } = await limiter.limit(ip)
    if (!success) {
      return new NextResponse('Too Many Requests', { status: 429 })
    }
  } catch {
    // Don't fail if Redis is unavailable — degrade gracefully
  }

  // Add anti-AI headers to all responses
  const response = NextResponse.next()
  response.headers.set('X-Robots-Tag', 'noai, noimageai')
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
```

- [ ] **Step 7: Run tests to verify they pass**

```bash
cd apps/web && pnpm test
```
Expected: All tests PASS

- [ ] **Step 8: Commit**

```bash
git add apps/web/public/robots.txt apps/web/public/ai.txt apps/web/src/middleware.ts apps/web/src/middleware.test.ts
git commit -m "feat: add anti-AI infrastructure (robots.txt, ai.txt, rate limiting, honeypot, UA blocking)"
```

---

## Phase 2 — Authentication

---

### Task 8: Install auth dependencies and create auth utilities

**Files:**
- Create: `apps/web/src/lib/auth.ts`
- Create: `packages/shared/src/supabase/auth.ts`

- [ ] **Step 1: Install SimpleWebAuthn**

```bash
pnpm --filter web add @simplewebauthn/server @simplewebauthn/browser
pnpm --filter web add -D @simplewebauthn/types
```

- [ ] **Step 2: Create auth session utility**

Create `apps/web/src/lib/auth.ts`:
```ts
import { cookies } from 'next/headers'
import { createServerClient } from '@solbook/shared/supabase'

// Returns the authenticated user's profile, or null if not logged in.
// Call this from server components and server actions.
export async function getSession(): Promise<{ userId: string } | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('sb-auth-token')?.value
  if (!token) return null

  const supabase = createServerClient()
  // auth.admin.getUser is the documented way to validate a JWT with the service role client
  const { data: { user }, error } = await supabase.auth.admin.getUser(token)

  if (error || !user) return null
  return { userId: user.id }
}

// Redirects to /login if session is missing. Use in authenticated server components.
export async function requireSession() {
  const session = await getSession()
  if (!session) {
    const { redirect } = await import('next/navigation')
    redirect('/login')
  }
  return session
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/
git commit -m "feat: add server-side session utilities"
```

---

### Task 9: Signup page — phone OTP step

**Files:**
- Create: `apps/web/src/app/(auth)/signup/page.tsx`
- Create: `apps/web/src/actions/auth.ts` (phone OTP actions)

- [ ] **Step 1: Create phone OTP server actions**

Create `apps/web/src/actions/auth.ts`:
```ts
'use server'

import { createServerClient } from '@solbook/shared/supabase'
import { redirect } from 'next/navigation'

export async function sendPhoneOtp(phone: string) {
  const supabase = createServerClient()
  const { error } = await supabase.auth.signInWithOtp({
    phone,
    options: { channel: 'sms' },
  })

  if (error) {
    return { error: error.message }
  }
  return { success: true }
}

export async function verifyPhoneOtp(phone: string, token: string) {
  const supabase = createServerClient()
  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: 'sms',
  })

  if (error || !data.session) {
    return { error: error?.message ?? 'Verification failed.' }
  }

  // Return session token to be stored as a cookie by the client
  return { success: true, accessToken: data.session.access_token }
}

export async function logout() {
  const supabase = createServerClient()
  await supabase.auth.signOut()
  redirect('/login')
}
```

- [ ] **Step 2: Create signup page (multi-step)**

Create `apps/web/src/app/(auth)/signup/page.tsx`:
```tsx
import { Metadata } from 'next'
import SignupFlow from './SignupFlow'

export const metadata: Metadata = {
  title: 'Sign up — Solbook',
}

export default function SignupPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-8">Join Solbook</h1>
        <SignupFlow />
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Create SignupFlow client component**

Create `apps/web/src/app/(auth)/signup/SignupFlow.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { sendPhoneOtp, verifyPhoneOtp } from '@/actions/auth'
import PhoneStep from './PhoneStep'
import OtpStep from './OtpStep'
import PasskeyStep from './PasskeyStep'
import ProfileStep from './ProfileStep'

type Step = 'phone' | 'otp' | 'passkey' | 'profile'

export default function SignupFlow() {
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [accessToken, setAccessToken] = useState('')

  return (
    <>
      {step === 'phone' && (
        <PhoneStep
          onSubmit={async (phoneNumber) => {
            const result = await sendPhoneOtp(phoneNumber)
            if (result.error) return result.error
            setPhone(phoneNumber)
            setStep('otp')
          }}
        />
      )}
      {step === 'otp' && (
        <OtpStep
          phone={phone}
          onVerified={(token) => {
            setAccessToken(token)
            setStep('passkey')
          }}
        />
      )}
      {step === 'passkey' && (
        <PasskeyStep
          accessToken={accessToken}
          onComplete={() => setStep('profile')}
          onSkip={() => setStep('profile')}
        />
      )}
      {step === 'profile' && (
        <ProfileStep accessToken={accessToken} />
      )}
    </>
  )
}
```

- [ ] **Step 4: Create PhoneStep component**

Create `apps/web/src/app/(auth)/signup/PhoneStep.tsx`:
```tsx
'use client'

import { useState } from 'react'

interface Props {
  onSubmit: (phone: string) => Promise<string | undefined>
}

export default function PhoneStep({ onSubmit }: Props) {
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const err = await onSubmit(phone)
    if (err) setError(err)
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-gray-600">Enter your phone number to get started.</p>
      <input
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="+1 555 000 0000"
        required
        className="w-full border rounded px-3 py-2 text-sm"
      />
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-black text-white rounded py-2 text-sm font-medium disabled:opacity-50"
      >
        {loading ? 'Sending…' : 'Send code'}
      </button>
    </form>
  )
}
```

- [ ] **Step 5: Create OtpStep component**

Create `apps/web/src/app/(auth)/signup/OtpStep.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { verifyPhoneOtp } from '@/actions/auth'

interface Props {
  phone: string
  onVerified: (accessToken: string) => void
}

export default function OtpStep({ phone, onVerified }: Props) {
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await verifyPhoneOtp(phone, otp)
    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }
    onVerified(result.accessToken!)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-gray-600">
        Enter the code sent to {phone}.
      </p>
      <input
        type="text"
        inputMode="numeric"
        maxLength={6}
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
        placeholder="000000"
        required
        className="w-full border rounded px-3 py-2 text-sm tracking-widest text-center"
      />
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-black text-white rounded py-2 text-sm font-medium disabled:opacity-50"
      >
        {loading ? 'Verifying…' : 'Verify'}
      </button>
    </form>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/(auth)/signup/ apps/web/src/actions/auth.ts
git commit -m "feat: add signup flow with phone OTP verification"
```

---

### Task 10: Signup — passkey registration step

**Files:**
- Create: `apps/web/src/app/(auth)/signup/PasskeyStep.tsx`
- Create: `apps/web/src/app/api/passkey/register-options/route.ts`
- Create: `apps/web/src/app/api/passkey/register-verify/route.ts`

> Note: These are internal Next.js route handlers called only from the passkey registration step — not a public API. Honeypot routes cover `/api/v1/*`; the passkey routes are at `/api/passkey/*` and are only called with a valid session token.

> **Challenge storage:** WebAuthn challenges are stored in Upstash Redis (already a project dependency) with a short TTL. This is the correct pattern — Redis avoids polluting the credentials table with sentinel rows and is safe under concurrent registrations.

- [ ] **Step 1: Create passkey registration options route**

Create `apps/web/src/app/api/passkey/register-options/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server'
import { generateRegistrationOptions } from '@simplewebauthn/server'
import { createServerClient } from '@solbook/shared/supabase'
import { Redis } from '@upstash/redis'

const RP_NAME = 'Solbook'
const RP_ID = process.env.NEXT_PUBLIC_RP_ID ?? 'localhost'

export async function POST(req: NextRequest) {
  const { accessToken } = await req.json()
  const supabase = createServerClient()

  const { data: { user } } = await supabase.auth.admin.getUser(accessToken)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get existing credentials to exclude
  const { data: existing } = await supabase
    .from('passkey_credentials')
    .select('credential_id')
    .eq('user_id', user.id)

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userName: user.phone ?? user.id,
    userDisplayName: user.phone ?? 'Solbook User',
    excludeCredentials: (existing ?? []).map((c) => ({
      id: c.credential_id,
    })),
    authenticatorSelection: {
      residentKey: 'required',
      userVerification: 'required',
    },
  })

  // Store challenge in Redis with 5-minute TTL
  const redis = Redis.fromEnv()
  await redis.set(`passkey_challenge:${user.id}`, options.challenge, { ex: 300 })

  return NextResponse.json(options)
}
```

- [ ] **Step 2: Create passkey verification route**

Create `apps/web/src/app/api/passkey/register-verify/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyRegistrationResponse } from '@simplewebauthn/server'
import { createServerClient } from '@solbook/shared/supabase'
import { Redis } from '@upstash/redis'

const RP_ID = process.env.NEXT_PUBLIC_RP_ID ?? 'localhost'
const ORIGIN = process.env.NEXT_PUBLIC_ORIGIN ?? 'http://localhost:3000'

export async function POST(req: NextRequest) {
  const { accessToken, registrationResponse } = await req.json()
  const supabase = createServerClient()

  const { data: { user } } = await supabase.auth.admin.getUser(accessToken)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Retrieve and delete challenge from Redis (one-time use)
  const redis = Redis.fromEnv()
  const challenge = await redis.getdel(`passkey_challenge:${user.id}`)
  if (!challenge) return NextResponse.json({ error: 'Challenge expired or not found.' }, { status: 400 })

  const verification = await verifyRegistrationResponse({
    response: registrationResponse,
    expectedChallenge: challenge as string,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    requireUserVerification: true,
  })

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: 'Passkey verification failed' }, { status: 400 })
  }

  const { credential } = verification.registrationInfo

  await supabase.from('passkey_credentials').insert({
    user_id: user.id,
    credential_id: Buffer.from(credential.id).toString('base64url'),
    public_key: Buffer.from(credential.publicKey).toString('base64url'),
    counter: credential.counter,
    device_type: credential.deviceType,
    backed_up: credential.backedUp,
  })

  return NextResponse.json({ verified: true })
}
```

- [ ] **Step 3: Create PasskeyStep client component**

Create `apps/web/src/app/(auth)/signup/PasskeyStep.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { startRegistration } from '@simplewebauthn/browser'

interface Props {
  accessToken: string
  onComplete: () => void
  onSkip: () => void
}

export default function PasskeyStep({ accessToken, onComplete, onSkip }: Props) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function registerPasskey() {
    setLoading(true)
    setError('')

    try {
      const optionsRes = await fetch('/api/passkey/register-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken }),
      })
      const options = await optionsRes.json()

      const registrationResponse = await startRegistration({ optionsJSON: options })

      const verifyRes = await fetch('/api/passkey/register-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken, registrationResponse }),
      })
      const result = await verifyRes.json()

      if (!result.verified) {
        setError('Passkey registration failed. Please try again.')
        setLoading(false)
        return
      }

      onComplete()
    } catch (err) {
      setError('Passkey setup failed. You can add one later in settings.')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="font-semibold">Set up a passkey</h2>
      <p className="text-sm text-gray-600">
        Passkeys let you sign in with your fingerprint or face. They're more secure
        than passwords and tied to your device.
      </p>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button
        onClick={registerPasskey}
        disabled={loading}
        className="w-full bg-black text-white rounded py-2 text-sm font-medium disabled:opacity-50"
      >
        {loading ? 'Setting up…' : 'Set up passkey'}
      </button>
      <button
        onClick={onSkip}
        className="w-full text-gray-500 text-sm underline"
      >
        Skip for now (you can add one in settings)
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/(auth)/signup/PasskeyStep.tsx apps/web/src/app/api/passkey/
git commit -m "feat: add passkey registration step using SimpleWebAuthn"
```

---

### Task 11: Signup — profile creation step

**Files:**
- Create: `apps/web/src/app/(auth)/signup/ProfileStep.tsx`
- Create: `apps/web/src/actions/profiles.ts`

- [ ] **Step 1: Write failing test for profile creation validation**

Add to `packages/shared/src/validation/index.test.ts`:
```ts
describe('validateDisplayName', () => {
  it('accepts valid display name', () => {
    expect(validateDisplayName('Gabriel Sampson').valid).toBe(true)
  })

  it('rejects empty display name', () => {
    expect(validateDisplayName('').valid).toBe(false)
  })

  it('rejects display name over 50 chars', () => {
    expect(validateDisplayName('a'.repeat(51)).valid).toBe(false)
  })
})
```

- [ ] **Step 2: Run to confirm failure, then add validateDisplayName**

```bash
cd packages/shared && pnpm test
```
Expected: FAIL — `validateDisplayName` not found

Add to `packages/shared/src/validation/index.ts`:
```ts
export function validateDisplayName(name: string): ValidationResult {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Display name cannot be empty.' }
  }
  if (name.length > 50) {
    return { valid: false, error: 'Display name must be 50 characters or fewer.' }
  }
  return { valid: true }
}
```

- [ ] **Step 3: Run tests to verify pass**

```bash
cd packages/shared && pnpm test
```
Expected: All PASS

- [ ] **Step 4: Create profile server action**

Create `apps/web/src/actions/profiles.ts`:
```ts
'use server'

import { createServerClient } from '@solbook/shared/supabase'
import { validateUsername, validateDisplayName } from '@solbook/shared/validation'
import { redirect } from 'next/navigation'

export async function createProfile(accessToken: string, username: string, displayName: string) {
  const usernameResult = validateUsername(username)
  if (!usernameResult.valid) return { error: usernameResult.error }

  const displayNameResult = validateDisplayName(displayName)
  if (!displayNameResult.valid) return { error: displayNameResult.error }

  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.admin.getUser(accessToken)
  if (!user) return { error: 'Session expired. Please sign in again.' }

  const { error } = await supabase.from('profiles').insert({
    id: user.id,
    username: username.toLowerCase(),
    display_name: displayName,
  })

  if (error) {
    if (error.code === '23505') return { error: 'That username is already taken.' }
    return { error: 'Failed to create profile. Please try again.' }
  }

  redirect('/home')
}
```

- [ ] **Step 5: Create ProfileStep component**

Create `apps/web/src/app/(auth)/signup/ProfileStep.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { createProfile } from '@/actions/profiles'

interface Props {
  accessToken: string
}

export default function ProfileStep({ accessToken }: Props) {
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await createProfile(accessToken, username, displayName)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
    // On success, createProfile redirects to /home
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="font-semibold">Create your profile</h2>
      <div>
        <label className="text-sm font-medium">Display name</label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={50}
          required
          className="w-full border rounded px-3 py-2 text-sm mt-1"
          placeholder="Your name"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Username</label>
        <div className="flex items-center border rounded mt-1 overflow-hidden">
          <span className="px-3 py-2 text-sm text-gray-400 bg-gray-50">@</span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            maxLength={20}
            pattern="^[a-zA-Z0-9_]{3,20}$"
            required
            className="flex-1 px-3 py-2 text-sm outline-none"
            placeholder="username"
          />
        </div>
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-black text-white rounded py-2 text-sm font-medium disabled:opacity-50"
      >
        {loading ? 'Creating…' : 'Create account'}
      </button>
    </form>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/(auth)/signup/ProfileStep.tsx apps/web/src/actions/profiles.ts packages/shared/
git commit -m "feat: add profile creation step with username validation"
```

---

### Task 12: Login page

**Files:**
- Create: `apps/web/src/app/(auth)/login/page.tsx`
- Create: `apps/web/src/app/(auth)/login/LoginFlow.tsx`
- Create: `apps/web/src/app/api/passkey/authenticate-options/route.ts`
- Create: `apps/web/src/app/api/passkey/authenticate-verify/route.ts`

- [ ] **Step 1: Create passkey authentication options route**

> Challenges are stored in Upstash Redis with a short TTL, keyed by a session identifier set in a temporary cookie.

Create `apps/web/src/app/api/passkey/authenticate-options/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { generateAuthenticationOptions } from '@simplewebauthn/server'
import { Redis } from '@upstash/redis'
import { randomBytes } from 'crypto'

const RP_ID = process.env.NEXT_PUBLIC_RP_ID ?? 'localhost'

export async function POST() {
  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    userVerification: 'required',
  })

  // Store challenge in Redis keyed by a unique session ID
  const sessionId = randomBytes(16).toString('hex')
  const redis = Redis.fromEnv()
  await redis.set(`auth_challenge:${sessionId}`, options.challenge, { ex: 300 })

  const response = NextResponse.json(options)
  // Set session ID as HttpOnly cookie for the verify step to retrieve
  response.cookies.set('passkey_session', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 300,
    path: '/',
  })
  return response
}
```

- [ ] **Step 2: Create passkey authentication verify route**

Create `apps/web/src/app/api/passkey/authenticate-verify/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthenticationResponse } from '@simplewebauthn/server'
import { createServerClient } from '@solbook/shared/supabase'
import { Redis } from '@upstash/redis'

const RP_ID = process.env.NEXT_PUBLIC_RP_ID ?? 'localhost'
const ORIGIN = process.env.NEXT_PUBLIC_ORIGIN ?? 'http://localhost:3000'

export async function POST(req: NextRequest) {
  const { authenticationResponse } = await req.json()
  const supabase = createServerClient()

  // Retrieve and delete challenge from Redis
  const sessionId = req.cookies.get('passkey_session')?.value
  if (!sessionId) return NextResponse.json({ error: 'Session expired.' }, { status: 400 })

  const redis = Redis.fromEnv()
  const challenge = await redis.getdel(`auth_challenge:${sessionId}`)
  if (!challenge) return NextResponse.json({ error: 'Challenge expired.' }, { status: 400 })

  const credentialId = Buffer.from(
    authenticationResponse.rawId, 'base64url'
  ).toString('base64url')

  const { data: credential } = await supabase
    .from('passkey_credentials')
    .select('*')
    .eq('credential_id', credentialId)
    .single()

  if (!credential) {
    return NextResponse.json({ error: 'Passkey not recognized.' }, { status: 400 })
  }

  const verification = await verifyAuthenticationResponse({
    response: authenticationResponse,
    expectedChallenge: challenge as string,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    credential: {
      id: credential.credential_id,
      publicKey: Buffer.from(credential.public_key, 'base64url'),
      counter: credential.counter,
    },
    requireUserVerification: true,
  })

  if (!verification.verified) {
    return NextResponse.json({ error: 'Authentication failed.' }, { status: 401 })
  }

  // Update counter
  await supabase
    .from('passkey_credentials')
    .update({ counter: verification.authenticationInfo.newCounter })
    .eq('id', credential.id)

  // Create a Supabase session for the user (service role admin API)
  const { data: sessionData, error } = await supabase.auth.admin.createSession({
    user_id: credential.user_id,
  })

  if (error || !sessionData?.access_token) {
    return NextResponse.json({ error: 'Session creation failed.' }, { status: 500 })
  }

  // Set session token as HttpOnly cookie — never exposed to JS
  const response = NextResponse.json({ verified: true })
  response.cookies.set('sb-auth-token', sessionData.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
  return response
}
```

- [ ] **Step 3: Create login page and flow**

Create `apps/web/src/app/(auth)/login/page.tsx`:
```tsx
import { Metadata } from 'next'
import LoginFlow from './LoginFlow'

export const metadata: Metadata = { title: 'Sign in — Solbook' }

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-8">Sign in to Solbook</h1>
        <LoginFlow />
      </div>
    </main>
  )
}
```

Create `apps/web/src/app/(auth)/login/LoginFlow.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { startAuthentication } from '@simplewebauthn/browser'
import { useRouter } from 'next/navigation'
import PhoneStep from '../signup/PhoneStep'
import OtpStep from '../signup/OtpStep'
import { sendPhoneOtp, verifyPhoneOtpForLogin } from '@/actions/auth'

type Mode = 'passkey' | 'phone' | 'otp'

export default function LoginFlow() {
  const [mode, setMode] = useState<Mode>('passkey')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function signInWithPasskey() {
    setLoading(true)
    setError('')
    try {
      const optionsRes = await fetch('/api/passkey/authenticate-options', { method: 'POST' })
      const options = await optionsRes.json()
      const authResponse = await startAuthentication({ optionsJSON: options })

      const verifyRes = await fetch('/api/passkey/authenticate-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authenticationResponse: authResponse }),
      })
      const result = await verifyRes.json()
      if (!result.verified) {
        setError(result.error ?? 'Sign in failed.')
        setLoading(false)
        return
      }
      // Session cookie is set HttpOnly by the verify route — just redirect
      router.push('/home')
    } catch {
      setError('Passkey sign in failed. Try phone instead.')
      setLoading(false)
    }
  }

  if (mode === 'phone') {
    return (
      <div className="space-y-4">
        <PhoneStep
          onSubmit={async (phoneNumber) => {
            const result = await sendPhoneOtp(phoneNumber)
            if (result.error) return result.error
            setPhone(phoneNumber)
            setMode('otp')
          }}
        />
        <button onClick={() => setMode('passkey')} className="w-full text-sm text-gray-400 underline">
          Back to passkey sign in
        </button>
      </div>
    )
  }

  if (mode === 'otp') {
    return (
      <OtpStep
        phone={phone}
        onVerified={async (accessToken) => {
          // For OTP login, set the session cookie via a server action
          const result = await verifyPhoneOtpForLogin(phone, accessToken)
          if (result?.error) { setError(result.error); return }
          router.push('/home')
        }}
      />
    )
  }

  return (
    <div className="space-y-4">
      <button
        onClick={signInWithPasskey}
        disabled={loading}
        className="w-full bg-black text-white rounded py-2 text-sm font-medium disabled:opacity-50"
      >
        {loading ? 'Signing in…' : 'Sign in with passkey'}
      </button>
      <button
        onClick={() => setMode('phone')}
        className="w-full text-sm text-gray-500 underline"
      >
        Use phone number instead
      </button>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <p className="text-sm text-center text-gray-500">
        Don't have an account? <a href="/signup" className="underline">Sign up</a>
      </p>
    </div>
  )
}
```

- [ ] **Step 4: Add `verifyPhoneOtpForLogin` server action to auth.ts**

Add to `apps/web/src/actions/auth.ts`:
```ts
import { cookies } from 'next/headers'

// Used by the login OTP fallback to issue a session cookie server-side
export async function verifyPhoneOtpForLogin(phone: string, token: string) {
  const supabase = createServerClient()
  const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' })

  if (error || !data.session) {
    return { error: error?.message ?? 'Verification failed.' }
  }

  const cookieStore = await cookies()
  cookieStore.set('sb-auth-token', data.session.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })

  return { success: true }
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/(auth)/login/ apps/web/src/app/api/passkey/authenticate-*/
git commit -m "feat: add login page with passkey authentication and OTP fallback"
```

---

## Phase 3 — App Shell

---

### Task 13: Root layout with anti-AI meta tags

**Files:**
- Create: `apps/web/src/app/layout.tsx`

- [ ] **Step 1: Create root layout**

```tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Solbook — Human Only',
  description: 'A human-only, text-based social media. No AI. No bots.',
  other: {
    // Anti-AI meta tags
    'robots': 'noai, noimageai',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="robots" content="noai, noimageai" />
        <meta name="ai" content="noai" />
      </head>
      <body className="antialiased bg-white text-gray-900">
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/layout.tsx
git commit -m "feat: add root layout with anti-AI meta tags"
```

---

### Task 14: Authenticated app layout with navigation

**Files:**
- Create: `apps/web/src/app/(app)/layout.tsx`
- Create: `apps/web/src/components/nav/Sidebar.tsx`
- Create: `apps/web/src/components/nav/BottomNav.tsx`

- [ ] **Step 1: Create navigation components**

Create `apps/web/src/components/nav/Sidebar.tsx`:
```tsx
import Link from 'next/link'

const NAV_ITEMS = [
  { href: '/home', label: 'Home' },
  { href: '/discover', label: 'Discover' },
  { href: '/compose', label: 'Post' },
  { href: '/notifications', label: 'Notifications' },
  { href: '/settings', label: 'Settings' },
]

export default function Sidebar() {
  return (
    <nav className="hidden md:flex flex-col gap-1 w-48 shrink-0 pr-8">
      <Link href="/" className="font-bold text-xl mb-6">Solbook</Link>
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="text-sm py-2 px-3 rounded hover:bg-gray-100 font-medium"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
```

Create `apps/web/src/components/nav/BottomNav.tsx`:
```tsx
import Link from 'next/link'

const NAV_ITEMS = [
  { href: '/home', label: 'Home' },
  { href: '/discover', label: 'Discover' },
  { href: '/compose', label: 'Post' },
  { href: '/notifications', label: 'Notifs' },
]

export default function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-white flex">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="flex-1 text-center text-xs py-3 font-medium"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
```

- [ ] **Step 2: Create authenticated app layout**

Create `apps/web/src/app/(app)/layout.tsx`:
```tsx
import { requireSession } from '@/lib/auth'
import Sidebar from '@/components/nav/Sidebar'
import BottomNav from '@/components/nav/BottomNav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireSession()

  return (
    <div className="min-h-screen flex justify-center">
      <div className="w-full max-w-4xl flex px-4 pb-16 md:pb-0">
        <Sidebar />
        <main className="flex-1 min-w-0 py-6">{children}</main>
      </div>
      <BottomNav />
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/(app)/layout.tsx apps/web/src/components/nav/
git commit -m "feat: add authenticated app layout with sidebar and bottom nav"
```

---

### Task 15: Landing page

**Files:**
- Create: `apps/web/src/app/page.tsx`

- [ ] **Step 1: Create landing page**

```tsx
import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
      <h1 className="text-4xl font-bold mb-4">Solbook</h1>
      <p className="text-xl text-gray-600 mb-2 max-w-md">
        A social network for humans only.
      </p>
      <p className="text-sm text-gray-400 mb-8 max-w-sm">
        No AI. No bots. No scrapers. Just people, typing their own words.
      </p>
      <div className="flex gap-3">
        <Link
          href="/signup"
          className="bg-black text-white px-6 py-2.5 rounded text-sm font-medium"
        >
          Join Solbook
        </Link>
        <Link
          href="/login"
          className="border px-6 py-2.5 rounded text-sm font-medium"
        >
          Sign in
        </Link>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/page.tsx
git commit -m "feat: add landing page"
```

---

## Phase 4 — Core Features

---

### Task 16: Post composer with paste prevention

**Files:**
- Create: `apps/web/src/components/posts/PostComposer.tsx`
- Create: `apps/web/src/components/posts/PostComposer.test.tsx`
- Create: `apps/web/src/actions/posts.ts`
- Create: `apps/web/src/app/(app)/compose/page.tsx`

- [ ] **Step 1: Write failing tests for PostComposer**

Create `apps/web/src/components/posts/PostComposer.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import PostComposer from './PostComposer'

describe('PostComposer', () => {
  it('renders a textarea', () => {
    render(<PostComposer onSubmit={vi.fn()} />)
    expect(screen.getByRole('textbox')).toBeTruthy()
  })

  it('prevents paste events on the textarea', () => {
    render(<PostComposer onSubmit={vi.fn()} />)
    const textarea = screen.getByRole('textbox')
    const pasteEvent = new ClipboardEvent('paste', { bubbles: true })
    const preventDefault = vi.fn()
    Object.defineProperty(pasteEvent, 'preventDefault', { value: preventDefault })
    fireEvent(textarea, pasteEvent)
    expect(preventDefault).toHaveBeenCalled()
  })

  it('shows character count', () => {
    render(<PostComposer onSubmit={vi.fn()} />)
    expect(screen.getByText('0 / 280')).toBeTruthy()
  })

  it('disables submit when content is empty', () => {
    render(<PostComposer onSubmit={vi.fn()} />)
    const button = screen.getByRole('button', { name: /post/i })
    expect(button).toBeDisabled()
  })

  it('disables submit when content exceeds 280 chars', async () => {
    render(<PostComposer onSubmit={vi.fn()} />)
    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'a'.repeat(281) } })
    const button = screen.getByRole('button', { name: /post/i })
    expect(button).toBeDisabled()
  })
})
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
cd apps/web && pnpm test
```
Expected: FAIL — `PostComposer` not found

- [ ] **Step 3: Create post server action**

Create `apps/web/src/actions/posts.ts`:
```ts
'use server'

import { createServerClient } from '@solbook/shared/supabase'
import { validatePost } from '@solbook/shared/validation'
import { requireSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function createPost(content: string) {
  const session = await requireSession()

  const result = validatePost(content)
  if (!result.valid) return { error: result.error }

  const supabase = createServerClient()
  const { error } = await supabase.from('posts').insert({
    user_id: session.userId,
    content: content.trim(),
  })

  if (error) return { error: 'Failed to create post.' }

  revalidatePath('/home')
  return { success: true }
}
```

- [ ] **Step 4: Create PostComposer component**

Create `apps/web/src/components/posts/PostComposer.tsx`:
```tsx
'use client'

import { useState, useRef } from 'react'

const MAX_CHARS = 280

interface Props {
  onSubmit: (content: string) => Promise<{ error?: string; success?: boolean } | void>
}

export default function PostComposer({ onSubmit }: Props) {
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const remaining = MAX_CHARS - content.length
  const isValid = content.trim().length > 0 && content.length <= MAX_CHARS

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    // Paste is intentionally disabled in the composer.
    // Users must type their posts manually.
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return
    setLoading(true)
    setError('')
    const result = await onSubmit(content)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
      return
    }
    setContent('')
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onPaste={handlePaste}
        rows={4}
        placeholder="What's on your mind?"
        className="w-full border rounded p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-gray-300"
      />
      <div className="flex items-center justify-between">
        <span className={`text-xs ${remaining < 20 ? 'text-red-500' : 'text-gray-400'}`}>
          {content.length} / {MAX_CHARS}
        </span>
        <div className="flex items-center gap-3">
          {error && <span className="text-xs text-red-500">{error}</span>}
          <button
            type="submit"
            disabled={!isValid || loading}
            className="bg-black text-white px-4 py-1.5 rounded text-sm font-medium disabled:opacity-40"
          >
            {loading ? 'Posting…' : 'Post'}
          </button>
        </div>
      </div>
    </form>
  )
}
```

- [ ] **Step 5: Run tests to verify pass**

```bash
cd apps/web && pnpm test
```
Expected: All tests PASS

- [ ] **Step 6: Create compose page**

> Inline `'use server'` closures inside JSX props are not supported in Next.js 15 App Router. Pass the already-exported server action directly; handle the redirect in a separate server action.

Create `apps/web/src/actions/posts.ts` (update `createPost` to redirect on success):
```ts
'use server'

import { createServerClient } from '@solbook/shared/supabase'
import { validatePost } from '@solbook/shared/validation'
import { requireSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createPost(content: string) {
  const session = await requireSession()

  const result = validatePost(content)
  if (!result.valid) return { error: result.error }

  const supabase = createServerClient()
  const { error } = await supabase.from('posts').insert({
    user_id: session.userId,
    content: content.trim(),
  })

  if (error) return { error: 'Failed to create post.' }

  revalidatePath('/home')
  redirect('/home')
}
```

Create `apps/web/src/app/(app)/compose/page.tsx`:
```tsx
import { Metadata } from 'next'
import PostComposer from '@/components/posts/PostComposer'
import { createPost } from '@/actions/posts'

export const metadata: Metadata = { title: 'New post — Solbook' }

export default function ComposePage() {
  return (
    <div>
      <h1 className="text-lg font-bold mb-6">New post</h1>
      {/* createPost is a top-level server action — safe to pass as a prop */}
      <PostComposer onSubmit={createPost} />
    </div>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/posts/PostComposer.tsx apps/web/src/components/posts/PostComposer.test.tsx apps/web/src/actions/posts.ts apps/web/src/app/(app)/compose/
git commit -m "feat: add post composer with paste prevention and character counter"
```

---

### Task 17: PostCard component and like action

**Files:**
- Create: `apps/web/src/components/posts/PostCard.tsx`
- Create: `apps/web/src/components/posts/PostCard.test.tsx`
- Create: `apps/web/src/actions/likes.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/web/src/components/posts/PostCard.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import PostCard from './PostCard'

const mockPost = {
  id: '1',
  user_id: 'user1',
  content: 'Hello from Solbook',
  created_at: new Date().toISOString(),
  like_count: 3,
  liked_by_me: false,
  profile: {
    id: 'user1',
    username: 'gabriel',
    display_name: 'Gabriel',
    bio: null,
    avatar_url: null,
    created_at: new Date().toISOString(),
  },
}

describe('PostCard', () => {
  it('renders post content', () => {
    render(<PostCard post={mockPost} onLike={vi.fn()} />)
    expect(screen.getByText('Hello from Solbook')).toBeTruthy()
  })

  it('renders author display name', () => {
    render(<PostCard post={mockPost} onLike={vi.fn()} />)
    expect(screen.getByText('Gabriel')).toBeTruthy()
  })

  it('renders like count', () => {
    render(<PostCard post={mockPost} onLike={vi.fn()} />)
    expect(screen.getByText('3')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
cd apps/web && pnpm test
```
Expected: FAIL — `PostCard` not found

- [ ] **Step 3: Create like server action**

Create `apps/web/src/actions/likes.ts`:
```ts
'use server'

import { createServerClient } from '@solbook/shared/supabase'
import { requireSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function toggleLike(postId: string) {
  const session = await requireSession()
  const supabase = createServerClient()

  // Check if already liked
  const { data: existing } = await supabase
    .from('likes')
    .select('id')
    .eq('user_id', session.userId)
    .eq('post_id', postId)
    .single()

  if (existing) {
    await supabase.from('likes').delete().eq('id', existing.id)
  } else {
    await supabase.from('likes').insert({ user_id: session.userId, post_id: postId })
  }

  revalidatePath('/home')
  revalidatePath('/discover')
  revalidatePath(`/post/${postId}`)
  revalidatePath('/[username]', 'page')
}
```

- [ ] **Step 4: Create PostCard component**

Create `apps/web/src/components/posts/PostCard.tsx`:
```tsx
import Link from 'next/link'
import { Post } from '@solbook/shared/types'

// onLike must be a pre-bound server action passed from the parent server component.
// Example from a parent: <PostCard post={p} onLike={toggleLike.bind(null, p.id)} />
// This avoids inline 'use server' closures in JSX, which are not supported by Next.js 15.
interface Props {
  post: Post
  onLike: () => Promise<void>
}

export default function PostCard({ post, onLike }: Props) {
  const profile = post.profile
  const timeAgo = new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
    Math.round((new Date(post.created_at).getTime() - Date.now()) / 60000),
    'minutes'
  )

  return (
    <article className="border-b py-4 space-y-2">
      <div className="flex items-center gap-2">
        <Link href={`/${profile?.username}`} className="font-semibold text-sm hover:underline">
          {profile?.display_name ?? 'Unknown'}
        </Link>
        <Link href={`/${profile?.username}`} className="text-gray-400 text-sm">
          @{profile?.username}
        </Link>
        <span className="text-gray-400 text-xs ml-auto">{timeAgo}</span>
      </div>
      <Link href={`/post/${post.id}`}>
        <p className="text-sm leading-relaxed">{post.content}</p>
      </Link>
      <div className="flex items-center gap-4 pt-1">
        {/* onLike is a pre-bound server action — safe to pass to form action */}
        <form action={onLike}>
          <button
            type="submit"
            className={`text-xs flex items-center gap-1 ${post.liked_by_me ? 'text-red-500' : 'text-gray-400 hover:text-red-400'}`}
          >
            ♥ <span>{post.like_count ?? 0}</span>
          </button>
        </form>
      </div>
    </article>
  )
}
```

- [ ] **Step 5: Run tests to verify pass**

```bash
cd apps/web && pnpm test
```
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/posts/PostCard.tsx apps/web/src/components/posts/PostCard.test.tsx apps/web/src/actions/likes.ts
git commit -m "feat: add PostCard component and toggleLike server action"
```

---

### Task 18: Follow/unfollow server action

**Files:**
- Create: `apps/web/src/actions/follows.ts`

- [ ] **Step 1: Create follows server action**

Create `apps/web/src/actions/follows.ts`:
```ts
'use server'

import { createServerClient } from '@solbook/shared/supabase'
import { requireSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function toggleFollow(targetUserId: string) {
  const session = await requireSession()
  if (session.userId === targetUserId) return { error: 'Cannot follow yourself.' }

  const supabase = createServerClient()

  const { data: existing } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', session.userId)
    .eq('following_id', targetUserId)
    .single()

  if (existing) {
    await supabase.from('follows')
      .delete()
      .eq('follower_id', session.userId)
      .eq('following_id', targetUserId)
  } else {
    await supabase.from('follows').insert({
      follower_id: session.userId,
      following_id: targetUserId,
    })
  }

  revalidatePath('/home')
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/actions/follows.ts
git commit -m "feat: add follow/unfollow server action"
```

---

### Task 19: PostFeed component

**Files:**
- Create: `apps/web/src/components/posts/PostFeed.tsx`

- [ ] **Step 1: Create PostFeed**

Create `apps/web/src/components/posts/PostFeed.tsx`:
```tsx
import { Post } from '@solbook/shared/types'
import PostCard from './PostCard'
import { toggleLike } from '@/actions/likes'

interface Props {
  posts: Post[]
  nextCursor?: string | null
  loadMoreHref?: string
}

export default function PostFeed({ posts, nextCursor, loadMoreHref }: Props) {
  if (posts.length === 0) {
    return <p className="text-sm text-gray-400 py-8 text-center">No posts yet.</p>
  }

  return (
    <div>
      {posts.map((post) => (
        // toggleLike.bind(null, post.id) creates a pre-bound server action — no inline 'use server' needed
        <PostCard key={post.id} post={post} onLike={toggleLike.bind(null, post.id)} />
      ))}
      {nextCursor && loadMoreHref && (
        <div className="py-4 text-center">
          <a href={loadMoreHref} className="text-sm text-gray-400 hover:text-gray-600">
            Load more
          </a>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/posts/PostFeed.tsx
git commit -m "feat: add PostFeed component with cursor-based load more"
```

---

### Task 20: Home feed page

**Files:**
- Create: `apps/web/src/app/(app)/home/page.tsx`

- [ ] **Step 1: Create home feed page**

Create `apps/web/src/app/(app)/home/page.tsx`:
```tsx
import { Metadata } from 'next'
import { unstable_noStore as noStore } from 'next/cache'
import { createServerClient } from '@solbook/shared/supabase'
import { requireSession } from '@/lib/auth'
import PostFeed from '@/components/posts/PostFeed'
import { Post } from '@solbook/shared/types'

export const metadata: Metadata = { title: 'Home — Solbook' }

const PAGE_SIZE = 20

interface Props {
  searchParams: Promise<{ cursor?: string }>
}

export default async function HomePage({ searchParams }: Props) {
  noStore() // opt out of caching — feed is per-user and changes frequently
  const session = await requireSession()
  const { cursor } = await searchParams
  const supabase = createServerClient()

  // Get IDs of users this person follows
  const { data: follows } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', session.userId)

  const followingIds = (follows ?? []).map((f) => f.following_id)

  if (followingIds.length === 0) {
    return (
      <div>
        <h1 className="text-lg font-bold mb-6">Home</h1>
        <p className="text-sm text-gray-400">
          Follow some people to see their posts here. Try <a href="/discover" className="underline">Discover</a>.
        </p>
      </div>
    )
  }

  // Cursor decode — cursor encodes created_at and id for stable pagination
  let query = supabase
    .from('posts')
    .select(`
      id, content, created_at, user_id,
      profiles!inner (id, username, display_name, bio, avatar_url, created_at),
      likes (count)
    `)
    .in('user_id', followingIds)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(PAGE_SIZE + 1)

  if (cursor) {
    const [cursorCreatedAt] = Buffer.from(cursor, 'base64url').toString().split('|')
    // Fetch posts older than the cursor's created_at
    query = query.lt('created_at', cursorCreatedAt)
  }

  const { data: posts } = await query

  const hasMore = (posts ?? []).length > PAGE_SIZE
  const pagePosts = (posts ?? []).slice(0, PAGE_SIZE)

  // Check which posts current user has liked
  const postIds = pagePosts.map((p) => p.id)
  const { data: myLikes } = await supabase
    .from('likes')
    .select('post_id')
    .eq('user_id', session.userId)
    .in('post_id', postIds)

  const likedSet = new Set((myLikes ?? []).map((l) => l.post_id))

  const enriched: Post[] = pagePosts.map((p: any) => ({
    ...p,
    profile: p.profiles,
    like_count: p.likes?.[0]?.count ?? 0,
    liked_by_me: likedSet.has(p.id),
  }))

  const lastPost = enriched[enriched.length - 1]
  const nextCursor = hasMore && lastPost
    ? Buffer.from(`${lastPost.created_at}|${lastPost.id}`).toString('base64url')
    : null

  return (
    <div>
      <h1 className="text-lg font-bold mb-6">Home</h1>
      <PostFeed
        posts={enriched}
        nextCursor={nextCursor}
        loadMoreHref={nextCursor ? `/home?cursor=${nextCursor}` : undefined}
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/(app)/home/
git commit -m "feat: add home feed with cursor-based pagination"
```

---

### Task 21: Discovery feed — Postgres function + page

**Files:**
- Modify: `supabase/migrations/20260320000000_initial_schema.sql` (add RPC function)
- Create: `supabase/migrations/20260320000001_discover_feed_fn.sql`
- Create: `apps/web/src/app/(app)/discover/page.tsx`

> **Note:** PostgREST's `.order()` on aggregated columns of a joined table is not supported via the JS client. The discovery feed ranking (posts by like count in a 48h window) requires a Postgres function called via `supabase.rpc()`.

- [ ] **Step 1: Create migration with discover feed function**

```bash
supabase migration new discover_feed_fn
```

Write `supabase/migrations/20260320000001_discover_feed_fn.sql`:
```sql
create or replace function public.get_discover_feed(
  window_hours int default 48,
  page_size int default 20
)
returns table (
  id uuid,
  content text,
  created_at timestamptz,
  user_id uuid,
  like_count bigint,
  profile_id uuid,
  username text,
  display_name text,
  bio text,
  avatar_url text,
  profile_created_at timestamptz
)
language sql
stable
as $$
  select
    p.id,
    p.content,
    p.created_at,
    p.user_id,
    count(l.id) filter (
      where l.created_at >= now() - (window_hours || ' hours')::interval
    ) as like_count,
    pr.id as profile_id,
    pr.username,
    pr.display_name,
    pr.bio,
    pr.avatar_url,
    pr.created_at as profile_created_at
  from public.posts p
  join public.profiles pr on pr.id = p.user_id
  left join public.likes l on l.post_id = p.id
  group by p.id, pr.id
  order by like_count desc, p.created_at desc
  limit page_size;
$$;
```

- [ ] **Step 2: Apply the migration locally**

```bash
supabase db push
```
Expected: Migration applied, no errors

- [ ] **Step 3: Create discover page**

Create `apps/web/src/app/(app)/discover/page.tsx`:
```tsx
import { Metadata } from 'next'
import { unstable_noStore as noStore } from 'next/cache'
import { createServerClient } from '@solbook/shared/supabase'
import { requireSession } from '@/lib/auth'
import PostFeed from '@/components/posts/PostFeed'
import { Post } from '@solbook/shared/types'

export const metadata: Metadata = { title: 'Discover — Solbook' }

export default async function DiscoverPage() {
  noStore() // opt out of caching — content is user-specific and time-sensitive
  const session = await requireSession()
  const supabase = createServerClient()

  const { data: rows } = await supabase.rpc('get_discover_feed', {
    window_hours: 48,
    page_size: 20,
  })

  const postIds = (rows ?? []).map((r: any) => r.id)
  const { data: myLikes } = await supabase
    .from('likes')
    .select('post_id')
    .eq('user_id', session.userId)
    .in('post_id', postIds)

  const likedSet = new Set((myLikes ?? []).map((l: any) => l.post_id))

  const enriched: Post[] = (rows ?? []).map((r: any) => ({
    id: r.id,
    content: r.content,
    created_at: r.created_at,
    user_id: r.user_id,
    like_count: Number(r.like_count),
    liked_by_me: likedSet.has(r.id),
    profile: {
      id: r.profile_id,
      username: r.username,
      display_name: r.display_name,
      bio: r.bio,
      avatar_url: r.avatar_url,
      created_at: r.profile_created_at,
    },
  }))

  return (
    <div>
      <h1 className="text-lg font-bold mb-6">Discover</h1>
      <PostFeed posts={enriched} />
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260320000001_discover_feed_fn.sql apps/web/src/app/(app)/discover/
git commit -m "feat: add discovery feed with postgres RPC function for like-based ranking"
```

---

### Task 22: Public profile page

**Files:**
- Create: `apps/web/src/components/profiles/ProfileHeader.tsx`
- Create: `apps/web/src/app/[username]/page.tsx`

- [ ] **Step 1: Create ProfileHeader component**

Create `apps/web/src/components/profiles/ProfileHeader.tsx`:
```tsx
import { Profile } from '@solbook/shared/types'

interface Props {
  profile: Profile
  followerCount: number
  followingCount: number
  isFollowing: boolean
  isOwnProfile: boolean
  onFollow?: () => Promise<void>
}

export default function ProfileHeader({
  profile, followerCount, followingCount, isFollowing, isOwnProfile, onFollow
}: Props) {
  return (
    <div className="border-b pb-6 mb-6">
      <h1 className="text-xl font-bold">{profile.display_name}</h1>
      <p className="text-sm text-gray-400">@{profile.username}</p>
      {profile.bio && <p className="text-sm mt-2">{profile.bio}</p>}
      <div className="flex gap-4 mt-3 text-sm text-gray-500">
        <span><strong className="text-gray-900">{followingCount}</strong> Following</span>
        <span><strong className="text-gray-900">{followerCount}</strong> Followers</span>
      </div>
      {!isOwnProfile && onFollow && (
        <form action={onFollow} className="mt-4">
          <button
            type="submit"
            className={`px-4 py-1.5 rounded text-sm font-medium border ${
              isFollowing ? 'bg-white text-gray-700' : 'bg-black text-white border-black'
            }`}
          >
            {isFollowing ? 'Unfollow' : 'Follow'}
          </button>
        </form>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create public profile page**

Create `apps/web/src/app/[username]/page.tsx`:
```tsx
import { notFound } from 'next/navigation'
import { createServerClient } from '@solbook/shared/supabase'
import { getSession } from '@/lib/auth'
import { toggleFollow } from '@/actions/follows'
import ProfileHeader from '@/components/profiles/ProfileHeader'
import PostFeed from '@/components/posts/PostFeed'
import { Post } from '@solbook/shared/types'

interface Props {
  params: Promise<{ username: string }>
}

export async function generateMetadata({ params }: Props) {
  const { username } = await params
  return { title: `@${username} — Solbook` }
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params
  const supabase = createServerClient()
  const session = await getSession()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username.toLowerCase())
    .single()

  if (!profile) notFound()

  const [{ count: followerCount }, { count: followingCount }, { data: posts }] = await Promise.all([
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', profile.id),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profile.id),
    supabase.from('posts')
      .select(`id, content, created_at, user_id, likes (count)`)
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  let isFollowing = false
  if (session) {
    const { data } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', session.userId)
      .eq('following_id', profile.id)
      .single()
    isFollowing = !!data
  }

  const enriched: Post[] = (posts ?? []).map((p: any) => ({
    ...p,
    profile,
    like_count: p.likes?.[0]?.count ?? 0,
    liked_by_me: false, // simplified for public view
  }))

  const isOwnProfile = session?.userId === profile.id

  return (
    <div>
      <ProfileHeader
        profile={profile}
        followerCount={followerCount ?? 0}
        followingCount={followingCount ?? 0}
        isFollowing={isFollowing}
        isOwnProfile={isOwnProfile}
        onFollow={session && !isOwnProfile
          ? toggleFollow.bind(null, profile.id)
          : undefined}
      />
      <PostFeed posts={enriched} />
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/profiles/ apps/web/src/app/[username]/
git commit -m "feat: add public profile page with follow/unfollow"
```

---

### Task 23: Single post page

**Files:**
- Create: `apps/web/src/app/post/[id]/page.tsx`

- [ ] **Step 1: Create single post page**

Create `apps/web/src/app/post/[id]/page.tsx`:
```tsx
import { notFound } from 'next/navigation'
import { createServerClient } from '@solbook/shared/supabase'
import { getSession } from '@/lib/auth'
import PostCard from '@/components/posts/PostCard'
import { toggleLike } from '@/actions/likes'
import { Post } from '@solbook/shared/types'

interface Props {
  params: Promise<{ id: string }>
}

export default async function PostPage({ params }: Props) {
  const { id } = await params
  const supabase = createServerClient()
  const session = await getSession()

  const { data: post } = await supabase
    .from('posts')
    .select(`id, content, created_at, user_id, profiles!inner (id, username, display_name, bio, avatar_url, created_at), likes (count)`)
    .eq('id', id)
    .single()

  if (!post) notFound()

  let likedByMe = false
  if (session) {
    const { data } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', session.userId)
      .eq('post_id', id)
      .single()
    likedByMe = !!data
  }

  const enriched: Post = {
    ...(post as any),
    profile: (post as any).profiles,
    like_count: (post as any).likes?.[0]?.count ?? 0,
    liked_by_me: likedByMe,
  }

  return (
    <div>
      <PostCard post={enriched} onLike={toggleLike} />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/post/
git commit -m "feat: add single post view page"
```

---

### Task 24: Notifications page

**Files:**
- Create: `apps/web/src/app/(app)/notifications/page.tsx`

- [ ] **Step 1: Create notifications page (computed on read)**

Create `apps/web/src/app/(app)/notifications/page.tsx`:
```tsx
import { Metadata } from 'next'
import { createServerClient } from '@solbook/shared/supabase'
import { requireSession } from '@/lib/auth'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Notifications — Solbook' }

const WINDOW_DAYS = 30

export default async function NotificationsPage() {
  const session = await requireSession()
  const supabase = createServerClient()
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const [{ data: likes }, { data: follows }] = await Promise.all([
    // Likes on my posts
    supabase
      .from('likes')
      .select(`created_at, post_id, posts!inner(content, user_id), profiles!inner(username, display_name)`)
      .eq('posts.user_id', session.userId)
      .neq('user_id', session.userId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(50),
    // New followers
    supabase
      .from('follows')
      .select(`created_at, profiles!follower_id(username, display_name)`)
      .eq('following_id', session.userId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  type NotifItem = { type: 'like' | 'follow'; created_at: string; text: string; href: string }

  const items: NotifItem[] = [
    ...(likes ?? []).map((l: any) => ({
      type: 'like' as const,
      created_at: l.created_at,
      text: `@${l.profiles.username} liked your post`,
      href: `/post/${l.post_id}`,
    })),
    ...(follows ?? []).map((f: any) => ({
      type: 'follow' as const,
      created_at: f.created_at,
      text: `@${f.profiles.username} followed you`,
      href: `/${f.profiles.username}`,
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return (
    <div>
      <h1 className="text-lg font-bold mb-6">Notifications</h1>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400">No notifications in the last {WINDOW_DAYS} days.</p>
      ) : (
        <ul className="space-y-1">
          {items.map((item, i) => (
            <li key={i} className="border-b py-3">
              <Link href={item.href} className="text-sm hover:underline">{item.text}</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/(app)/notifications/
git commit -m "feat: add notifications page computed on read (likes + follows, 30-day window)"
```

---

### Task 25: Settings page

**Files:**
- Create: `apps/web/src/app/(app)/settings/page.tsx`

- [ ] **Step 1: Create settings page**

Create `apps/web/src/app/(app)/settings/page.tsx`:
```tsx
import { Metadata } from 'next'
import { createServerClient } from '@solbook/shared/supabase'
import { requireSession } from '@/lib/auth'
import { logout } from '@/actions/auth'

export const metadata: Metadata = { title: 'Settings — Solbook' }

export default async function SettingsPage() {
  const session = await requireSession()
  const supabase = createServerClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name, bio')
    .eq('id', session.userId)
    .single()

  return (
    <div className="max-w-md space-y-8">
      <h1 className="text-lg font-bold">Settings</h1>

      <section>
        <h2 className="font-semibold mb-3 text-sm text-gray-500 uppercase tracking-wide">Profile</h2>
        <div className="space-y-1 text-sm">
          <p><span className="text-gray-400">Display name: </span>{profile?.display_name}</p>
          <p><span className="text-gray-400">Username: </span>@{profile?.username}</p>
          {profile?.bio && <p><span className="text-gray-400">Bio: </span>{profile.bio}</p>}
        </div>
        <p className="text-xs text-gray-400 mt-2">Profile editing coming soon.</p>
      </section>

      <section>
        <h2 className="font-semibold mb-3 text-sm text-gray-500 uppercase tracking-wide">Security</h2>
        <p className="text-sm text-gray-400">Passkey management coming soon.</p>
      </section>

      <section>
        <form action={logout}>
          <button
            type="submit"
            className="text-sm text-red-500 hover:underline"
          >
            Sign out
          </button>
        </form>
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/(app)/settings/
git commit -m "feat: add settings page with sign out"
```

---

### Task 26: Update ROADMAP — mark MVP items complete

- [ ] **Step 1: Update ROADMAP.md to check off completed items**

Update the MVP section of `ROADMAP.md` to check off all completed items:
```markdown
## MVP (Complete)

- [x] Monorepo setup (Turborepo + pnpm)
- [x] Supabase schema (profiles, posts, likes, follows)
- [x] Anti-AI infrastructure (robots.txt, ai.txt, middleware, rate limiting, honeypots)
- [x] Authentication (phone OTP + passkey / WebAuthn)
- [x] Post creation (280 char limit, paste disabled)
- [x] Likes
- [x] Follow / Unfollow
- [x] Home feed (followed users, cursor-paginated)
- [x] Discovery feed (trending by likes in 48h window)
- [x] Public profiles
- [x] Single post view
- [x] Notifications (computed on read)
- [x] Settings page
- [x] README anti-AI documentation
```

- [ ] **Step 2: Commit**

```bash
git add ROADMAP.md
git commit -m "docs: mark MVP items complete in ROADMAP"
```

---

## Deployment Checklist

Before deploying to Vercel + Supabase Cloud:

- [ ] Link Supabase project: `supabase link --project-ref <your-ref>`
- [ ] Push migrations to cloud: `supabase db push`
- [ ] **Enable phone auth in Supabase:** Dashboard → Authentication → Providers → Phone → enable, configure Twilio (or another SMS provider) with credentials
- [ ] Set environment variables in Vercel dashboard:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXT_PUBLIC_RP_ID` (your domain, e.g. `solbook.app`)
  - `NEXT_PUBLIC_ORIGIN` (e.g. `https://solbook.app`)
  - `UPSTASH_REDIS_REST_URL`
  - `UPSTASH_REDIS_REST_TOKEN`
- [ ] Deploy: `vercel --prod` or push to `main`
- [ ] Verify Supabase anon role has no table permissions (check in Supabase dashboard > Auth > Policies — all tables should have no anon policies)

---

## Environment Variables Reference

| Variable | Where | Purpose |
|---|---|---|
| `SUPABASE_URL` | Server only | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Service role key — never expose to client |
| `NEXT_PUBLIC_RP_ID` | Public | WebAuthn relying party ID (your domain, e.g. `solbook.app`) |
| `NEXT_PUBLIC_ORIGIN` | Public | Full origin URL for WebAuthn verification (e.g. `https://solbook.app`) |
| `UPSTASH_REDIS_REST_URL` | Server only | Upstash Redis endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | Server only | Upstash Redis auth token |

**Note:** There is no `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Client code never talks to Supabase directly — all access is server-side only.
