// Simple in-memory chat store to manage threads and active chat
// NOTE: Replace with real backend/state later.

export type ChatMessage = {
  id: string;
  from: "me" | "other";
  text: string;
  ts: number;
  status?: "pending" | "sent" | "delivered" | "failed";
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

const STORAGE_KEY = "app.chat.v1";
const state: { threads: ChatThread[]; activeUserId: string | null } = {
  threads: [],
  activeUserId: null,
};

// hydrate from localStorage
(function hydrate() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as {
        threads?: ChatThread[];
        activeUserId?: string | null;
      };
      state.threads = Array.isArray(parsed.threads) ? parsed.threads : [];
      state.activeUserId = parsed.activeUserId ?? null;
    }
  } catch {}
})();

const listeners: Listener[] = [];

function notify() {
  const snapshot = {
    threads: [...state.threads],
    activeUserId: state.activeUserId,
  };
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        threads: state.threads,
        activeUserId: state.activeUserId,
      })
    );
  } catch {}
  listeners.forEach((l) => l(snapshot));
}

export function subscribe(listener: Listener) {
  listeners.push(listener);
  // immediate publish
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
  }
  return t;
}

export function openChatWith(userId: string, userName?: string) {
  const t = ensureThread(userId, userName);
  if (!t) return;
  state.activeUserId = t.userId;
  notify();
}

export function sendMessage(text: string) {
  const msg = text.trim();
  if (!msg || !state.activeUserId) return;
  const t = state.threads.find((th) => th.userId === state.activeUserId);
  if (!t) return;
  t.messages.push({
    id: Math.random().toString(36).slice(2),
    from: "me",
    text: msg,
    ts: Date.now(),
    status: "pending",
  });
  notify();
}

export function receiveMessage(fromUserId: string, text: string) {
  const t = ensureThread(fromUserId);
  if (!t) return;
  t.messages.push({
    id: Math.random().toString(36).slice(2),
    from: "other",
    text: text,
    ts: Date.now(),
  });
  notify();
}

// ---- Conversation helpers (min/max id pair) ----
export type ConversationMessage = {
  conversationId: string;
  senderId: string;
  text: string;
  timestamp: number;
};

const convMessages: ConversationMessage[] = [];

export function getConversationId(a: string, b: string) {
  const [minId, maxId] = [a, b].sort();
  return `${minId}_${maxId}`;
}

export function addConversationMessage(
  conversationId: string,
  senderId: string,
  text: string
) {
  convMessages.push({ conversationId, senderId, text, timestamp: Date.now() });
}

export function getConversationMessages(conversationId: string) {
  return convMessages.filter((m) => m.conversationId === conversationId);
}
