# Solbook — Design Spec
**Date:** 2026-03-20
**Status:** Approved

---

## Vision

Solbook is a human-only, text-based social media platform — a sanctuary where users can know with confidence they are interacting with other humans. It marries the brevity of early Twitter with the conversational depth of Hacker News. It is open source, and all anti-AI protections are publicly documented to invite community contribution.

---

## Core Goals (Non-Negotiable)

1. Only humans can use and read the app
2. All endpoints and database access are closed to anything other than authenticated human sessions
3. User data and content are protected from being used to train AI
4. The latest specifications and techniques for stopping AI agents, bots, and scrapers are used and kept up to date
5. Copy/paste is disabled in the post composer — users must manually type their posts
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

All tables have Row Level Security (RLS) enabled. Reads are public; writes require an authenticated session. All schema changes are managed via Supabase CLI migration files — never manual dashboard edits.

### `profiles`
Extends Supabase `auth.users`.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | FK to auth.users |
| `username` | text | unique |
| `display_name` | text | |
| `bio` | text | nullable |
| `avatar_url` | text | nullable |
| `created_at` | timestamptz | |

### `posts`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `user_id` | uuid | FK to profiles |
| `content` | text | max 280 chars |
| `created_at` | timestamptz | |

### `likes`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `user_id` | uuid | FK to profiles |
| `post_id` | uuid | FK to posts |
| `created_at` | timestamptz | |

Unique constraint on `(user_id, post_id)`.

### `follows`

| Column | Type | Notes |
|---|---|---|
| `follower_id` | uuid | FK to profiles |
| `following_id` | uuid | FK to profiles |

Unique constraint on `(follower_id, following_id)`.

---

## Authentication & Human Verification

Supabase Auth handles sessions. Human verification is layered on top.

### Signup Flow
1. Phone number entry → SMS OTP verification (Supabase Auth native)
2. Passkey registration (WebAuthn) — hardware-bound to the user's device secure enclave
3. Username + display name setup
4. Account created

### Login Flow
- Passkey prompt (biometric on device) → Supabase session issued
- Fallback: phone OTP for account recovery

### Mobile (Future)
- Apple App Attest / Android Play Integrity for device integrity verification
- Face ID / Touch ID via native passkey (WebAuthn standard, native UI)

---

## Pages & Navigation (Web MVP)

### Public Routes (rate-limited, no login required)
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
| `/compose` | New post (modal or dedicated page) |
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

## Anti-AI Protection Layer

All measures documented in the README. Updated as the landscape evolves.

### Declarative
- `robots.txt` — disallow all known AI crawlers by user-agent
- `ai.txt` — opt out of AI training (emerging standard)
- `noai` and `noimageai` meta tags on all pages
- `X-Robots-Tag` headers on all API/server responses

### Edge-Level (Vercel Middleware)
- Rate limiting by IP — strict limits on unauthenticated requests
- User-agent blocking — known scraper and bot signatures
- Honeypot routes — fake endpoints that only bots visit; matching IPs are auto-blacklisted

### Application-Level
- No public REST API — all data access via Next.js server actions or server components
- JS-gated content rendering — meaningful content requires JavaScript execution
- Behavioral signals — keystroke timing on the post composer logged for future abuse detection

### Input-Level
- `onPaste` blocked on the post composer — users must manually type all posts
- Paste prevention applies only to the compose input, not the entire app

---

## MVP Feature Scope

| Feature | Status |
|---|---|
| Text posts (280 chars max) | MVP |
| Public profiles | MVP |
| Follow / unfollow | MVP |
| Home feed (followed users) | MVP |
| Discovery / trending feed | MVP |
| Likes | MVP |
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
- **React Native mobile app** (Expo)
- **Go backend** — replace Supabase-direct with a dedicated Go API as complexity grows
- **Red-team agent test suite** — Claude Code agent skills that simulate scrapers, bot signups, and AI content generation, used as automated CI tests to verify anti-AI protections hold
- **Advanced human verification** — behavioral biometrics, typing cadence analysis
- **End-to-end encryption** — client-side encryption of post content

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
