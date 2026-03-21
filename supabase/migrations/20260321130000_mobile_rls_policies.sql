-- RLS policies for authenticated role (mobile app uses anon key + Supabase auth)

-- profiles: anyone authenticated can read; users can update/insert their own
create policy "authenticated users can read profiles"
  on public.profiles for select
  to authenticated
  using (true);

create policy "users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy "users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- posts: anyone authenticated can read; users can insert/delete their own
create policy "authenticated users can read posts"
  on public.posts for select
  to authenticated
  using (true);

create policy "users can insert their own posts"
  on public.posts for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "users can delete their own posts"
  on public.posts for delete
  to authenticated
  using (user_id = auth.uid());

-- likes: anyone authenticated can read; users can insert/delete their own
create policy "authenticated users can read likes"
  on public.likes for select
  to authenticated
  using (true);

create policy "users can insert their own likes"
  on public.likes for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "users can delete their own likes"
  on public.likes for delete
  to authenticated
  using (user_id = auth.uid());

-- follows: anyone authenticated can read; users can insert/delete their own
create policy "authenticated users can read follows"
  on public.follows for select
  to authenticated
  using (true);

create policy "users can insert their own follows"
  on public.follows for insert
  to authenticated
  with check (follower_id = auth.uid());

create policy "users can delete their own follows"
  on public.follows for delete
  to authenticated
  using (follower_id = auth.uid());

-- Grant execute on discover feed RPC to authenticated users
grant execute on function public.get_discover_feed(int, int) to authenticated;
