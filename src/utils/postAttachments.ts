import { supabase } from "@/supabase/supabaseClient";

export const MAX_POST_ATTACHMENTS = 5;

function uniq<T>(items: T[]): T[] {
  const out: T[] = [];
  const seen = new Set<T>();
  for (const item of items) {
    if (seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
}

export function normalizeAttachmentUrls(urls: Array<string | null | undefined>): string[] {
  return uniq(
    (urls ?? [])
      .filter((u): u is string => typeof u === "string")
      .map((u) => u.trim())
      .filter((u) => u.length > 0)
  ).slice(0, MAX_POST_ATTACHMENTS);
}

type AttachmentRow = {
  post_id: string;
  position: number;
  img_url: string;
};

export async function fetchAttachmentUrlsByPostIds(postIds: string[]): Promise<Map<string, string[]>> {
  const ids = uniq((postIds ?? []).filter((id) => typeof id === "string" && id.trim().length > 0));
  const map = new Map<string, string[]>();
  if (ids.length === 0) return map;

  try {
    const { data, error } = await supabase
      .from("post_attachments")
      .select("post_id,position,img_url")
      .in("post_id", ids)
      .order("position", { ascending: true });

    if (error) throw error;

    for (const row of (data ?? []) as unknown as AttachmentRow[]) {
      if (!row?.post_id || typeof row.img_url !== "string") continue;
      const url = row.img_url.trim();
      if (!url) continue;
      const existing = map.get(row.post_id);
      if (existing) existing.push(url);
      else map.set(row.post_id, [url]);
    }

    // enforce max + dedupe
    for (const [postId, urls] of map) {
      map.set(postId, normalizeAttachmentUrls(urls));
    }

    return map;
  } catch (e) {
    // Table might not exist yet (older schema) or RLS might block.
    console.warn("fetchAttachmentUrlsByPostIds: unable to read post_attachments; falling back to per-post img_url", e);
    return new Map();
  }
}

export async function fetchAttachmentUrlsByPostId(postId: string): Promise<string[]> {
  const map = await fetchAttachmentUrlsByPostIds([postId]);
  return map.get(postId) ?? [];
}

export async function tryReplacePostAttachments(postId: string, urls: Array<string | null | undefined>): Promise<boolean> {
  const nextUrls = normalizeAttachmentUrls(urls);

  try {
    // Remove existing
    const delRes = await supabase.from("post_attachments").delete().eq("post_id", postId);
    if (delRes.error) throw delRes.error;

    if (nextUrls.length === 0) return true;

    const insertRows = nextUrls.map((img_url, position) => ({ post_id: postId, position, img_url }));
    const insRes = await supabase.from("post_attachments").insert(insertRows);
    if (insRes.error) throw insRes.error;

    return true;
  } catch (e) {
    console.warn("tryReplacePostAttachments: unable to write post_attachments; kept legacy img_url only", e);
    return false;
  }
}
