-- Allow QnA post owners to update/delete their own qna_posts row (ownership derived from all_posts)

alter table public.qna_posts enable row level security;

drop policy if exists qna_posts_insert_own on public.qna_posts;
create policy qna_posts_insert_own
on public.qna_posts
for insert
to authenticated
with check (
  exists (
    select 1
    from public.all_posts p
    where p.post_id = qna_posts.post_id
      and p.author_id = auth.uid()
  )
);

drop policy if exists qna_posts_update_own on public.qna_posts;
create policy qna_posts_update_own
on public.qna_posts
for update
to authenticated
using (
  exists (
    select 1
    from public.all_posts p
    where p.post_id = qna_posts.post_id
      and p.author_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.all_posts p
    where p.post_id = qna_posts.post_id
      and p.author_id = auth.uid()
  )
);

drop policy if exists qna_posts_delete_own on public.qna_posts;
create policy qna_posts_delete_own
on public.qna_posts
for delete
to authenticated
using (
  exists (
    select 1
    from public.all_posts p
    where p.post_id = qna_posts.post_id
      and p.author_id = auth.uid()
  )
);
