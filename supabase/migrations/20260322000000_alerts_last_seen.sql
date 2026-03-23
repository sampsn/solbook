alter table public.profiles
  add column if not exists alerts_last_seen_at timestamptz;
