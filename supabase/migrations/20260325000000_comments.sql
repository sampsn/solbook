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
