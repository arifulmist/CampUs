import { supabase } from "@/supabase/supabaseClient";

export type NotificationRow = {
  id: number | string;
  recipient_id: string;
  actor_id: string | null;
  type: string;
  post_id: string | number | null;
  comment_id: string | number | null;
  is_read: boolean;
  created_at: string;
};

export async function getNotifications(recipientId: string): Promise<NotificationRow[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("id,recipient_id,actor_id,type,post_id,comment_id,is_read,created_at")
    .eq("recipient_id", recipientId)
    .order("created_at", { ascending: false })
    .limit(80);

  if (error) throw error;

  const rows = (data ?? []) as unknown as Array<Record<string, unknown>>;
  const mapped: NotificationRow[] = [];

  for (const r of rows) {
    const idRaw = r.id;
    const id = typeof idRaw === "number" || typeof idRaw === "string" ? idRaw : null;
    const recipient_id = r.recipient_id;
    const actorRaw = r.actor_id;
    const actor_id = typeof actorRaw === "string" ? actorRaw : null;
    const type = r.type;
    const post_id = r.post_id;
    const comment_id = r.comment_id;
    const is_read = r.is_read;
    const created_at = r.created_at;

    if (!id || typeof recipient_id !== "string" || typeof type !== "string") {
      continue;
    }

    mapped.push({
      id,
      recipient_id,
      actor_id,
      type,
      post_id: typeof post_id === "string" || typeof post_id === "number" ? post_id : null,
      comment_id: typeof comment_id === "string" || typeof comment_id === "number" ? comment_id : null,
      is_read: Boolean(is_read),
      created_at: typeof created_at === "string" ? created_at : "",
    });
  }

  return mapped;
}

export async function markNotificationsAsRead(ids: Array<number | string>) {
  if (!ids.length) return;
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .in("id", ids as Array<string | number>);
  if (error) throw error;
}

export async function getUnreadNotificationsCount(recipientId: string): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", recipientId)
    .eq("is_read", false);

  if (error) throw error;
  return typeof count === "number" ? count : 0;
}

type EnsureRecommendationOptions = {
  lookbackDays?: number;
  maxRecentPosts?: number;
  maxCandidatePosts?: number;
  maxInsert?: number;
};

function toIdKey(v: unknown) {
  return typeof v === "string" || typeof v === "number" ? String(v) : "";
}

/**
 * Ensures the current user actually receives `post_recommendation` notifications.
 * This repo doesn't have a DB trigger generating them, so we seed them client-side.
 */
