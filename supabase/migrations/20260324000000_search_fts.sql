-- supabase/migrations/20260324000000_search_fts.sql

-- 1. Update reserved username constraint to include 'search'
alter table public.profiles drop constraint username_not_reserved;
alter table public.profiles add constraint username_not_reserved check (
  username not in (
    'home', 'discover', 'compose', 'notifications',
    'settings', 'login', 'signup', 'api', 'admin', 'post', 'search'
  )
);

-- 2. Full-text search on profiles
--    username: weight A (highest), display_name: B, bio: C
alter table public.profiles
  add column fts_doc tsvector generated always as (
    setweight(to_tsvector('english', coalesce(username, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(display_name, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(bio, '')), 'C')
  ) stored;

create index profiles_fts_idx on public.profiles using gin(fts_doc);

-- 3. Full-text search on posts
alter table public.posts
  add column fts_doc tsvector generated always as (
    to_tsvector('english', coalesce(content, ''))
  ) stored;

create index posts_fts_idx on public.posts using gin(fts_doc);
