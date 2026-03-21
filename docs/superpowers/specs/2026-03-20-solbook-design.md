# Solbook — Design Spec
**Date:** 2026-03-20
**Status:** Approved

---

## Vision

Solbook is a human-only, text-based social media platform — a sanctuary where users can know with confidence they are interacting with other humans. It marries the brevity of early Twitter with the conversational depth of Hacker News. It is open source, and all anti-AI protections are publicly documented to invite community contribution.

---

## Core Goals (Non-Negotiable)

1. Only humans can use and read the app
2. All endpoints and database access are closed to anything other than authenticated human sessions; the Supabase PostgREST API is locked down — all data access flows exclusively through Next.js server components and server actions
3. User data and content are protected from being used to train AI
4. The latest specifications and techniques for stopping AI agents, bots, and scrapers are used and kept up to date
5. Copy/paste (paste only) is disabled in the post composer — users must manually type all posts
6. The eventual goal is a verified human-only sanctuary

These goals must be reflected clearly in the README and documented for contributors.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Monorepo | Turborepo |
| Web frontend | Next.js 15 (App Router) |
| Mobile (future) | React Native / Expo (stubbed) |
| Shared package | TypeScript — types, Supabase client, validation, utils |
| Backend | Supabase (Auth, Database, RLS, Edge Functions) |
| Styling | Tailwind CSS |
| Hosting | Vercel (Next.js), Supabase Cloud |
| Edge persistence | Upstash Redis (for IP blacklisting via Vercel Middleware) |
| CLI tools | Supabase CLI, Vercel CLI, GitHub CLI (`gh`) |

---

## Monorepo Structure

```
solbook/
├── apps/
│   ├── web/          # Next.js 15 app (App Router)
│   └── mobile/       # React Native / Expo stub (placeholder)
├── packages/
│   └── shared/       # Types, Supabase client, validation, utils
├── turbo.json
├── package.json      # Root workspace config
├── ROADMAP.md
└── README.md
```

The `packages/shared` library is the integration point between web and mobile. Anything that touches Supabase, post validation, or shared types lives here.

---

## Data Model (MVP)

All tables have Row Level Security (RLS) enabled. The Supabase `anon` role has **no permissions** — all data access is exclusively through Next.js server components and server actions using the service role key stored in a secure server-only environment variable. This means no client-side Supabase queries and no direct PostgREST access from the browser or external scripts.

All schema changes are managed via Supabase CLI migration files — never manual dashboard edits.

### `profiles`
Extends Supabase `auth.users`.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | FK to auth.users, ON DELETE CASCADE |
| `username` | text | unique, 3–20 chars, alphanumeric + underscores only |
| `display_name` | text | 1–50 chars |
| `bio` | text | nullable, max 160 chars |
| `avatar_url` | text | nullable, placeholder column — image upload not in MVP scope |
| `created_at` | timestamptz | |

**Username constraints:** 3–20 characters, alphanumeric and underscores only (`^[a-zA-Z0-9_]{3,20}$`). Reserved words that conflict with Next.js routes are blocked at signup: `home`, `discover`, `compose`, `notifications`, `settings`, `login`, `signup`, `api`, `admin`, `post`.

### `posts`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `user_id` | uuid | FK to profiles(id), ON DELETE CASCADE |
| `content` | text | max 280 chars, enforced at DB level via check constraint |
| `created_at` | timestamptz | |

### `likes`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `user_id` | uuid | FK to profiles(id), ON DELETE CASCADE |
| `post_id` | uuid | FK to posts(id), ON DELETE CASCADE |
| `created_at` | timestamptz | |

Unique constraint on `(user_id, post_id)`.

### `follows`

| Column | Type | Notes |
|---|---|---|
| `follower_id` | uuid | FK to profiles(id), ON DELETE CASCADE |
| `following_id` | uuid | FK to profiles(id), ON DELETE CASCADE |
| `created_at` | timestamptz | |

Unique constraint on `(follower_id, following_id)`.

---

## Authentication & Human Verification

Supabase Auth handles sessions. Human verification is layered on top.

### Signup Flow
1. Phone number entry → SMS OTP verification (Supabase Auth native)
2. Passkey registration (WebAuthn) — hardware-bound to the user's device secure enclave. Strongly encouraged but not hard-required at signup; users without passkey-compatible devices can proceed with phone OTP only. Passkey registration can be completed later in settings.
3. Username + display name setup
4. Account created

**Known limitation:** Phone OTP via virtual/VoIP numbers is a weakness. SMS-only accounts are considered lower-trust and may be subject to additional rate limiting in the future. This tradeoff is accepted for MVP.

### Login Flow
- Passkey prompt (biometric on device) → Supabase session issued
- Fallback: phone OTP (rate-limited — max 5 OTP attempts per hour per phone number)

### Mobile (Future)
- Apple App Attest / Android Play Integrity for device integrity verification
- Face ID / Touch ID via native passkey (WebAuthn standard, native UI)

---

## Pages & Navigation (Web MVP)

### Public Routes
Public routes render content via Next.js server components (SSR). The raw HTML response contains the post content for legitimate human visitors and search engines. Scraper protection is enforced at the edge (rate limiting, user-agent blocking) and at the application level (no API endpoints, no PostgREST access). Public routes do not expose a queryable API.

