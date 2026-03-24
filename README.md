# solbook

An open source, human-only, text-based social network. No AI-generated content. No AI scrapers. No AI training.

The dream is to have a community built, human only social site. The potential to have one last place we can trust is human only. I am not 100% certain this is possible, so this might just be an attempt at a proof of concept.

The number one priority for the Anti AI strategy is to find a way to block [OpenClaw](https://github.com/openclaw/openclaw)-like agents that are using tools like [Scrapling](https://github.com/D4Vinci/Scrapling).

## Anti-AI Protections

solbook is built specifically to resist AI bots, scrapers, and synthetic content. Every contributor should understand and maintain these protections:

### Content Discovery Protections

| Layer | Implementation | File |
|-------|---------------|------|
| `robots.txt` | Disallows 20+ known AI crawler user agents | `apps/web/public/robots.txt` |
| `ai.txt` | Machine-readable AI access policy | `apps/web/public/ai.txt` |
| `X-Robots-Tag` header | `noai, noimageai` on every response | `apps/web/src/middleware.ts` |
| HTML meta tag | `<meta name="robots" content="noai, noimageai">` | `apps/web/src/app/layout.tsx` |

### Automated Access Blocking

| Layer | Implementation | File |
|-------|---------------|------|
| Vercel Bot Management | AI bots and standard bots managed rulesets | - |
| User-agent blocking | 403 for known AI/bot UAs at the edge | `apps/web/src/middleware.ts` |
| Honeypot paths | Silent 200 to log/trap automated scanners | `apps/web/src/middleware.ts` |
| IP blacklisting (planned) | Upstash Redis — see ROADMAP | — |

### Composer Protections

| Layer | Implementation | Notes |
|-------|---------------|-------|
| Paste prevention | `onPaste` blocked on composer textarea | Prevents bulk AI-generated text |
| Copy prevention | `onCopy` blocked on post content | Deters training data extraction |
| Character limit | 280 chars, enforced server-side | Limits bulk content injection |

### Authentication Protections

| Layer | Implementation | Notes |
|-------|---------------|-------|
| Phone OTP | Required for signup | Links account to real phone number |
| Passkey (WebAuthn) | Required after OTP | Hardware-bound, not replayable |
| No password auth | Passkey-only after setup | Eliminates credential stuffing |

### Contributing

If you add a new data-access endpoint or public page, ensure:

1. The route is excluded from anonymous access (Supabase RLS locks down the DB — PostgREST anon role has zero permissions)
2. The middleware matcher covers it for UA blocking
3. New honeypot paths are added if the route could attract scanners

## Environment Variables

See `apps/web/.env.local.example` for required variables. All Supabase access is server-side only — no `NEXT_PUBLIC_SUPABASE_URL` or anon key is ever exposed to the client.

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for planned features, MVP progress, and the ongoing anti-AI hardening backlog.

## Tech Stack

- **Monorepo:** Turborepo + bun workspaces
- **Web:** Next.js 15 (App Router), Tailwind CSS v4, TypeScript
- **Backend:** Supabase (Auth, PostgreSQL, Row-Level Security)
- **Auth:** Phone OTP → Passkey (WebAuthn via SimpleWebAuthn)
- **Package manager:** bun

## Getting Started

### Prerequisites

- [bun](https://bun.sh) v1.0+
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for local Supabase)

### Setup

```bash
# Install dependencies
bun install

# Start local Supabase (requires Docker)
supabase start

# Copy env example and fill in values
cp apps/web/.env.local.example apps/web/.env.local

# Start the dev server
bun dev
```

### Running Tests

```bash
# All packages
bun test

# Web app only
cd apps/web && bun test

# Shared package only
cd packages/shared && bun test
```

## Project Structure

```
solbook/
├── apps/
│   └── web/               # Next.js 15 web app
│       ├── src/
│       │   ├── app/       # App Router pages & layouts
│       │   ├── components/
│       │   ├── lib/       # Server utilities
│       │   └── middleware.ts
│       └── public/
│           ├── robots.txt
│           └── ai.txt
├── packages/
│   └── shared/            # Types, validation, Supabase client
├── supabase/
│   └── migrations/        # Database schema
└── docs/
    └── superpowers/       # Design specs and implementation plans
```


## License

MIT
