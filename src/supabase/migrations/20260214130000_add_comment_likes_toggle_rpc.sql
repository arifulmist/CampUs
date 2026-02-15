-- Create per-user comment likes to track likes accurately

create table if not exists public.comment_likes (
  comment_id uuid not null,
  user_id uuid not null,
  created_at timestamp with time zone not null default now(),
  constraint comment_likes_pkey primary key (comment_id, user_id),
  constraint comment_likes_comment_id_fkey foreign key (comment_id)
    references public.comments (comment_id) on update cascade on delete cascade,
  constraint comment_likes_user_id_fkey foreign key (user_id)
    references public.user_info (auth_uid) on update cascade on delete cascade
);

create index if not exists comment_likes_comment_id_idx on public.comment_likes (comment_id);
create index if not exists comment_likes_user_id_idx on public.comment_likes (user_id);

-- Toggle like for a given user+comment and return updated count + liked state.
-- Also sync comments.like_count for easy sorting.
create or replace function public.toggle_comment_like(
  p_comment_id uuid,
  p_user_id uuid
)
returns table (
  like_count bigint,
  liked boolean
)
language plpgsql
as $$
declare
  existed boolean;
  new_count bigint;
begin
  select exists(
    select 1 from public.comment_likes
    where comment_id = p_comment_id and user_id = p_user_id
  ) into existed;

  if existed then
    delete from public.comment_likes
    where comment_id = p_comment_id and user_id = p_user_id;
    liked := false;
  else
    insert into public.comment_likes (comment_id, user_id)
    values (p_comment_id, p_user_id)
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
