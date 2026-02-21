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
