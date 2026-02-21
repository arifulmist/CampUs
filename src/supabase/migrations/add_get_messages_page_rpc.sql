-- RPC to fetch paginated messages for a conversation
-- Used to speed up chat history loads by avoiding full-table fetches.

CREATE OR REPLACE FUNCTION public.get_messages_page(
  p_conversation_id uuid,
  p_before timestamptz DEFAULT NULL,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  conversation_id uuid,
  sender_id uuid,
  message_body text,
  created_at timestamptz,
  read_at timestamptz
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    m.id,
    m.conversation_id,
    m.sender_id,
    m.message_body,
    m.created_at,
    m.read_at
  FROM public.all_messages m
  WHERE m.conversation_id = p_conversation_id
    AND (p_before IS NULL OR m.created_at < p_before)
    AND EXISTS (
      SELECT 1
      FROM public.conversations c
      WHERE c.id = p_conversation_id
        AND (c.sender_id = auth.uid() OR c.receiver_id = auth.uid())
    )
  ORDER BY m.created_at DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 200);
$$;

GRANT EXECUTE ON FUNCTION public.get_messages_page(uuid, timestamptz, integer) TO authenticated;
