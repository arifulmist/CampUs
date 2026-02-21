-- RPC to fetch conversations list in a single round-trip
-- Returns: conversation + other user meta + last message + unread count

CREATE OR REPLACE FUNCTION public.get_my_conversations()
RETURNS TABLE (
  id uuid,
  sender_id uuid,
  receiver_id uuid,
  last_message_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  other_auth_uid uuid,
  other_name text,
  other_profile_picture_url text,
  other_batch integer,
  other_department text,
  other_department_name text,
  last_message_body text,
  last_message_created_at timestamptz,
  last_message_sender_id uuid,
  last_message_read_at timestamptz,
  unread_count bigint
)
LANGUAGE sql
STABLE
AS $$
  WITH my_conversations AS (
    SELECT c.*
    FROM public.conversations c
    WHERE c.sender_id = auth.uid() OR c.receiver_id = auth.uid()
  )
  SELECT
    c.id,
    c.sender_id,
    c.receiver_id,
    c.last_message_id,
    c.created_at,
    c.updated_at,
    ou.auth_uid AS other_auth_uid,
    ou.name AS other_name,
    op.profile_picture_url AS other_profile_picture_url,
    ou.batch AS other_batch,
    ou.department AS other_department,
    dl.department_name AS other_department_name,
    COALESCE(lm.message_body, fb.message_body) AS last_message_body,
    COALESCE(lm.created_at, fb.created_at) AS last_message_created_at,
    COALESCE(lm.sender_id, fb.sender_id) AS last_message_sender_id,
    COALESCE(lm.read_at, fb.read_at) AS last_message_read_at,
    (
      SELECT count(*)
      FROM public.all_messages m
      WHERE m.conversation_id = c.id
        AND m.sender_id <> auth.uid()
        AND m.read_at IS NULL
    ) AS unread_count
  FROM my_conversations c
  JOIN public.user_info ou
    ON ou.auth_uid = CASE
      WHEN c.sender_id = auth.uid() THEN c.receiver_id
      ELSE c.sender_id
    END
  LEFT JOIN public.user_profile op
    ON op.auth_uid = ou.auth_uid
  LEFT JOIN public.departments_lookup dl
    ON dl.dept_id = ou.department
  LEFT JOIN public.all_messages lm
    ON lm.id = c.last_message_id
  LEFT JOIN LATERAL (
    SELECT m.message_body, m.created_at, m.sender_id, m.read_at
    FROM public.all_messages m
    WHERE m.conversation_id = c.id
    ORDER BY m.created_at DESC
    LIMIT 1
  ) fb ON true
  ORDER BY COALESCE(lm.created_at, fb.created_at, c.updated_at) DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_conversations() TO authenticated;
