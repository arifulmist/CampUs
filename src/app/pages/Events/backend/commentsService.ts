// src/app/pages/Events/backend/commentsService.ts
import { supabase } from "../../../../../supabase/supabaseClient";

/**
 * DB row shape returned for comment rows (adjust if you changed column names).
 */
export type CommentRow = {
  comment_id: string;
  post_id: string;
  author_id: string | null;
  comment_creation_date: string | null;
  content: string;
  like_count: number | null;
  parent_comment_id: string | null;
  user_info?: {
    auth_uid?: string | null;
    name?: string | null;
    department?: string | null;
    level?: number | null;
    batch?: number | null;
    student_id?: string | null;
    email?: string | null;
    mobile?: string | null;
    created_at?: string | null;
  } | null;
};

export type CommentNode = {
  id: string;
  author: string;
  avatar: string | null; // no avatar in your schema, kept for compatibility
  course: string | null; // using department/level/batch combined
  content: string;
  likes: number;
  parentId?: string | null;
  timestamp: string | null;
  raw?: CommentRow;
  replies?: CommentNode[];
};

/**
 * Fetch comments for a given post, joined with user_info (based on your schema).
 * The `user_info(...)` selection must match the actual foreign key relationship name in Supabase.
 */
export async function fetchCommentsByPost(postId: string): Promise<CommentRow[]> {
  const { data, error } = await supabase
    .from("comments")
    .select(
      `
      comment_id,
      post_id,
      author_id,
      comment_creation_date,
      content,
      like_count,
      parent_comment_id,
      user_info(
        auth_uid,
        name,
        department,
        level,
        batch,
        student_id,
        email,
        mobile,
        created_at
      )
    `
    )
    .eq("post_id", postId)
    .order("comment_creation_date", { ascending: false });

  if (error) {
    console.error("fetchCommentsByPost error", error);
    throw error;
  }
  return (data as CommentRow[]) || [];
}

/**
 * Build tree from flat comment rows. Roots have parent_comment_id === null.
 */
export function buildCommentsTree(rows: CommentRow[]): CommentNode[] {
  const map = new Map<string, CommentNode>();

  // create nodes
  for (const r of rows) {
    const id = r.comment_id;
    const author = r.user_info?.name ?? "Unknown";
    const avatar = null; // your schema doesn't have avatar; keep null or default on client
    const dept = r.user_info?.department ?? "";
    const level = r.user_info?.level ?? null;
    const batch = r.user_info?.batch ?? null;
    const courseLabel = `${dept}${level ? ` • L${level}` : ""}${batch ? ` • B${batch}` : ""}`.trim() || null;
    const likes = Number(r.like_count ?? 0);
    const timestamp = r.comment_creation_date ?? null;

    map.set(id, {
      id,
      author,
      avatar,
      course: courseLabel,
      content: r.content,
      likes,
      parentId: r.parent_comment_id ?? null,
      timestamp,
      raw: r,
      replies: [],
    });
  }

  // link children
  const roots: CommentNode[] = [];
  for (const node of map.values()) {
    const parentId = node.parentId;
    if (parentId && map.has(parentId)) {
      map.get(parentId)!.replies!.push(node);
    } else {
      roots.push(node);
    }
  }

  // sort by timestamp descending
  const sortDesc = (a?: CommentNode, b?: CommentNode) => {
    const ta = a?.timestamp ? new Date(a.timestamp).getTime() : 0;
    const tb = b?.timestamp ? new Date(b.timestamp).getTime() : 0;
    return tb - ta;
  };
  const sortTree = (list: CommentNode[]) => {
    list.sort(sortDesc);
    for (const n of list) if (n.replies && n.replies.length) sortTree(n.replies);
  };
  sortTree(roots);
  return roots;
}

/**
 * Insert a comment (top-level if parentCommentId == null, else a reply).
 * authorId should be the user's auth UID (auth_uid in user_info).
 * Returns the inserted comment row (joined with user_info).
 */
