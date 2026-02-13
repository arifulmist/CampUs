import { supabase } from "../../../../../supabase/supabaseClient";

export interface Conversation {
  id: string;
  sender_id: string;
  receiver_id: string;
  last_message_id?: string;
  created_at: string;
  updated_at: string;
  other_user: {
    auth_uid: string;
    name: string;
    profile_picture_url?: string;
    batch?: string;
  };
  last_message?: {
    id: string;
    message_body: string;
    created_at: string;
    sender_id: string;
    read_at?: string;
  };
  unread_count: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  message_body: string;
  created_at: string;
  read_at?: string;
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

// Supabase response types
interface ConversationRow {
  id: string;
  sender_id: string;
  receiver_id: string;
  last_message_id?: string;
  created_at: string;
  updated_at: string;
  last_message?: {
    id: string;
    message_body: string;
    created_at: string;
    sender_id: string;
    read_at?: string;
  } | null;
}

interface RealtimePayload {
  new: Record<string, unknown>;
  old?: Record<string, unknown>;
  eventType: string;
}

/**
 * Get all conversations for the current user
 */
export async function getConversations(): Promise<Conversation[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("conversations")
      .select(`
        id,
        sender_id,
        receiver_id,
        last_message_id,
        created_at,
        updated_at,
        last_message:all_messages!conversations_last_message_id_fkey(
          id,
          message_body,
          created_at,
          sender_id,
          read_at
        )
      `)
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      // Do not show conversations that were never started (no messages)
      .not("last_message_id", "is", null)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    // Get other user info and unread counts for each conversation
    const conversationsWithUserInfo = await Promise.all(
      data.map(async (conv: ConversationRow) => {
        const otherUserId = conv.sender_id === user.id ? conv.receiver_id : conv.sender_id;
        
        // Get other user's profile info
        const { data: userInfo, error: userError } = await supabase
          .from("user_info")
          .select("auth_uid, name, batch, department, departments_lookup(department_name)")
          .eq("auth_uid", otherUserId)
          .single();

        const { data: profileInfo } = await supabase
          .from("user_profile")
          .select("profile_picture_url")
          .eq("auth_uid", otherUserId)
          .single();

        if (userError) {
          console.error("Error fetching user info:", userError);
        }

        // Count unread messages
        const { count: unreadCount } = await supabase
          .from("all_messages")
          .select("*", { count: "exact", head: true })
          .eq("conversation_id", conv.id)
          .neq("sender_id", user.id)
          .is("read_at", null);

        // Format batch display like in TopNav
        const userInfoWithDept = userInfo as typeof userInfo & {
          departments_lookup?: { department_name: string }
        };
        const deptName = userInfoWithDept?.departments_lookup?.department_name || userInfo?.department || "";
        const batchValue = userInfo?.batch ?? null;
        const displayBatch = deptName && batchValue ? `${deptName}-${batchValue}` : "";

        return {
          ...conv,
          other_user: {
            auth_uid: otherUserId,
            name: userInfo?.name || "Unknown User",
            profile_picture_url: profileInfo?.profile_picture_url || undefined,
            batch: displayBatch,
          },
          unread_count: unreadCount || 0,
        };
      })
    );

    return conversationsWithUserInfo as Conversation[];
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return [];
  }
}

/**
 * Get an existing conversation id between the current user and another user.
 * Does NOT create a conversation.
 */
export async function getExistingConversationId(otherUserId: string): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: existingConv, error } = await supabase
      .from("conversations")
      .select("id")
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`
      )
      .maybeSingle();

    if (error) throw error;
    return existingConv?.id ?? null;
  } catch (error) {
    console.error("Error getting existing conversation:", error);
    return null;
  }
}

/**
 * Get messages for a specific conversation
 */
export async function getMessages(conversationId: string): Promise<Message[]> {
  try {
    const { data, error } = await supabase
      .from("all_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data as Message[];
  } catch (error) {
    console.error("Error fetching messages:", error);
    return [];
  }
}

/**
 * Send a new message
 */
export async function sendMessage(conversationId: string, messageBody: string): Promise<Message | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Insert new message
    const { data: newMessage, error: messageError } = await supabase
      .from("all_messages")
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        message_body: messageBody.trim(),
      })
      .select()
      .single();

    if (messageError) throw messageError;

    // Update conversation's last_message_id and updated_at
    const { error: updateError } = await supabase
      .from("conversations")
      .update({
        last_message_id: newMessage.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversationId);

    if (updateError) throw updateError;

    return newMessage as Message;
  } catch (error) {
    console.error("Error sending message:", error);
    return null;
  }
}

/**
 * Mark messages as read
 */
export async function markMessagesAsRead(conversationId: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Mark all unread messages in this conversation as read
    const { error } = await supabase
      .from("all_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .neq("sender_id", user.id)
      .is("read_at", null);

    if (error) throw error;
  } catch (error) {
    console.error("Error marking messages as read:", error);
  }
}

/**
 * Create or get existing conversation between two users
 */
export async function getOrCreateConversation(otherUserId: string): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Check if conversation already exists
    const { data: existingConv, error: checkError } = await supabase
      .from("conversations")
      .select("id")
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`
      )
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      throw checkError;
    }

    if (existingConv) {
      return existingConv.id;
    }

    // Create new conversation
    const { data: newConv, error: createError } = await supabase
      .from("conversations")
      .insert({
        sender_id: user.id,
        receiver_id: otherUserId,
      })
      .select("id")
      .single();

    if (createError) throw createError;

    return newConv.id;
  } catch (error) {
    console.error("Error creating conversation:", error);
    return null;
  }
}

/**
 * Subscribe to real-time message updates for a conversation
 */
export function subscribeToMessages(
  conversationId: string,
  onNewMessage: (message: Message) => void
): () => void {
  const channel = supabase
    .channel(`messages-${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "all_messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload: RealtimePayload) => {
        onNewMessage(payload.new as Message);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to conversation updates (for conversation list)
 */
export function subscribeToConversations(
  onUpdate: () => void
): () => void {
  const messageChannel = supabase
    .channel("conversation-updates")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "all_messages",
      },
      () => {
        onUpdate();
      }
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public", 
        table: "conversations",
      },
      () => {
        onUpdate();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(messageChannel);
  };
}