export async function ensurePostRecommendationNotifications(
  recipientId: string,
  opts: EnsureRecommendationOptions = {}
): Promise<number> {
  if (!recipientId) return 0;

  const lookbackDays = opts.lookbackDays ?? 120;
  const maxRecentPosts = opts.maxRecentPosts ?? 120;
  const maxCandidatePosts = opts.maxCandidatePosts ?? 50;
  const maxInsert = opts.maxInsert ?? 10;

  // 1) Load my skills/interests (these ids map to post_tags.skill_id)
  const [skillsRes, interestsRes] = await Promise.all([
    supabase.from("user_skills").select("skill_id").eq("auth_uid", recipientId),
    supabase.from("user_interests").select("interest_id").eq("auth_uid", recipientId),
  ]);

  if (skillsRes.error || interestsRes.error) {
    console.warn("ensurePostRecommendationNotifications: failed to load user skills/interests", {
      skillsError: skillsRes.error,
      interestsError: interestsRes.error,
    });
    return 0;
  }

  const mySkillIds = new Set<number>();
  for (const r of (skillsRes.data ?? []) as unknown as Array<Record<string, unknown>>) {
    const id = r.skill_id;
    if (typeof id === "number") mySkillIds.add(id);
  }
  for (const r of (interestsRes.data ?? []) as unknown as Array<Record<string, unknown>>) {
    const id = r.interest_id;
    if (typeof id === "number") mySkillIds.add(id);
  }

  const skillIdList = Array.from(mySkillIds);
  if (!skillIdList.length) return 0;

  // 2) Get recent posts, then filter their tags against my skills
  const cutoffIso = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();
  const recentPostsRes = await supabase
    .from("all_posts")
    .select("post_id,author_id,created_at")
    .gte("created_at", cutoffIso)
    .order("created_at", { ascending: false })
    .limit(maxRecentPosts);

  if (recentPostsRes.error) {
    console.warn("ensurePostRecommendationNotifications: failed to load recent posts", recentPostsRes.error);
    return 0;
  }

  const recentPosts = (recentPostsRes.data ?? []) as unknown as Array<Record<string, unknown>>;
  const recentPostIds: Array<string | number> = [];
  for (const p of recentPosts) {
    const postIdRaw = p.post_id;
    const authorId = p.author_id;
    if (typeof authorId === "string" && authorId && authorId === recipientId) continue;
    if (typeof postIdRaw === "string" && postIdRaw) recentPostIds.push(postIdRaw);
    if (typeof postIdRaw === "number") recentPostIds.push(postIdRaw);
  }

  if (!recentPostIds.length) return 0;

  // Keep the candidate set small to avoid huge `in()` queries.
  const candidatePostIds = recentPostIds.slice(0, maxCandidatePosts);

  const tagsRes = await supabase
    .from("post_tags")
    .select("post_id,skill_id")
    .in("post_id", candidatePostIds as unknown as never)
    .in("skill_id", skillIdList as unknown as never);

  if (tagsRes.error) {
    console.warn("ensurePostRecommendationNotifications: failed to load post tags", tagsRes.error);
    return 0;
  }

  const matchedPostKeys = new Set<string>();
  for (const t of (tagsRes.data ?? []) as unknown as Array<Record<string, unknown>>) {
    const key = toIdKey(t.post_id);
    const sid = t.skill_id;
    if (!key) continue;
    if (typeof sid !== "number") continue;
    matchedPostKeys.add(key);
  }

  const matchedPostsInOrder: Array<string | number> = [];
  for (const pid of candidatePostIds) {
    if (matchedPostKeys.has(String(pid))) matchedPostsInOrder.push(pid);
  }

  if (!matchedPostsInOrder.length) return 0;

  // 3) Dedupe against existing recommendation notifications
  const existingRes = await supabase
    .from("notifications")
    .select("post_id")
    .eq("recipient_id", recipientId)
    .eq("type", "post_recommendation")
    .in("post_id", matchedPostsInOrder as unknown as never);

  if (existingRes.error) {
    console.warn("ensurePostRecommendationNotifications: failed to check existing recommendation notifications", existingRes.error);
    return 0;
  }

  const existingKeys = new Set<string>();
  for (const r of (existingRes.data ?? []) as unknown as Array<Record<string, unknown>>) {
    const key = toIdKey(r.post_id);
    if (key) existingKeys.add(key);
  }

  const toInsert: Array<string | number> = [];
  for (const pid of matchedPostsInOrder) {
    const key = String(pid);
    if (existingKeys.has(key)) continue;
    toInsert.push(pid);
    if (toInsert.length >= maxInsert) break;
  }

  if (!toInsert.length) return 0;

  // actor_id is required in many schemas; use recipientId (system/self) for recommendations.
  const insertRes = await supabase.from("notifications").insert(
    toInsert.map((pid) => ({
      recipient_id: recipientId,
      actor_id: recipientId,
      type: "post_recommendation",
      post_id: pid,
      comment_id: null,
      is_read: false,
    }))
  );

  if (insertRes.error) {
    console.warn(
      "ensurePostRecommendationNotifications: insert blocked/failed (likely RLS).",
      insertRes.error
    );
    return 0;
  }
  return toInsert.length;
}

const postPathCache = new Map<string, string>();

function mapPostTypeToRouteBase(type: string): string {
  const t = String(type || "").trim().toLowerCase();
  if (t === "event" || t === "events") return "/events";
  if (t === "collab" || t === "collabhub") return "/collab";
  if (t === "qna") return "/qna";
  if (t === "lostfound" || t === "lost-and-found" || t === "lost_and_found") return "/lost-and-found";
  // Fallback: assume type matches route name
  return `/${t}`;
}

export async function getPostPathById(postId: string | number): Promise<string | null> {
  if (postId === null || postId === undefined || postId === "") return null;

  const cacheKey = String(postId);
  const cached = postPathCache.get(cacheKey);
  if (cached) return cached;

  async function tryFetch(id: string | number) {
    const { data, error } = await supabase
      .from("all_posts")
      .select("post_id,type")
      .eq("post_id", id as unknown as never)
      .maybeSingle();
    if (error) throw error;
    return data as unknown as { post_id?: unknown; type?: unknown } | null;
  }

  // PostgREST can return ids as numbers or strings depending on column type and value.
  // Try the original type first; if not found, try the opposite representation.
  let rec = await tryFetch(postId);
  if (!rec) {
    if (typeof postId === "string" && /^\d+$/.test(postId)) {
      const asNum = Number(postId);
      if (Number.isSafeInteger(asNum)) rec = await tryFetch(asNum);
    } else if (typeof postId === "number") {
      rec = await tryFetch(String(postId));
    }
  }

  const type = rec?.type;
  if (typeof type !== "string" || !type.trim()) return null;

  const base = mapPostTypeToRouteBase(type);
  const path = `${base}/${String(postId)}`;
  postPathCache.set(cacheKey, path);
  return path;
}

export function subscribeToNotifications(recipientId: string, onChange: () => void) {
  const channel = supabase
    .channel(`notifications-${recipientId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "notifications", filter: `recipient_id=eq.${recipientId}` },
      () => onChange()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
