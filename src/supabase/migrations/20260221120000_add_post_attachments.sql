-- Generic attachments for any post type (events, lostfound, qna, collab, etc)
-- Stores up to N image urls per post (enforced at app-level).

create table if not exists public.post_attachments (
  post_id text not null,
  position integer not null,
  img_url text not null,
  created_at timestamptz not null default now(),
  constraint post_attachments_pkey primary key (post_id, position),
  constraint post_attachments_post_id_fkey foreign key (post_id) references public.all_posts (post_id) on delete cascade,
  constraint post_attachments_position_check check (position >= 0)
);

create index if not exists idx_post_attachments_post_id
  on public.post_attachments (post_id);

-- RLS: allow anyone logged in to read attachments; only post owners can write
alter table public.post_attachments enable row level security;

drop policy if exists post_attachments_select_authenticated on public.post_attachments;
create policy post_attachments_select_authenticated
on public.post_attachments
for select
to authenticated
using (true);

drop policy if exists post_attachments_insert_own on public.post_attachments;
create policy post_attachments_insert_own
on public.post_attachments
for insert
to authenticated
with check (
  exists (
    select 1
    from public.all_posts p
    where p.post_id = post_attachments.post_id
      and p.author_id = auth.uid()
  )
);

drop policy if exists post_attachments_update_own on public.post_attachments;
create policy post_attachments_update_own
on public.post_attachments
for update
to authenticated
using (
  exists (
    select 1
    from public.all_posts p
    where p.post_id = post_attachments.post_id
      and p.author_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.all_posts p
    where p.post_id = post_attachments.post_id
      and p.author_id = auth.uid()
  )
);

drop policy if exists post_attachments_delete_own on public.post_attachments;
create policy post_attachments_delete_own
on public.post_attachments
for delete
to authenticated
using (
  exists (
    select 1
    from public.all_posts p
    where p.post_id = post_attachments.post_id
      and p.author_id = auth.uid()
  )
);
