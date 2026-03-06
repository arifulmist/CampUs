export type InterestedItem = {
  id: string;
  title: string;
  /** Route base (e.g. 'event', 'collab', 'qna', 'lostfound'). Falls back to category for legacy items. */
  routeType?: string;
  category: string;
  tags?: string[];
  userName?: string;
  content?: string;
  createdAt: number;
};

import { supabase } from "@/supabase/supabaseClient";

const STORAGE_KEY = "campus_interested_posts";
const EVENT_NAME = "campus:interested_changed";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function load(): InterestedItem[] {
  return safeParse<InterestedItem[]>(localStorage.getItem(STORAGE_KEY), []);
}

function save(items: InterestedItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  // Notify listeners within the app
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export function getInterested(): InterestedItem[] {
  return load();
}

export function addInterested(item: InterestedItem): void {
  const items = load();
  // De-duplicate by id
  const exists = items.some((i) => i.id === item.id);
  if (exists) return;
  items.push(item);
  save(items);

  // Best-effort DB sync (does not block UI)
  void (async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("user_interested_posts").insert({
        post_id: item.id,
        user_id: user.id,
      });
    } catch (e) {
      console.error(e);
    }
  })();
}

export function removeInterested(id: string): void {
  const items = load().filter((i) => i.id !== id);
  save(items);

  // Best-effort DB sync (does not block UI)
  void (async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("user_interested_posts").delete().eq("post_id", id).eq("user_id", user.id);
    } catch (e) {
      console.error(e);
    }
  })();
}

export function clearInterested(): void {
  save([]);
}

export function subscribe(
  callback: (items: InterestedItem[]) => void
): () => void {
  const handler = () => callback(load());
  window.addEventListener(EVENT_NAME, handler);
  const storageHandler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) handler();
  };
  window.addEventListener("storage", storageHandler);

  callback(load());

  return () => {
    window.removeEventListener(EVENT_NAME, handler);
    window.removeEventListener("storage", storageHandler);
  };
}
