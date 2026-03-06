-- Harden comment likes: RLS policies + SECURITY DEFINER RPC using auth.uid()

alter table if exists public.comment_likes enable row level security;

-- Create policies: drop if exists then create (Postgres doesn't support IF NOT EXISTS for CREATE POLICY)
drop policy if exists comment_likes_select_own on public.comment_likes;
create policy comment_likes_select_own
on public.comment_likes
for select
using (user_id = auth.uid());

drop policy if exists comment_likes_insert_own on public.comment_likes;
create policy comment_likes_insert_own
on public.comment_likes
for insert
with check (user_id = auth.uid());

drop policy if exists comment_likes_delete_own on public.comment_likes;
create policy comment_likes_delete_own
on public.comment_likes
for delete
using (user_id = auth.uid());

-- SECURITY DEFINER RPC: toggles like for the *current* auth user.
create or replace function public.toggle_comment_like(
  p_comment_id uuid
)
returns table (
  like_count bigint,
  liked boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  existed boolean;
  new_count bigint;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select exists(
    select 1 from public.comment_likes
    where comment_id = p_comment_id and user_id = v_user_id
  ) into existed;

  if existed then
    delete from public.comment_likes
    where comment_id = p_comment_id and user_id = v_user_id;
    liked := false;
  else
    insert into public.comment_likes (comment_id, user_id)
    values (p_comment_id, v_user_id)
    on conflict do nothing;
    liked := true;
  end if;

  select count(*) into new_count
  from public.comment_likes
  where comment_id = p_comment_id;

  update public.comments
  set like_count = new_count
  where comment_id = p_comment_id;

  like_count := new_count;
  return next;
end;
$$;

grant execute on function public.toggle_comment_like(uuid) to anon, authenticated;
