-- Auto-populate public.user_posts whenever a post is created.
--
-- Motivation:
-- The client currently inserts into user_posts for some post types (events/collab)
-- but not others (qna/lostfound), causing profile feeds to miss most posts.
-- This trigger centralizes ownership mapping in the database.

create or replace function public.handle_all_posts_insert_user_posts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.post_id is null then
    return new;
  end if;

  if new.author_id is null then
    return new;
  end if;

  insert into public.user_posts (post_id, auth_uid)
  values (new.post_id, new.author_id::uuid)
  on conflict (post_id) do nothing;

  return new;
exception
  when invalid_text_representation then
    -- If author_id is not castable to uuid (unexpected), do not block post creation.
    return new;
end;
$$;

drop trigger if exists trg_all_posts_insert_user_posts on public.all_posts;
create trigger trg_all_posts_insert_user_posts
after insert on public.all_posts
for each row
execute function public.handle_all_posts_insert_user_posts();

-- Optional backfill for existing posts.
-- Safe to re-run (idempotent) thanks to ON CONFLICT.
insert into public.user_posts (post_id, auth_uid)
select ap.post_id, ap.author_id::uuid
from public.all_posts ap
where ap.post_id is not null
  and ap.author_id is not null
on conflict (post_id) do nothing;
