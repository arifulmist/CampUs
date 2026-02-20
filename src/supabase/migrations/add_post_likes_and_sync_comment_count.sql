-- Add per-user post likes + server-side comment_count sync

-- 1) Post likes table
create table if not exists public.post_likes (
  post_id uuid not null,
  user_id uuid not null,
  created_at timestamp with time zone not null default now(),
  constraint post_likes_pkey primary key (post_id, user_id),
  constraint post_likes_post_id_fkey foreign key (post_id) references public.all_posts (post_id) on update cascade on delete cascade,
  constraint post_likes_user_id_fkey foreign key (user_id) references public.user_info (auth_uid) on update cascade on delete cascade
);

create index if not exists post_likes_post_id_idx on public.post_likes (post_id);
create index if not exists post_likes_user_id_idx on public.post_likes (user_id);

alter table public.post_likes enable row level security;

drop policy if exists post_likes_select_own on public.post_likes;
create policy post_likes_select_own
on public.post_likes
for select
using (user_id = auth.uid());

drop policy if exists post_likes_insert_own on public.post_likes;
create policy post_likes_insert_own
on public.post_likes
for insert
with check (user_id = auth.uid());

drop policy if exists post_likes_delete_own on public.post_likes;
create policy post_likes_delete_own
on public.post_likes
for delete
using (user_id = auth.uid());

-- 2) SECURITY DEFINER RPC to toggle likes for current user
create or replace function public.toggle_post_like(
  p_post_id uuid
)
returns table (
  like_count integer,
  liked boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  existed boolean;
  new_count integer;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select exists(
    select 1 from public.post_likes
    where post_id = p_post_id and user_id = v_user_id
  ) into existed;

  if existed then
    delete from public.post_likes
    where post_id = p_post_id and user_id = v_user_id;
    liked := false;
  else
    insert into public.post_likes (post_id, user_id)
    values (p_post_id, v_user_id)
    on conflict do nothing;
    liked := true;
  end if;

  select count(*)::int into new_count
  from public.post_likes
  where post_id = p_post_id;

  update public.all_posts
  set like_count = new_count,
      updated_at = now()
  where post_id = p_post_id;

  like_count := new_count;
  return next;
end;
$$;

grant execute on function public.toggle_post_like(uuid) to anon, authenticated;

-- 3) Sync comment_count in all_posts via triggers (includes replies)
create or replace function public.sync_all_posts_comment_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_post uuid;
  new_count integer;
begin
  target_post := coalesce(new.post_id, old.post_id);

  select count(*)::int into new_count
  from public.comments
  where post_id = target_post;

  update public.all_posts
  set comment_count = new_count,
      updated_at = now()
  where post_id = target_post;

  return null;
end;
$$;

drop trigger if exists trg_sync_comment_count_insert on public.comments;
create trigger trg_sync_comment_count_insert
after insert on public.comments
for each row
execute function public.sync_all_posts_comment_count();

drop trigger if exists trg_sync_comment_count_delete on public.comments;
create trigger trg_sync_comment_count_delete
after delete on public.comments
for each row
execute function public.sync_all_posts_comment_count();

-- Backfill comment_count for existing posts
update public.all_posts p
set comment_count = c.cnt,
    updated_at = now()
from (
  select post_id, count(*)::int as cnt
  from public.comments
  group by post_id
) c
where p.post_id = c.post_id;

update public.all_posts
set comment_count = 0,
    updated_at = now()
where comment_count is null;
