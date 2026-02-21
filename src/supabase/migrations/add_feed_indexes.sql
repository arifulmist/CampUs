-- Feed performance indexes for Events, Collab, QnA, Lost & Found
-- Targets the access patterns used in:
-- - src/app/pages/CollabHub/CollabHub.tsx
-- - src/app/pages/Events/Events.tsx
-- - src/app/pages/QnA/components/QAPageContent.tsx
-- - src/app/pages/LostAndFound/backend/lostAndFoundService.ts
-- - detail routes which do .eq('post_id', ...)

-- all_posts: feed lists commonly filter by type and order by created_at desc
CREATE INDEX IF NOT EXISTS idx_all_posts_type_created_at_desc
  ON public.all_posts (type, created_at DESC);

-- all_posts: common joins + profile pages filter by author
CREATE INDEX IF NOT EXISTS idx_all_posts_author_created_at_desc
  ON public.all_posts (author_id, created_at DESC);

-- QnA: join all_posts <-> qna_posts and filter/update by category
CREATE INDEX IF NOT EXISTS idx_qna_posts_post_id
  ON public.qna_posts (post_id);

CREATE INDEX IF NOT EXISTS idx_qna_posts_category_id
  ON public.qna_posts (category_id);

-- Collab: join all_posts <-> collab_posts and map category
CREATE INDEX IF NOT EXISTS idx_collab_posts_post_id
  ON public.collab_posts (post_id);

CREATE INDEX IF NOT EXISTS idx_collab_posts_category_id
  ON public.collab_posts (category_id);

-- Lost & Found: join all_posts <-> lost_and_found_posts and filter by category
CREATE INDEX IF NOT EXISTS idx_lost_and_found_posts_post_id
  ON public.lost_and_found_posts (post_id);

CREATE INDEX IF NOT EXISTS idx_lost_and_found_posts_category
  ON public.lost_and_found_posts (category);

-- Events: feed orders by event_start_date and joins post_id
CREATE INDEX IF NOT EXISTS idx_event_posts_event_start_date_desc
  ON public.event_posts (event_start_date DESC);

CREATE INDEX IF NOT EXISTS idx_event_posts_post_id
  ON public.event_posts (post_id);

CREATE INDEX IF NOT EXISTS idx_event_posts_category_id
  ON public.event_posts (category_id);

-- Event segments: fetch segments by post_id
CREATE INDEX IF NOT EXISTS idx_event_segment_post_id
  ON public.event_segment (post_id);

-- Tags: fetch tags by post_id (events/collab) and sometimes by skill
CREATE INDEX IF NOT EXISTS idx_post_tags_post_id
  ON public.post_tags (post_id);

CREATE INDEX IF NOT EXISTS idx_post_tags_skill_id
  ON public.post_tags (skill_id);

-- user_posts: used to map post owners and profile pages
CREATE INDEX IF NOT EXISTS idx_user_posts_post_id
  ON public.user_posts (post_id);

CREATE INDEX IF NOT EXISTS idx_user_posts_auth_uid
  ON public.user_posts (auth_uid);

CREATE INDEX IF NOT EXISTS idx_user_posts_auth_uid_post_id
  ON public.user_posts (auth_uid, post_id);
