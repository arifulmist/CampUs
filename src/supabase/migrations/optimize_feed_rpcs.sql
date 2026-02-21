-- Optimize feed RPCs to reduce payload size and avoid heavy aggregation work
-- This migration updates the existing RPC functions created in add_feed_rpcs.sql.

-- QnA feed: truncate description for feed payload.
CREATE OR REPLACE FUNCTION public.get_qna_feed_page(
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0,
  p_category text DEFAULT NULL,
  p_search text DEFAULT NULL
)
RETURNS TABLE (
  post_id text,
  title text,
  description text,
  author_id text,
  like_count bigint,
  comment_count bigint,
  created_at timestamptz,
  attachment_url text,
  qna_category text,
  author_name text,
  author_auth_uid text,
  author_department text,
  author_batch text
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    ap.post_id,
    ap.title,
    left(ap.description, 1200) AS description,
    ap.author_id,
    COALESCE(ap.like_count, 0) AS like_count,
    COALESCE(ap.comment_count, 0) AS comment_count,
    ap.created_at,
    qp.img_url AS attachment_url,
    qc.category_name::text AS qna_category,
    COALESCE(ui.name, 'Unknown') AS author_name,
    ui.auth_uid AS author_auth_uid,
    COALESCE(dl.department_name, ui.department, '') AS author_department,
    COALESCE(ui.batch::text, '') AS author_batch
  FROM public.all_posts ap
  JOIN public.qna_posts qp ON qp.post_id = ap.post_id
  JOIN public.qna_category qc ON qc.category_id = qp.category_id
  LEFT JOIN public.user_info ui ON ui.auth_uid = ap.author_id
  LEFT JOIN public.departments_lookup dl ON dl.dept_id = ui.department
  WHERE lower(ap.type) = 'qna'
    AND (p_category IS NULL OR qc.category_name::text = p_category)
    AND (
      p_search IS NULL
      OR ap.title ILIKE ('%' || p_search || '%')
      OR ap.description ILIKE ('%' || p_search || '%')
    )
  ORDER BY ap.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- Lost & Found feed: truncate description for feed payload.
CREATE OR REPLACE FUNCTION public.get_lostfound_feed_page(
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
  lf_category text,
  img_url text,
  date_lost_or_found date,
  time_lost_or_found text,
  author_name text,
  author_auth_uid text,
  author_department text,
  author_batch text,
  author_avatar text
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    ap.post_id,
    ap.title,
    left(ap.description, 1600) AS description,
    ap.author_id,
    COALESCE(ap.like_count, 0) AS like_count,
    COALESCE(ap.comment_count, 0) AS comment_count,
    ap.created_at,
    COALESCE(lf.category::text, 'lost') AS lf_category,
    lf.img_url,
    lf.date_lost_or_found,
    lf.time_lost_or_found,
    COALESCE(ui.name, 'Unknown') AS author_name,
    ui.auth_uid AS author_auth_uid,
    COALESCE(dl.department_name, ui.department, '') AS author_department,
    COALESCE(ui.batch::text, '') AS author_batch,
    up.profile_picture_url AS author_avatar
  FROM public.all_posts ap
  JOIN public.lost_and_found_posts lf ON lf.post_id = ap.post_id
  LEFT JOIN public.user_info ui ON ui.auth_uid = ap.author_id
  LEFT JOIN public.departments_lookup dl ON dl.dept_id = ui.department
  LEFT JOIN public.user_profile up ON up.auth_uid = ui.auth_uid
  WHERE lower(ap.type) = 'lostfound'
    AND (p_category IS NULL OR lower(lf.category::text) = lower(p_category))
  ORDER BY ap.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- Events feed: the list view does not need full segments; return an empty array to avoid expensive per-row aggregation.
-- Keep tags aggregation (used in the card UI) but truncate description.
CREATE OR REPLACE FUNCTION public.get_events_feed_page(
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0,
  p_category text DEFAULT NULL
)
RETURNS TABLE (
  post_id text,
  title text,
  description text,
  like_count bigint,
  comment_count bigint,
  created_at timestamptz,
  location text,
  event_start_date date,
  event_end_date date,
  registration_link text,
  img_url text,
  category_name text,
  author_auth_uid text,
  author_name text,
  author_department text,
  author_batch text,
  author_avatar text,
  segments jsonb,
  tags jsonb
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    ev.post_id,
    ap.title,
    left(ap.description, 1800) AS description,
    COALESCE(ap.like_count, 0) AS like_count,
    COALESCE(ap.comment_count, 0) AS comment_count,
    ap.created_at,
    ev.location,
    ev.event_start_date,
    ev.event_end_date,
    ev.registration_link,
    ev.img_url,
    COALESCE(ec.category_name::text, 'Uncategorized') AS category_name,
    upost.auth_uid AS author_auth_uid,
    COALESCE(ui.name, 'Unknown') AS author_name,
    COALESCE(dl.department_name, ui.department, '') AS author_department,
    COALESCE(ui.batch::text, '') AS author_batch,
    prof.profile_picture_url AS author_avatar,
    '[]'::jsonb AS segments,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'skill_id', pt.skill_id,
            'name', sl.skill
          )
          ORDER BY sl.skill
        )
        FROM public.post_tags pt
        JOIN public.skills_lookup sl ON sl.id = pt.skill_id
        WHERE pt.post_id = ev.post_id
      ),
      '[]'::jsonb
    ) AS tags
  FROM public.event_posts ev
  JOIN public.all_posts ap ON ap.post_id = ev.post_id
  LEFT JOIN public.events_category ec ON ec.category_id = ev.category_id
  LEFT JOIN public.user_posts upost ON upost.post_id = ev.post_id
  LEFT JOIN public.user_info ui ON ui.auth_uid = upost.auth_uid
  LEFT JOIN public.departments_lookup dl ON dl.dept_id = ui.department
  LEFT JOIN public.user_profile prof ON prof.auth_uid = ui.auth_uid
  WHERE ap.type = 'event'
    AND (p_category IS NULL OR ec.category_name::text = p_category)
  ORDER BY ap.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;
