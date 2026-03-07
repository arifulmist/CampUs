-- Home feed performance indexes
-- Targets queries in src/app/pages/Home/Home.tsx

-- Most popular: ORDER BY like_count desc LIMIT N
CREATE INDEX IF NOT EXISTS idx_all_posts_like_count_desc_created_at_desc
  ON public.all_posts (like_count DESC, created_at DESC);

-- Relevant: fetch user skills/interests by auth_uid
CREATE INDEX IF NOT EXISTS idx_user_skills_auth_uid_skill_id
  ON public.user_skills (auth_uid, skill_id);

-- user_interests uses interest_id
CREATE INDEX IF NOT EXISTS idx_user_interests_auth_uid_interest_id
  ON public.user_interests (auth_uid, interest_id);

-- Relevant: fetch post_ids by skill_id
CREATE INDEX IF NOT EXISTS idx_post_tags_skill_id_post_id
  ON public.post_tags (skill_id, post_id);
