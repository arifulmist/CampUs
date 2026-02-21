-- Allow comment owners to update/delete their own comments (and allow authenticated users to read)

alter table public.comments enable row level security;

-- READ: authenticated users can read comments
drop policy if exists comments_select_authenticated on public.comments;
create policy comments_select_authenticated
on public.comments
for select
to authenticated
using (true);

-- INSERT: authenticated users can insert their own comments
drop policy if exists comments_insert_own on public.comments;
create policy comments_insert_own
on public.comments
for insert
to authenticated
with check (author_id = auth.uid());

-- UPDATE: only the author can edit
drop policy if exists comments_update_own on public.comments;
create policy comments_update_own
on public.comments
for update
to authenticated
using (author_id = auth.uid())
with check (author_id = auth.uid());

-- DELETE: only the author can delete
drop policy if exists comments_delete_own on public.comments;
create policy comments_delete_own
on public.comments
for delete
to authenticated
using (author_id = auth.uid());
