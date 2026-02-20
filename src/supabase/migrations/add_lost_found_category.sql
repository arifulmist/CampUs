-- Add category to lost_and_found_posts so Lost/Found filtering works

alter table public.lost_and_found_posts
add column if not exists category text;

-- Backfill existing rows
update public.lost_and_found_posts
set category = 'lost'
where category is null;

-- Enforce not-null + allowed values
alter table public.lost_and_found_posts
alter column category set not null;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'lost_and_found_posts_category_check'
  ) THEN
    ALTER TABLE public.lost_and_found_posts
    ADD CONSTRAINT lost_and_found_posts_category_check
    CHECK (lower(category) IN ('lost','found'));
  END IF;
END $$;
