-- Messaging performance indexes for conversations/all_messages
-- These target the access patterns in src/app/pages/Messaging/utils/messagingUtils.ts

-- Conversations: fetch all conversations for a user ordered by updated_at
CREATE INDEX IF NOT EXISTS idx_conversations_sender_updated_at
  ON public.conversations (sender_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_receiver_updated_at
  ON public.conversations (receiver_id, updated_at DESC);

-- Conversations: fast lookup of an existing conversation between two users
-- (query uses OR of two AND clauses; having both directions helps the planner)
CREATE INDEX IF NOT EXISTS idx_conversations_sender_receiver
  ON public.conversations (sender_id, receiver_id);

CREATE INDEX IF NOT EXISTS idx_conversations_receiver_sender
  ON public.conversations (receiver_id, sender_id);

-- Conversations: join to last message (FK already references all_messages.id (PK),
-- but indexing the FK column can help some planners and future queries)
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_id
  ON public.conversations (last_message_id);

-- Messages: chat history and last message per conversation
CREATE INDEX IF NOT EXISTS idx_all_messages_conversation_created_at
  ON public.all_messages (conversation_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_all_messages_conversation_created_at_desc
  ON public.all_messages (conversation_id, created_at DESC);

-- Messages: unread count + mark-as-read operations
CREATE INDEX IF NOT EXISTS idx_all_messages_unread_conversation
  ON public.all_messages (conversation_id)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_all_messages_unread_conversation_sender
  ON public.all_messages (conversation_id, sender_id)
  WHERE read_at IS NULL;
