-- Allow viewing other users' profiles (read-only) from the client.
--
-- Without these SELECT policies, Supabase RLS will typically return empty
-- result sets when querying another user's rows, which breaks profile pages
-- like /profile/<student_id>.

-- Profile (bio + image URLs)
alter table public.user_profile enable row level security;
drop policy if exists "allow authenticated read user_profile" on public.user_profile;
create policy "allow authenticated read user_profile"
  on public.user_profile
  for select
  to authenticated
  using (true);

-- Skills join table
alter table public.user_skills enable row level security;
drop policy if exists "allow authenticated read user_skills" on public.user_skills;
create policy "allow authenticated read user_skills"
  on public.user_skills
  for select
  to authenticated
  using (true);

-- Interests join table
alter table public.user_interests enable row level security;
drop policy if exists "allow authenticated read user_interests" on public.user_interests;
create policy "allow authenticated read user_interests"
  on public.user_interests
  for select
  to authenticated
  using (true);

-- Posts join table
alter table public.user_posts enable row level security;
drop policy if exists "allow authenticated read user_posts" on public.user_posts;
create policy "allow authenticated read user_posts"
  on public.user_posts
  for select
  to authenticated
  using (true);
