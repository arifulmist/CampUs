-- Fix Collab feed RPC category filtering to be case-insensitive.
-- Without this, a UI value like 'research' will not match a DB value like 'Research'.

CREATE OR REPLACE FUNCTION public.get_collab_feed_page(
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0,
  p_category text DEFAULT NULL
)
RETURNS TABLE (
  post_id text,
  title text,
  description text,
  author_id text,
  like_count bigint,
  comment_count bigint,
  created_at timestamptz,
  category text,
  author_name text,
  author_auth_uid text,
  author_department text,
  author_batch text,
  author_avatar text,
  tags text[]
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    ap.post_id,
    ap.title,
    ap.description,
    ap.author_id,
    COALESCE(ap.like_count, 0) AS like_count,
    COALESCE(ap.comment_count, 0) AS comment_count,
    ap.created_at,
    cc.category::text AS category,
    COALESCE(ui.name, 'Unknown') AS author_name,
    ui.auth_uid AS author_auth_uid,
    COALESCE(dl.department_name, ui.department, '') AS author_department,
    COALESCE(ui.batch::text, '') AS author_batch,
    up.profile_picture_url AS author_avatar,
    COALESCE(
      (
        SELECT array_agg(sl.skill ORDER BY sl.skill)
        FROM public.post_tags pt
        JOIN public.skills_lookup sl ON sl.id = pt.skill_id
        WHERE pt.post_id = ap.post_id
      ),
      ARRAY[]::text[]
    ) AS tags
  FROM public.all_posts ap
  JOIN public.collab_posts cp ON cp.post_id = ap.post_id
  JOIN public.collab_category cc ON cc.category_id = cp.category_id
  LEFT JOIN public.user_info ui ON ui.auth_uid = ap.author_id
  LEFT JOIN public.departments_lookup dl ON dl.dept_id = ui.department
  LEFT JOIN public.user_profile up ON up.auth_uid = ui.auth_uid
  WHERE lower(ap.type) = 'collab'
    AND (p_category IS NULL OR lower(cc.category::text) = lower(p_category))
  ORDER BY ap.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;
