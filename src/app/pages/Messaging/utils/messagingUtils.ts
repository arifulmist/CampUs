import { supabase } from "../../../../supabase/supabaseClient";

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

type GetMessagesPageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  message_body: string;
  created_at: string;
  read_at: string | null;
};

interface RealtimePayload {
  new: Record<string, unknown>;
  old?: Record<string, unknown>;
  eventType: string;
}

type GetMyConversationsRow = {
  id: string;
  sender_id: string;
  receiver_id: string;
  last_message_id: string | null;
  created_at: string;
  updated_at: string;
  other_auth_uid: string;
  other_name: string | null;
  other_profile_picture_url: string | null;
  other_batch: number | null;
  other_department: string | null;
  other_department_name: string | null;
  last_message_body: string | null;
  last_message_created_at: string | null;
  last_message_sender_id: string | null;
  last_message_read_at: string | null;
  unread_count: number | null;
};

/**
 * Get all conversations for the current user
 */
export async function getConversations(): Promise<Conversation[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Single round-trip: conversation + other user + last message + unread count
    const { data, error } = await supabase.rpc("get_my_conversations");
    if (error) throw error;

    const rows = (data ?? []) as unknown as GetMyConversationsRow[];
    const mapped: Conversation[] = rows.map((row) => {
      const deptName = row.other_department_name || row.other_department || "";
      const batchValue = typeof row.other_batch === "number" ? row.other_batch : null;
      const displayBatch = deptName && batchValue ? `${deptName}-${batchValue}` : "";

      const lastMessage = row.last_message_body
        ? {
            id: row.last_message_id || "",
            message_body: row.last_message_body,
            created_at: row.last_message_created_at || row.updated_at,
            sender_id: row.last_message_sender_id || "",
            read_at: row.last_message_read_at || undefined,
          }
        : undefined;

      return {
        id: row.id,
        sender_id: row.sender_id,
        receiver_id: row.receiver_id,
        last_message_id: row.last_message_id || undefined,
        created_at: row.created_at,
        updated_at: row.updated_at,
        other_user: {
          auth_uid: row.other_auth_uid,
          name: row.other_name?.trim() || "Unknown User",
          profile_picture_url: row.other_profile_picture_url || undefined,
          batch: displayBatch,
        },
        last_message: lastMessage,
        unread_count: row.unread_count || 0,
      };
    });

    // Preserve prior behavior: hide conversations with no messages yet
    return mapped.filter((c) => !!c.last_message);
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
    // Back-compat: return full history in ascending order.
    // Note: the UI should prefer getMessagesPage() for performance.
    const pageSize = 200;
    let before: string | null = null;
    const all: Message[] = [];

    for (;;) {
      const page = await getMessagesPage(conversationId, { before, limit: pageSize });
      if (page.length === 0) break;

      // page is ascending; the oldest message is at index 0
      all.push(...page);
      before = page[0]?.created_at ?? null;

      // If we got fewer than requested, we reached the beginning.
      if (page.length < pageSize) break;
    }

    return all;
  } catch (error) {
    console.error("Error fetching messages:", error);
    return [];
  }
}

export async function getMessagesPage(
  conversationId: string,
  opts?: { before?: string | null; limit?: number }
): Promise<Message[]> {
  try {
    const limit = typeof opts?.limit === "number" ? opts.limit : 50;
    const before = opts?.before ?? null;

    const { data, error } = await supabase.rpc("get_messages_page", {
      p_conversation_id: conversationId,
      p_before: before,
      p_limit: limit,
    });

    if (error) throw error;

    // RPC returns newest-first (DESC). Convert to ascending for the UI.
    const rows = (data ?? []) as unknown as GetMessagesPageRow[];
    const mapped: Message[] = rows.map((r) => ({
      id: r.id,
      conversation_id: r.conversation_id,
      sender_id: r.sender_id,
      message_body: r.message_body,
      created_at: r.created_at,
      read_at: r.read_at ?? undefined,
    }));

    mapped.reverse();
    return mapped;
  } catch (error) {
    console.error("Error fetching messages page:", error);
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
        onNewMessage(payload.new as unknown as Message);
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
        event: "INSERT",
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
        event: "INSERT",
        schema: "public", 
        table: "conversations",
      },
      () => {
        onUpdate();
      }
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
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