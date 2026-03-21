# solbook Roadmap

This is a living document. Features move between phases as priorities shift.

## MVP ✅

Core human-only social experience — shipped.

- [x] Turborepo monorepo — bun workspaces, shared package, DB schema
- [x] Anti-AI infrastructure — robots.txt, ai.txt, middleware UA blocking, meta tags
- [x] App shell — root layout, landing page, authenticated layout, sidebar/nav
- [x] Auth — email + password signup, HMAC session tokens, profile creation
- [x] Posts — compose (paste-blocked), 280 chars, server-validated
- [x] Social — follow/unfollow, home feed (cursor-paginated), public profiles
- [x] Likes & Discovery — like/unlike, discovery feed (ranked by recent likes via Postgres RPC)
- [x] Notifications — computed on read (likes + new followers, 7-day window)
- [x] Settings — display name, bio edit, sign out

## Near-Term

Features planned after MVP ships.

- [ ] **IP blacklisting** — Upstash Redis-backed, triggered by honeypot hits and UA blocks
- [ ] **Replies** — threaded replies on posts
- [ ] **Reposts** — share a post with optional quote
- [ ] **Mobile app** — React Native / Expo (in progress)
- [ ] **Image posts** — single image with caption, stored in Supabase Storage
- [ ] **Lists** — curated user lists for feed filtering
- [ ] **Bookmarks** — private saved posts
- [ ] **Search** — full-text search over posts and profiles (Postgres `tsvector`)
- [ ] **Verified accounts** — badge for notable humans (manual for now)

## Future

Longer-term ideas, no timeline commitment.

- [ ] **End-to-end encrypted posts** — opt-in private posts visible only to followers
- [ ] **Long-form posts** — blog/article mode (extended character limit)
- [ ] **Behavioral CAPTCHA** — keystroke dynamics or similar (privacy-preserving)
- [ ] **Federation** — ActivityPub / AT Protocol compatibility
- [ ] **Rate limiting** — per-user post rate limits to slow bulk posting
- [ ] **Content moderation** — human-reviewed reports, no AI-assisted flagging
- [ ] **Paid verification** — optional supporter tier, revenue funds moderation

## Anti-AI Hardening (ongoing)

The anti-AI protection surface is never "done." As new crawlers emerge, the blocklist will grow.

- [ ] Upstash Redis IP blacklisting (linked to honeypot hits)
- [ ] Signed request tokens to prevent headless browser scraping
- [ ] Rate-limit unauthenticated feed reads
- [ ] Periodic `robots.txt` / `ai.txt` updates as new crawlers are discovered

---

To propose a feature, open an issue. To understand why a feature is intentionally absent (e.g., algorithmic recommendations, AI moderation), see the README.
