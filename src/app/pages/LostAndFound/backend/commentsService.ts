// src/app/pages/LostAndFound/backend/commentsService.ts
import { supabase } from "@/supabase/supabaseClient";

export type CommentRow = {
  comment_id: string;
  post_id: string;
  author_id: string | null;
  comment_creation_timestamp: string | null;
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

type UserInfoLookupRow = {
  auth_uid: string;
  name: string | null;
  department: string | null;
  departments_lookup?: {
    department_name: string | null;
  } | null;
  level: number | null;
  batch: number | null;
  student_id: string | null;
  email: string | null;
  mobile: string | null;
  created_at: string | null;
};

export type CommentNode = {
  id: string;
  author: string;
  avatar: string | null;
  course: string | null;
  content: string;
  likes: number;
  parentId?: string | null;
  timestamp: string | null;
  raw?: CommentRow;
  replies?: CommentNode[];
};

export type CommentSort = "best" | "latest" | "oldest";

/**
 * Fetch comments for a given post (flat rows), joined with user_info for author display.
 * Sorts according to `sort`.
 */
export async function fetchCommentsByPost(
  postId: string,
  sort: CommentSort = "latest",
): Promise<CommentRow[]> {
  let query = supabase
    .from("comments")
    .select(
      `
      comment_id,
      post_id,
      author_id,
      comment_creation_timestamp,
      content,
      like_count,
      parent_comment_id
    `,
    )
    .eq("post_id", postId);

  if (sort === "best") {
    query = query
      .order("like_count", { ascending: false, nullsFirst: false })
      .order("comment_creation_timestamp", { ascending: false });
  } else if (sort === "latest") {
    query = query.order("comment_creation_timestamp", { ascending: false });
  } else {
    query = query.order("comment_creation_timestamp", { ascending: true });
  }

  const { data, error } = await query;
  if (error) {
    console.error("fetchCommentsByPost error", error);
    throw error;
  }

  const rows = ((data as unknown as CommentRow[]) || []).map((r) => ({
    ...r,
    user_info: null,
  }));
  const authorIds = Array.from(
    new Set(
      rows
        .map((r) => r.author_id)
        .filter((x): x is string => typeof x === "string" && x !== ""),
    ),
  );

  if (!authorIds.length) return rows;

  const { data: users, error: usersError } = await supabase
    .from("user_info")
    .select(
      "auth_uid,name,department,departments_lookup(department_name),level,batch,student_id,email,mobile,created_at",
    )
    .in("auth_uid", authorIds);

  if (usersError) {
    console.warn("fetchCommentsByPost user_info lookup error", usersError);
    return rows;
  }

  const byId = new Map<string, UserInfoLookupRow>();
  for (const u of (users ?? []) as unknown as UserInfoLookupRow[]) {
    if (typeof u.auth_uid !== "string") continue;
    const deptName =
      u.departments_lookup?.department_name ?? u.department ?? null;
    byId.set(u.auth_uid, { ...u, department: deptName });
  }

  return rows.map((r) => ({
    ...r,
    user_info: r.author_id ? (byId.get(r.author_id) ?? null) : null,
  }));
}

/**
 * Build nested tree from flat rows. Roots have parent_comment_id === null
 */
export function buildCommentsTree(rows: CommentRow[]): CommentNode[] {
  const map = new Map<string, CommentNode>();

  for (const r of rows) {
    const id = r.comment_id;
    const author = r.user_info?.name ?? "Unknown";
    const avatar = null;
    const dept = r.user_info?.department ?? "";
    const batch = r.user_info?.batch ?? null;
    const courseLabel =
      `${dept}${batch !== null && batch !== undefined ? `-${batch}` : ""}`.trim() ||
      null;
    const likes = Number(r.like_count ?? 0);
    const timestamp =
      typeof r.comment_creation_timestamp === "string" &&
      r.comment_creation_timestamp
        ? new Date(r.comment_creation_timestamp).toISOString()
        : null;

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

  const roots: CommentNode[] = [];
  for (const node of map.values()) {
    const parentId = node.parentId;
    if (parentId && map.has(parentId)) {
      map.get(parentId)!.replies!.push(node);
    } else {
      roots.push(node);
    }
  }

  // preserve DB ordering of roots (rows were ordered by SQL)
  return roots;
}

/**
 * Add comment (top-level if parentCommentId === null).
 * authorId should be auth_uid (string) or null.
 */
export async function addComment({
  postId,
  authorId,
  content,
  parentCommentId = null,
}: {
  postId: string;
  authorId: string | null;
  content: string;
  parentCommentId?: string | null;
}): Promise<CommentNode> {
  const { data: insertData, error: insertError } = await supabase
    .from("comments")
    .insert([
      {
        post_id: postId,
        author_id: authorId ?? null,
        content,
        comment_creation_timestamp: new Date().toISOString(),
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

  const inserted = insertData as CommentRow;

  // fetch author info if present
  let userInfo: UserInfoLookupRow | null = null;
  if (inserted.author_id) {
    const { data: u } = await supabase
      .from("user_info")
      .select(
        "auth_uid,name,department,departments_lookup(department_name),level,batch,student_id,email,mobile,created_at",
      )
      .eq("auth_uid", inserted.author_id)
      .maybeSingle();
    if (u) {
      userInfo = {
        ...(u as any),
        department:
          (u as any)?.departments_lookup?.department_name ??
          (u as any)?.department ??
          null,
      };
    }
  }

  const courseLabel =
    userInfo?.department &&
    userInfo?.batch !== null &&
    userInfo?.batch !== undefined
      ? `${userInfo.department}-${userInfo.batch}`
      : (userInfo?.department ?? "");

  const node: CommentNode = {
    id: inserted.comment_id,
    author: userInfo?.name ?? "Unknown",
    avatar: null,
    course: courseLabel ?? "",
    content: inserted.content,
    likes: Number(inserted.like_count ?? 0),
    parentId: inserted.parent_comment_id ?? null,
    timestamp: inserted.comment_creation_timestamp ?? null,
    raw: { ...inserted, user_info: userInfo },
    replies: [],
  };
  return node;
}

/**
 * Update like_count on a comment and return new count.
 */
export async function changeCommentLikeCount(
  commentId: string,
  delta = 1,
): Promise<number> {
  const { data: fetch, error: fetchErr } = await supabase
    .from("comments")
    .select("like_count")
    .eq("comment_id", commentId)
    .single();

  if (fetchErr) {
    console.error("changeCommentLikeCount fetch err", fetchErr);
    throw fetchErr;
  }

  const current = Number((fetch as any)?.like_count ?? 0);
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
 * Get current signed-in user's profile row from user_info (auth_uid).
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
    // fallback
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
      // no profile row found
      return {
        auth_uid: uid,
        name: null,
        department: null,
        level: null,
        batch: null,
        student_id: null,
      };
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