| Route | Description |
|---|---|
| `/` | Landing page — mission, anti-AI stance, sign up CTA |
| `/[username]` | Public profile + posts |
| `/post/[id]` | Single post view |

### Authenticated Routes
| Route | Description |
|---|---|
| `/home` | Feed of posts from followed users |
| `/discover` | Trending / popular posts |
| `/compose` | New post — dedicated page for MVP |
| `/notifications` | Likes, new followers |
| `/settings` | Profile, account, security |

### Auth Routes
| Route | Description |
|---|---|
| `/signup` | Phone verify → passkey setup → profile creation |
| `/login` | Passkey prompt |

### Navigation
- Desktop: persistent sidebar
- Mobile web: bottom tab bar
- UI is clean and text-focused — no algorithmic clutter

---

## Feed & Discovery Logic

### Home Feed (`/home`)
- Posts from users the authenticated user follows
- Sorted by `created_at DESC` (newest first)
- Paginated using cursor-based pagination (using `created_at` + `id` as the cursor) — no offset pagination

### Discovery Feed (`/discover`)
- Posts ranked by like count within the last 48 hours
- Ties broken by `created_at DESC`
- Cursor-based pagination
- MVP implementation: a server-side query joining `posts` and `likes` with a time window filter

### Notifications (`/notifications`)
- Computed on read in MVP — no `notifications` table
- Queries: recent likes on the user's posts (last 30 days), recent follows of the user (last 30 days)
- Sorted by event `created_at DESC`
- A persistent notifications table is a roadmap item for when real-time notifications are added

---

## Anti-AI Protection Layer

All measures documented in the README. Updated as the landscape evolves.

### Declarative
- `robots.txt` — disallow all known AI crawlers by user-agent
- `ai.txt` — opt out of AI training (emerging standard)
- `noai` and `noimageai` meta tags on all pages
- `X-Robots-Tag: noai, noimageai` headers on all server responses

### Edge-Level (Vercel Middleware)
- Rate limiting by IP — strict limits on all routes; stricter limits on unauthenticated routes
- User-agent blocking — known scraper and bot signatures blocked at the edge
- Honeypot routes — fake endpoints (e.g. `/api/v1/feed`) that only bots discover and visit; matching IPs are written to Upstash Redis and blacklisted on subsequent requests via Vercel Middleware

### Application-Level
- Supabase `anon` role has no permissions — all data access requires the service role key, held only in server-side environment variables
- No client-side Supabase queries — all reads go through Next.js server components; all writes go through server actions
- No public REST or GraphQL API exposed

### Input-Level
- `onPaste` event blocked on the post composer textarea — users must manually type all post content
- Paste prevention applies only to the compose input, not the rest of the application
- `onCopy` is not blocked — users can copy their own posts for reference

### Behavioral (Future)
- Keystroke timing data is **not collected in MVP**. Infrastructure for behavioral biometric signals (typing cadence, inter-keystroke intervals) is planned for a future release, at which point a privacy policy and data retention rules will be defined prior to collection.

---

## MVP Feature Scope

| Feature | Status |
|---|---|
| Text posts (280 chars max) | MVP |
| Public profiles | MVP |
| Follow / unfollow | MVP |
| Home feed (followed users, cursor-paginated) | MVP |
| Discovery / trending feed (likes in 48h window) | MVP |
| Likes | MVP |
| Notifications (computed on read) | MVP |
| Passkey + phone auth | MVP |
| Anti-AI protection layer | MVP |
| Roadmap + anti-AI docs in README | MVP |

---

## Branch & Deployment Workflow

- `main` — production branch, deploys automatically to Vercel
- Each feature or fix lives on its own branch, merged via PR
- PRs managed with `gh` CLI where git alone is insufficient
- Preview deploys automatically created per PR by Vercel
- Supabase schema changes via CLI migration files only

---

## Roadmap (Future — Not MVP)

The full roadmap lives in `ROADMAP.md`. Key planned features:

- **Blog/article posts** — longer form with title, two post type selector in composer
- **Comments** — flat replies on posts
- **Threaded replies** — Hacker News-style nested conversation threads
- **Reposts / reshares**
- **Real-time notifications** — persistent notifications table + Supabase Realtime
- **React Native mobile app** (Expo)
- **Go backend** — replace Supabase-direct with a dedicated Go API as complexity grows
- **Red-team agent test suite** — Claude Code agent skills that simulate scrapers, bot signups, and AI content generation, used as automated CI tests to verify anti-AI protections hold
- **Advanced human verification** — behavioral biometrics, typing cadence analysis (with defined privacy policy)
- **End-to-end encryption** — client-side encryption of post content
- **Avatar / image uploads** — Supabase Storage integration

---

## Out of Scope (MVP)

- E2E encryption of posts
- Comments or threaded replies
- Reposts
- Mobile app (stubbed only)
- Go backend
- Red-team agent testing
- DMs / private messaging
- Invite system
- Image or media uploads
- Keystroke/behavioral data collection
- Persistent notifications table
