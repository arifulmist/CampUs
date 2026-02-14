-- Create messages table for real-time chat
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    message_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- Indexes for better query performance
    CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) 
        REFERENCES public.user_info(student_id) ON DELETE CASCADE,
    CONSTRAINT messages_receiver_id_fkey FOREIGN KEY (receiver_id) 
        REFERENCES public.user_info(student_id) ON DELETE CASCADE
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see messages they sent or received
CREATE POLICY "Users can view their own messages" ON public.messages
    FOR SELECT
    USING (
        sender_id IN (SELECT student_id FROM public.user_info WHERE auth_uid = auth.uid())
        OR receiver_id IN (SELECT student_id FROM public.user_info WHERE auth_uid = auth.uid())
    );

-- Users can only insert messages they are sending
CREATE POLICY "Users can send messages" ON public.messages
    FOR INSERT
    WITH CHECK (
        sender_id IN (SELECT student_id FROM public.user_info WHERE auth_uid = auth.uid())
    );

-- Users can update read status of messages they received
CREATE POLICY "Users can update their received messages" ON public.messages
    FOR UPDATE
    USING (
        receiver_id IN (SELECT student_id FROM public.user_info WHERE auth_uid = auth.uid())
    )
    WITH CHECK (
        receiver_id IN (SELECT student_id FROM public.user_info WHERE auth_uid = auth.uid())
    );

-- Enable realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Create a function to get or create conversation
CREATE OR REPLACE FUNCTION get_conversation_id(user1_id TEXT, user2_id TEXT)
RETURNS TEXT AS $$
DECLARE
    conv_id TEXT;
BEGIN
    -- Sort IDs to ensure consistent conversation_id
    IF user1_id < user2_id THEN
        conv_id := user1_id || '_' || user2_id;
    ELSE
        conv_id := user2_id || '_' || user1_id;
    END IF;
    RETURN conv_id;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create a view for conversations with last message
CREATE OR REPLACE VIEW user_conversations AS
SELECT DISTINCT ON (m.conversation_id, ui.auth_uid)
    m.conversation_id,
    ui.auth_uid,
    CASE 
        WHEN m.sender_id = ui.student_id THEN m.receiver_id
        ELSE m.sender_id
    END as other_user_id,
    MAX(m.created_at) as last_message_at,
    (
        SELECT message_text 
        FROM public.messages 
        WHERE conversation_id = m.conversation_id 
        ORDER BY created_at DESC 
        LIMIT 1
    ) as last_message
FROM public.messages m
JOIN public.user_info ui ON (ui.student_id = m.sender_id OR ui.student_id = m.receiver_id)
GROUP BY m.conversation_id, ui.auth_uid, ui.student_id, m.sender_id, m.receiver_id;