export async function addComment({
  postId,
  authorId,
  content,
  parentCommentId = null,
}: {
  postId: string;
  authorId: string; // auth_uid
  content: string;
  parentCommentId?: string | null;
}): Promise<CommentNode> {
  // Insert
  const { data: insertData, error: insertError } = await supabase
    .from("comments")
    .insert([
      {
        post_id: postId,
        author_id: authorId || null,
        content,
        comment_creation_date: new Date().toISOString(),
        like_count: 0,
        parent_comment_id: parentCommentId,
      },
    ])
    .select()
    .single();

  if (insertError) {
    console.error("addComment insert error", insertError);
    throw insertError;
  }
  const inserted = insertData as any;

  // Re-fetch joined row with user_info
  const { data, error } = await supabase
    .from("comments")
    .select(
      `
      comment_id,
      post_id,
      author_id,
      comment_creation_date,
      content,
      like_count,
      parent_comment_id,
      user_info(
        auth_uid,
        name,
        department,
        level,
        batch,
        student_id,
        email,
        mobile,
        created_at
      )
    `
    )
    .eq("comment_id", inserted.comment_id)
    .single();

  if (error) {
    console.error("addComment fetch after insert error", error);
    throw error;
  }

  const row = data as CommentRow;
  const dept = row.user_info?.department ?? "";
  const level = row.user_info?.level ?? null;
  const batch = row.user_info?.batch ?? null;
  const courseLabel = `${dept}${level ? ` • L${level}` : ""}${batch ? ` • B${batch}` : ""}`.trim() || null;

  const node: CommentNode = {
    id: row.comment_id,
    author: row.user_info?.name ?? "Unknown",
    avatar: null,
    course: courseLabel,
    content: row.content,
    likes: Number(row.like_count ?? 0),
    parentId: row.parent_comment_id ?? null,
    timestamp: row.comment_creation_date ?? null,
    raw: row,
    replies: [],
  };
  return node;
}

/**
 * Increment/decrement like_count for a comment.
 * delta: +1 to increment, -1 to decrement
 * Returns the new like_count (number).
 */
export async function changeCommentLikeCount(commentId: string, delta = 1): Promise<number> {
  // fetch current
  const { data: fetch, error: fetchErr } = await supabase
    .from("comments")
    .select("like_count")
    .eq("comment_id", commentId)
    .single();

  if (fetchErr) {
    console.error("changeCommentLikeCount fetch err", fetchErr);
    throw fetchErr;
  }
  const current = Number(fetch?.like_count ?? 0);
  const next = Math.max(0, current + delta);

  const { error: updateErr } = await supabase
    .from("comments")
    .update({ like_count: next })
    .eq("comment_id", commentId);

  if (updateErr) {
    console.error("changeCommentLikeCount updateErr", updateErr);
    throw updateErr;
  }
  return next;
}

/**
 * Return current signed-in user's profile from user_info using auth UID.
 * If no signed-in user or no profile row, returns null.
 */
export async function getCurrentUserProfile(): Promise<{
  auth_uid: string;
  name?: string | null;
  department?: string | null;
  level?: number | null;
  batch?: number | null;
  student_id?: string | null;
} | null> {
  try {
    // supabase v2
    // @ts-ignore
    const authRes = await supabase.auth.getUser?.();
    const user = authRes?.data?.user ?? null;
    // fallback to older auth api
    // @ts-ignore
    const userOld = supabase.auth.user?.();

    const uid = user?.id ?? userOld?.id ?? null;
    if (!uid) return null;

    const { data: profile, error } = await supabase
      .from("user_info")
      .select("auth_uid, name, department, level, batch, student_id")
      .eq("auth_uid", uid)
      .single();

    if (error) {
      console.warn("getCurrentUserProfile: user_info row not found", error);
      return { auth_uid: uid, name: null, department: null, level: null, batch: null, student_id: null };
    }
    return {
      auth_uid: profile.auth_uid,
      name: profile.name,
      department: profile.department,
      level: profile.level,
      batch: profile.batch,
      student_id: profile.student_id,
    };
  } catch (err) {
    console.warn("getCurrentUserProfile failed", err);
    return null;
  }
}
