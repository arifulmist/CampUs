-- Allow event owners to update/delete their own event posts (and dependent rows)
-- This fixes edit flows where inserts succeed but updates/deletes are blocked by RLS,
-- causing segments/tags to appear to append instead of replace.

-- all_posts: owner can insert/update/delete their own posts

drop policy if exists all_posts_insert_own on public.all_posts;
create policy all_posts_insert_own
  on public.all_posts
  for insert
  to authenticated
  with check (author_id = auth.uid());

drop policy if exists all_posts_update_own on public.all_posts;
create policy all_posts_update_own
  on public.all_posts
  for update
  to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

drop policy if exists all_posts_delete_own on public.all_posts;
create policy all_posts_delete_own
  on public.all_posts
  for delete
  to authenticated
  using (author_id = auth.uid());

-- event_posts: owner (via all_posts) can insert/update/delete

drop policy if exists event_posts_insert_own on public.event_posts;
create policy event_posts_insert_own
  on public.event_posts
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.all_posts p
      where p.post_id = event_posts.post_id
        and p.author_id = auth.uid()
    )
  );

drop policy if exists event_posts_update_own on public.event_posts;
create policy event_posts_update_own
  on public.event_posts
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.all_posts p
      where p.post_id = event_posts.post_id
        and p.author_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.all_posts p
      where p.post_id = event_posts.post_id
        and p.author_id = auth.uid()
    )
  );

drop policy if exists event_posts_delete_own on public.event_posts;
create policy event_posts_delete_own
  on public.event_posts
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.all_posts p
      where p.post_id = event_posts.post_id
        and p.author_id = auth.uid()
    )
  );

-- event_segment: owner (via all_posts) can insert/update/delete

drop policy if exists event_segment_insert_own on public.event_segment;
create policy event_segment_insert_own
  on public.event_segment
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.all_posts p
      where p.post_id = event_segment.post_id
        and p.author_id = auth.uid()
    )
  );

drop policy if exists event_segment_update_own on public.event_segment;
create policy event_segment_update_own
  on public.event_segment
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.all_posts p
      where p.post_id = event_segment.post_id
        and p.author_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.all_posts p
      where p.post_id = event_segment.post_id
        and p.author_id = auth.uid()
    )
  );

drop policy if exists event_segment_delete_own on public.event_segment;
create policy event_segment_delete_own
  on public.event_segment
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.all_posts p
      where p.post_id = event_segment.post_id
        and p.author_id = auth.uid()
    )
  );

-- post_tags: owner (via all_posts) can insert/delete (updates aren’t needed)

drop policy if exists post_tags_insert_own on public.post_tags;
create policy post_tags_insert_own
  on public.post_tags
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.all_posts p
      where p.post_id = post_tags.post_id
        and p.author_id = auth.uid()
    )
  );

drop policy if exists post_tags_delete_own on public.post_tags;
create policy post_tags_delete_own
  on public.post_tags
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.all_posts p
      where p.post_id = post_tags.post_id
        and p.author_id = auth.uid()
    )
  );
