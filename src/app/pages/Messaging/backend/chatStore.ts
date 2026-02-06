// Real-time chat store with Supabase integration
import { supabase } from "../../../../../supabase/supabaseClient";

export type ChatMessage = {
  id: string;
  from: "me" | "other";
  text: string;
  ts: number;
  status?: "sent" | "seen" | "failed";
};

export type ChatThread = {
  userId: string;
  userName: string;
  messages: ChatMessage[];
};

type Listener = (state: {
  threads: ChatThread[];
  activeUserId: string | null;
}) => void;

const state: {
  threads: ChatThread[];
  activeUserId: string | null;
  currentUserStudentId: string | null;
} = {
  threads: [],
  activeUserId: null,
  currentUserStudentId: null,
};

const listeners: Listener[] = [];

function notify() {
  const snapshot = {
    threads: [...state.threads],
    activeUserId: state.activeUserId,
  };
  listeners.forEach((l) => l(snapshot));
}

export function subscribe(listener: Listener) {
  listeners.push(listener);
  listener({ threads: [...state.threads], activeUserId: state.activeUserId });
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

export function getThreads() {
  return state.threads;
}

export function getActiveUserId() {
  return state.activeUserId;
}

export function ensureThread(userId: string, userName?: string) {
  const id = userId.trim();
  if (!id) return null;
  let t = state.threads.find((th) => th.userId === id);
  if (!t) {
    t = { userId: id, userName: userName ?? id, messages: [] };
    state.threads.push(t);
  } else if (userName && t.userName !== userName) {
    t.userName = userName;
  }
  return t;
}

// Load messages from Supabase for a conversation
export async function loadMessagesFromDB(otherUserId: string) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: userInfo } = await supabase
      .from("user_info")
      .select("student_id")
      .eq("auth_uid", user.id)
      .single();

    if (!userInfo?.student_id) return;

    state.currentUserStudentId = userInfo.student_id;

    // Get conversation ID (sorted pair of IDs)
    const [minId, maxId] = [userInfo.student_id, otherUserId].sort();
    const conversationId = `${minId}_${maxId}`;

    // Load messages from database
    const { data: messages, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading messages:", error);
      return;
    }

    const thread = ensureThread(otherUserId);
    if (!thread) return;

    // Convert DB messages to chat messages
    thread.messages = (messages || []).map((msg: {
      id: string;
      sender_id: string;
      message_text: string;
      created_at: string;
      read_at: string | null;
    }) => ({
      id: msg.id,
      from: msg.sender_id === userInfo.student_id ? "me" : "other",
      text: msg.message_text,
      ts: new Date(msg.created_at).getTime(),
      status:
        msg.sender_id === userInfo.student_id
          ? msg.read_at
            ? "seen"
            : "sent"
          : undefined,
    }));

    notify();
  } catch (error) {
    console.error("Error in loadMessagesFromDB:", error);
  }
}

export async function openChatWith(userId: string, userName?: string) {
  const t = ensureThread(userId, userName);
  if (!t) return;
  state.activeUserId = t.userId;

  // Load past messages from database
  await loadMessagesFromDB(userId);

  notify();
}

export async function sendMessage(text: string) {
  const msg = text.trim();
  if (!msg || !state.activeUserId) return;

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: userInfo } = await supabase
      .from("user_info")
      .select("student_id")
      .eq("auth_uid", user.id)
      .single();

    if (!userInfo?.student_id) return;

    const t = state.threads.find((th) => th.userId === state.activeUserId);
    if (!t) return;

    // Create temporary message
    const tempId = Math.random().toString(36).slice(2);
    t.messages.push({
      id: tempId,
      from: "me",
      text: msg,
      ts: Date.now(),
      status: "sent",
    });
    notify();

    // Get conversation ID
    const [minId, maxId] = [userInfo.student_id, state.activeUserId].sort();
    const conversationId = `${minId}_${maxId}`;

    // Save to database
    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: userInfo.student_id,
        receiver_id: state.activeUserId,
        message_text: msg,
      })
      .select()
      .single();

    if (error) {
      console.error("Error sending message:", error);
      // Update status to failed
      const msgIndex = t.messages.findIndex((m) => m.id === tempId);
      if (msgIndex >= 0) {
        t.messages[msgIndex].status = "failed";
        notify();
      }
      return;
    }

    // Update with real ID and status
    const msgIndex = t.messages.findIndex((m) => m.id === tempId);
    if (msgIndex >= 0) {
      t.messages[msgIndex].id = data.id;
      t.messages[msgIndex].status = "sent";
      notify();
    }
  } catch (error) {
    console.error("Error in sendMessage:", error);
  }
}

export function receiveMessage(
  fromUserId: string,
  text: string,
  messageId: string,
  timestamp: number,
) {
  const t = ensureThread(fromUserId);
  if (!t) return;

  // Check if message already exists
  if (t.messages.some((m) => m.id === messageId)) return;

  t.messages.push({
    id: messageId,
    from: "other",
    text: text,
    ts: timestamp,
  });
  notify();
}

// Mark messages as read when opening a conversation
export async function markMessagesAsRead(otherUserId: string) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: userInfo } = await supabase
      .from("user_info")
      .select("student_id")
      .eq("auth_uid", user.id)
      .single();

    if (!userInfo?.student_id) return;

    // Get conversation ID
    const [minId, maxId] = [userInfo.student_id, otherUserId].sort();
    const conversationId = `${minId}_${maxId}`;

    // Mark all unread messages from other user as read
    await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("sender_id", otherUserId)
      .eq("receiver_id", userInfo.student_id)
      .is("read_at", null);
  } catch (error) {
    console.error("Error marking messages as read:", error);
  }
}

// Setup real-time message subscription
export async function setupRealtimeSubscription() {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: userInfo } = await supabase
      .from("user_info")
      .select("student_id")
      .eq("auth_uid", user.id)
      .single();

    if (!userInfo?.student_id) return null;

    // Subscribe to new messages
    const channel = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${userInfo.student_id}`,
        },
        (payload) => {
          const msg = payload.new as {
            id: string;
            sender_id: string;
            receiver_id: string;
            message_text: string;
            created_at: string;
            read_at: string | null;
          };
          receiveMessage(
            msg.sender_id,
            msg.message_text,
            msg.id,
            new Date(msg.created_at).getTime(),
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `sender_id=eq.${userInfo.student_id}`,
        },
        (payload) => {
          const msg = payload.new as {
            id: string;
            sender_id: string;
            receiver_id: string;
            message_text: string;
            created_at: string;
            read_at: string | null;
          };
          // Update message status to seen
          if (msg.read_at) {
            const thread = state.threads.find(
              (t) => t.userId === msg.receiver_id,
            );
            if (thread) {
              const message = thread.messages.find((m) => m.id === msg.id);
              if (message && message.from === "me") {
                message.status = "seen";
                notify();
              }
            }
          }
        },
      )
      .subscribe();

    return channel;
  } catch (error) {
    console.error("Error setting up realtime subscription:", error);
    return null;
  }
}
