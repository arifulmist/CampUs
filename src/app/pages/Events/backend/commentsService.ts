// src/app/pages/Events/backend/commentsService.ts
<<<<<<< HEAD
import { supabase } from "../../../../../supabase/supabaseClient";
=======
import { supabase } from "@/supabase/supabaseClient";
>>>>>>> 0a22283fc6ebfeb0990af6b7a9f55c3864438512

/**
 * DB row shape returned for comment rows (adjust if you changed column names).
 */
export type CommentRow = {
  comment_id: string;
  post_id: string;
  author_id: string | null;
<<<<<<< HEAD
  comment_creation_date: string | null;
=======
  comment_creation_timestamp: string;
>>>>>>> 0a22283fc6ebfeb0990af6b7a9f55c3864438512
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

<<<<<<< HEAD
=======
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

type DepartmentRow = {
  dept_id: string;
  department_name: string;
};

>>>>>>> 0a22283fc6ebfeb0990af6b7a9f55c3864438512
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
<<<<<<< HEAD
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
=======
      comment_creation_timestamp,
      content,
      like_count,
      parent_comment_id
    `
    )
    .eq("post_id", postId)
    // Keep DB order stable (oldest -> newest). Parent sorting is done in UI,
    // and replies keep their natural order.
    .order("comment_creation_timestamp", { ascending: true });
>>>>>>> 0a22283fc6ebfeb0990af6b7a9f55c3864438512

  if (error) {
    console.error("fetchCommentsByPost error", error);
    throw error;
  }
<<<<<<< HEAD
  return (data as CommentRow[]) || [];
=======

  const rows = ((data as unknown as CommentRow[]) || []).map((r) => ({ ...r, user_info: null }));
  const authorIds = Array.from(
    new Set(rows.map((r) => r.author_id).filter((x): x is string => typeof x === "string" && x))
  );

  if (!authorIds.length) return rows;

  const [{ data: users, error: usersError }, { data: departments, error: deptError }] =
    await Promise.all([
      supabase
    .from("user_info")
    .select(
        "auth_uid,name,department,departments_lookup(department_name),level,batch,student_id,email,mobile,created_at"
    )
        .in("auth_uid", authorIds),
      supabase.from("departments_lookup").select("dept_id,department_name"),
    ]);

  if (usersError) {
    console.warn("fetchCommentsByPost user_info lookup error", usersError);
    return rows;
  }

  if (deptError) {
    console.warn("fetchCommentsByPost departments lookup error", deptError);
  }

  const deptById = new Map<string, string>();
  for (const d of ((departments ?? []) as unknown as DepartmentRow[])) {
    if (typeof d.dept_id === "string" && typeof d.department_name === "string") {
      deptById.set(d.dept_id, d.department_name);
    }
  }

  const byId = new Map<string, UserInfoLookupRow>();
  for (const u of (users ?? []) as unknown as UserInfoLookupRow[]) {
    if (typeof u.auth_uid !== "string") continue;
    const deptName =
      u.departments_lookup?.department_name ??
      (u.department ? deptById.get(u.department) ?? null : null);
    const normalized: UserInfoLookupRow = {
      ...u,
      department: (deptName ?? u.department) ?? null,
    };
    byId.set(u.auth_uid, normalized);
  }

  return rows.map((r) => ({
    ...r,
    user_info: r.author_id ? (byId.get(r.author_id) ?? null) : null,
  }));
>>>>>>> 0a22283fc6ebfeb0990af6b7a9f55c3864438512
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
<<<<<<< HEAD
    const level = r.user_info?.level ?? null;
    const batch = r.user_info?.batch ?? null;
    const courseLabel = `${dept}${level ? ` • L${level}` : ""}${batch ? ` • B${batch}` : ""}`.trim() || null;
    const likes = Number(r.like_count ?? 0);
    const timestamp = r.comment_creation_date ?? null;
=======
    const batch = r.user_info?.batch ?? null;
    const courseLabel = `${dept}${batch !== null && batch !== undefined ? `-${batch}` : ""}`.trim() || null;
    const likes = Number(r.like_count ?? 0);
    const timestamp = typeof r.comment_creation_timestamp === "string" && r.comment_creation_timestamp
      ? new Date(r.comment_creation_timestamp).toISOString()
      : null;
>>>>>>> 0a22283fc6ebfeb0990af6b7a9f55c3864438512

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

<<<<<<< HEAD
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
=======
>>>>>>> 0a22283fc6ebfeb0990af6b7a9f55c3864438512
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
<<<<<<< HEAD
        comment_creation_date: new Date().toISOString(),
=======
>>>>>>> 0a22283fc6ebfeb0990af6b7a9f55c3864438512
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

<<<<<<< HEAD
  // Re-fetch joined row with user_info
=======
  // Re-fetch row
>>>>>>> 0a22283fc6ebfeb0990af6b7a9f55c3864438512
  const { data, error } = await supabase
    .from("comments")
    .select(
      `
      comment_id,
      post_id,
      author_id,
<<<<<<< HEAD
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
=======
      comment_creation_timestamp,
      content,
      like_count,
      parent_comment_id
>>>>>>> 0a22283fc6ebfeb0990af6b7a9f55c3864438512
    `
    )
    .eq("comment_id", inserted.comment_id)
    .single();

  if (error) {
    console.error("addComment fetch after insert error", error);
    throw error;
  }

<<<<<<< HEAD
  const row = data as CommentRow;
  const dept = row.user_info?.department ?? "";
  const level = row.user_info?.level ?? null;
  const batch = row.user_info?.batch ?? null;
  const courseLabel = `${dept}${level ? ` • L${level}` : ""}${batch ? ` • B${batch}` : ""}`.trim() || null;

  const node: CommentNode = {
    id: row.comment_id,
    author: row.user_info?.name ?? "Unknown",
=======
  const row = data as unknown as CommentRow;

  let userInfo: UserInfoLookupRow | null = null;
  if (row.author_id) {
    const { data: u, error: uErr } = await supabase
      .from("user_info")
      .select(
        "auth_uid,name,department,departments_lookup(department_name),level,batch,student_id,email,mobile,created_at"
      )
      .eq("auth_uid", row.author_id)
      .maybeSingle();
    if (!uErr) {
      const urow = (u as unknown as UserInfoLookupRow | null) ?? null;
      if (urow) {
        let deptName = urow.departments_lookup?.department_name ?? null;

        if (!deptName && urow.department) {
          const { data: departments } = await supabase
            .from("departments_lookup")
            .select("dept_id,department_name")
            .eq("dept_id", urow.department)
            .maybeSingle();
          const drow = (departments as unknown as DepartmentRow | null) ?? null;
          if (drow?.department_name) deptName = drow.department_name;
        }

        userInfo = {
          ...urow,
          department: (deptName ?? urow.department) ?? null,
        };
      }
    }
  }

  const dept = userInfo?.department ?? "";
  const batch = userInfo?.batch ?? null;
  const courseLabel = `${dept}${batch !== null && batch !== undefined ? `-${batch}` : ""}`.trim() || null;

  const node: CommentNode = {
    id: row.comment_id,
    author: userInfo?.name ?? "Unknown",
>>>>>>> 0a22283fc6ebfeb0990af6b7a9f55c3864438512
    avatar: null,
    course: courseLabel,
    content: row.content,
    likes: Number(row.like_count ?? 0),
    parentId: row.parent_comment_id ?? null,
<<<<<<< HEAD
    timestamp: row.comment_creation_date ?? null,
    raw: row,
=======
    timestamp:
      typeof row.comment_creation_timestamp === "string" && row.comment_creation_timestamp
        ? new Date(row.comment_creation_timestamp).toISOString()
        : null,
    raw: { ...row, user_info: userInfo },
>>>>>>> 0a22283fc6ebfeb0990af6b7a9f55c3864438512
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
