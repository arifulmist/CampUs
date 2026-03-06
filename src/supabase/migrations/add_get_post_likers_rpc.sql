-- RPC: get_post_likers
-- Returns the names (and user ids) of people who liked a given post.
-- Ordered by most recent first, limited to `p_limit` rows.
-- Uses SECURITY DEFINER so any authenticated user can see who liked a post
-- (the base post_likes SELECT policy is restricted to own rows only).

create or replace function public.get_post_likers(
  p_post_id uuid,
  p_limit int default 5
)
returns table (
  user_id uuid,
  name text,
  liked_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    pl.user_id,
    ui.name,
    pl.created_at as liked_at
  from public.post_likes pl
  join public.user_info ui on ui.auth_uid = pl.user_id
  where pl.post_id = p_post_id
  order by pl.created_at desc
  limit p_limit;
$$;
