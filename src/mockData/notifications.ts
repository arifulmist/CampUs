export type NotificationItem = {
  id: string;
  type: "event" | "qna" | "collab" | "lostfound";
  title: string;
  description?: string;
  path?: string;
  timestamp: number;
};

const STORAGE_KEY = "app.notifications.v1";

let items: NotificationItem[] = [];
let currentEvent: NotificationItem | null = null;
let lastSeenAt = 0;
const listeners = new Set<
  (payload: {
    items: NotificationItem[];
    currentEvent: NotificationItem | null;
  }) => void
>();

function emit() {
  const snapshot = {
    items: [...items].sort((a, b) => b.timestamp - a.timestamp),
    currentEvent,
  };
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ items, currentEvent, lastSeenAt })
    );
  } catch {}
  listeners.forEach((fn) => fn(snapshot));
}

(function hydrate() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as {
        items?: NotificationItem[];
        currentEvent?: NotificationItem | null;
        lastSeenAt?: number;
      };
      items = Array.isArray(parsed.items) ? parsed.items : [];
      currentEvent = parsed.currentEvent ?? null;
      lastSeenAt =
        typeof parsed.lastSeenAt === "number" ? parsed.lastSeenAt : 0;
    }
  } catch {}
})();

function genId(prefix = "ntf-") {
  return `${prefix}${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2)}`;
}

export function addNotification(
  partial: Omit<NotificationItem, "id" | "timestamp"> & { timestamp?: number }
) {
  const item: NotificationItem = {
    id: genId(),
    timestamp: partial.timestamp ?? Date.now(),
    ...partial,
  };
  items = [item, ...items].slice(0, 200);
  emit();
}

export function getNotifications(): NotificationItem[] {
  return [...items].sort((a, b) => b.timestamp - a.timestamp);
}

export function subscribe(
  fn: (payload: {
    items: NotificationItem[];
    currentEvent: NotificationItem | null;
  }) => void
) {
  listeners.add(fn);
  fn({ items: getNotifications(), currentEvent });
  return () => {
    listeners.delete(fn);
  };
}

export function setCurrentEvent(event: {
  title: string;
  description?: string;
  path?: string;
  timestamp?: number;
}) {
  currentEvent = {
    id: genId("evt-"),
    type: "event",
    title: event.title,
    description: event.description,
    path: event.path,
    timestamp: event.timestamp ?? Date.now(),
  };
  emit();
}

export function clearCurrentEvent() {
  currentEvent = null;
  emit();
}

export function markAllRead() {
  lastSeenAt = Date.now();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const base = raw ? JSON.parse(raw) : {};
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...base, items, currentEvent, lastSeenAt })
    );
  } catch {}
  // emit so subscribers can update badges
  emit();
}

export function getUnreadCount(): number {
  const itemsUnread = items.filter((i) => i.timestamp > lastSeenAt).length;
  const eventUnread =
    currentEvent && currentEvent.timestamp > lastSeenAt ? 1 : 0;
  return itemsUnread + eventUnread;
}
