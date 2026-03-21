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
