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
