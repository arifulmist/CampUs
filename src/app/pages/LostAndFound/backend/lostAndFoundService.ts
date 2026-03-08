// src/app/pages/LostAndFound/backend/lostAndFoundService.ts
import { supabase } from "@/supabase/supabaseClient";

/**
 * Types used by the service
 */
export type AllPostsRow = {
  post_id: string;
  type: string;
  title: string;
  description: string;
  author_id: string | null; // auth_uid from user_info
  like_count: number | null;
  comment_count: number | null;
  created_at: string | null;
  updated_at: string | null;
};

export type LostAndFoundRow = {
  post_id: string;
  date_lost_or_found: string | null; // ISO date string (YYYY-MM-DD) or null
  time_lost_or_found: string | null; // time string "HH:MM" or null
  img_url: string | null;
  category?: string | null;
};

export type UserInfoRow = {
  auth_uid: string;
  name?: string | null;
  department?: string | null;
  level?: number | null;
  batch?: number | null;
  student_id?: string | null;
};

export type UserProfileRow = {
  auth_uid: string;
  profile_picture_url?: string | null;
};

export type LFPost = {
  id: string; // post_id
  category: string; // 'lost' | 'found'
  title: string;
  description: string;
  authorAuthUid?: string | null;
  authorName?: string;
  authorCourse?: string; // department-batch label
  authorAvatar?: string | null;
  likeCount: number;
  commentCount: number;
  createdAt?: string | null;
  updatedAt?: string | null;
  imgUrl?: string | null;
  dateLostOrFound?: string | null; // YYYY-MM-DD
  timeLostOrFound?: string | null; // HH:MM
};

/**
 * Fetch Lost & Found posts (joins all_posts + lost_and_found_posts + user_info + user_profile)
 * - limit: optional limit (default 50)
 * - order: 'newest' | 'oldest' (default newest)
 */
export async function fetchLostAndFoundPosts({
  limit = 50,
  offset = 0,
  order = "newest",
  category,
}: {
  limit?: number;
  offset?: number;
  order?: "newest" | "oldest";
  category?: "lost" | "found" | null;
} = {}): Promise<LFPost[]> {
  // Query all_posts for type = 'lostfound' and join lost_and_found_posts using two-step fetch
  try {
    const orderAsc = order === "oldest";

    // Prefer RPC (fewer round-trips). Keep fallback for environments where migrations aren't applied yet.
    if (!orderAsc) {
      const rpcRes = await supabase.rpc("get_lostfound_feed_page", {
        p_limit: limit,
        p_offset: offset,
        p_category: category ?? null,
      });

      if (!rpcRes.error && Array.isArray(rpcRes.data)) {
        const rows = rpcRes.data as any[];
        return rows.map((r) => {
          const dept = typeof r.author_department === "string" ? r.author_department : "";
          const batch = typeof r.author_batch === "string" ? r.author_batch : "";
          const course = dept && batch ? `${dept}-${batch}` : dept || undefined;

          return {
            id: String(r.post_id),
            category: typeof r.lf_category === "string" ? r.lf_category : "lost",
            title: String(r.title ?? ""),
            description: String(r.description ?? ""),
            authorAuthUid: typeof r.author_auth_uid === "string" ? r.author_auth_uid : undefined,
            authorName: typeof r.author_name === "string" ? r.author_name : "Unknown",
            authorCourse: course,
            authorAvatar: typeof r.author_avatar === "string" ? r.author_avatar : null,
            likeCount: Number(r.like_count ?? 0),
            commentCount: Number(r.comment_count ?? 0),
            createdAt: typeof r.created_at === "string" ? r.created_at : null,
            updatedAt: null,
            imgUrl: typeof r.img_url === "string" ? r.img_url : null,
            dateLostOrFound: r.date_lost_or_found ? String(r.date_lost_or_found) : null,
            timeLostOrFound: r.time_lost_or_found ? String(r.time_lost_or_found) : null,
          } satisfies LFPost;
        });
      }

      if (rpcRes.error) {
        console.warn(
          "fetchLostAndFoundPosts: get_lostfound_feed_page RPC unavailable; falling back to slower multi-query path",
          rpcRes.error
        );
      }
    }

    // Fast fallback (1 round-trip): use PostgREST embedded selects.
    // If relationships/columns aren't present (older schema), this will error and we fall back.
    try {
      let q = supabase
        .from("all_posts")
        .select(
          `post_id,title,description,author_id,like_count,comment_count,created_at,updated_at,
           lost_and_found_posts!inner(date_lost_or_found,time_lost_or_found,img_url,category),
           author:user_info!fk_author(auth_uid,name,batch,department,departments_lookup(department_name),user_profile(profile_picture_url))`
        )
        .eq("type", "lostfound")
        .order("created_at", { ascending: orderAsc })
        .range(offset, offset + Math.max(0, limit - 1));

      if (category) {
        // Will fail on older DBs where category column doesn't exist.
        q = q.eq("lost_and_found_posts.category", category);
      }

      const { data, error } = await q;
      if (!error && Array.isArray(data)) {
        const mapped: LFPost[] = (data as any[])
          .map((row) => {
            const lfRaw = row?.lost_and_found_posts;
            const lf = Array.isArray(lfRaw) ? lfRaw[0] : lfRaw;
            const author = row?.author;
            const deptName = author?.departments_lookup?.department_name ?? author?.department ?? "";
            const batch = author?.batch;
            const course = deptName && (typeof batch === "string" || typeof batch === "number") ? `${deptName}-${String(batch)}` : deptName || undefined;
            const avatar = author?.user_profile?.profile_picture_url ?? null;

            return {
              id: String(row.post_id),
              category: (typeof lf?.category === "string" ? lf.category : "lost").toLowerCase(),
              title: String(row.title ?? ""),
              description: String(row.description ?? ""),
              authorAuthUid: typeof row.author_id === "string" ? row.author_id : undefined,
              authorName: typeof author?.name === "string" ? author.name : "Unknown",
              authorCourse: course,
              authorAvatar: typeof avatar === "string" ? avatar : null,
              likeCount: Number(row.like_count ?? 0),
              commentCount: Number(row.comment_count ?? 0),
              createdAt: typeof row.created_at === "string" ? row.created_at : null,
              updatedAt: typeof row.updated_at === "string" ? row.updated_at : null,
              imgUrl: typeof lf?.img_url === "string" ? lf.img_url : null,
              dateLostOrFound: lf?.date_lost_or_found ? String(lf.date_lost_or_found) : null,
              timeLostOrFound: lf?.time_lost_or_found ? String(lf.time_lost_or_found) : null,
            } satisfies LFPost;
          })
          .filter((p) => Boolean(p?.id));

        // Keep behavior correct on older DBs
        return category ? mapped.filter((p) => p.category === category) : mapped;
      }
    } catch (e) {
      // ignore and continue with multi-query fallback
      console.warn("fetchLostAndFoundPosts: embedded-select fast fallback failed; using multi-query fallback", e);
    }

    const { data: rows, error } = await supabase
      .from("all_posts")
      .select(
        `post_id, title, description, author_id, like_count, comment_count, created_at, updated_at`
      )
      .eq("type", "lostfound")
      .order("created_at", { ascending: orderAsc })
      .range(offset, offset + Math.max(0, limit - 1));

    if (error) {
      console.error("fetchLostAndFoundPosts: all_posts fetch error", error);
      throw error;
    }
    const posts = (rows ?? []) as AllPostsRow[];
    if (!posts.length) return [];

    // Collect post_ids and author_ids
    const postIds = posts.map((p) => p.post_id);
    const authorIds = Array.from(new Set(posts.map((p) => p.author_id).filter(Boolean) as string[]));

    // Fetch lost_and_found_posts rows for these postIds
    // NOTE: tolerate older DBs where the new `category` column doesn't exist yet.
    let lfRows: unknown[] | null = null;
    let lfTry1Query = supabase
      .from("lost_and_found_posts")
      .select("post_id, date_lost_or_found, time_lost_or_found, img_url, category")
      .in("post_id", postIds);

    if (category) {
      // If the category column doesn't exist yet, this will error and we will fall back.
      lfTry1Query = lfTry1Query.eq("category", category);
    }

    const lfTry1 = await lfTry1Query;

    if (lfTry1.error) {
      console.warn("fetchLostAndFoundPosts: lost_and_found_posts lookup error", lfTry1.error);
      const lfTry2 = await supabase
        .from("lost_and_found_posts")
        .select("post_id, date_lost_or_found, time_lost_or_found, img_url")
        .in("post_id", postIds);
      if (lfTry2.error) {
        console.warn("fetchLostAndFoundPosts: lost_and_found_posts fallback also failed", lfTry2.error);
      } else {
        lfRows = (lfTry2.data as unknown as unknown[]) ?? [];
      }
    } else {
      lfRows = (lfTry1.data as unknown as unknown[]) ?? [];
    }

    const lfByPost = new Map<string, LostAndFoundRow>();
    for (const r of (lfRows ?? []) as LostAndFoundRow[]) {
      lfByPost.set(r.post_id, r);
    }

    // Fetch user_info and user_profile for all authors in bulk
    const [userInfoRes, userProfileRes] = await Promise.all([
      authorIds.length
        ? supabase
            .from("user_info")
            .select("auth_uid,name,department,departments_lookup(department_name),level,batch,student_id")
            .in("auth_uid", authorIds)
        : Promise.resolve({ data: [], error: null } as any),
      authorIds.length
        ? supabase
            .from("user_profile")
            .select("auth_uid, profile_picture_url")
            .in("auth_uid", authorIds)
        : Promise.resolve({ data: [], error: null } as any),
    ]);

    if (userInfoRes.error) {
      console.warn("fetchLostAndFoundPosts: user_info lookup error", userInfoRes.error);
    }
    if (userProfileRes.error) {
      console.warn("fetchLostAndFoundPosts: user_profile lookup error", userProfileRes.error);
    }
    const userInfoById = new Map<string, UserInfoRow>();
    for (const u of (userInfoRes.data ?? []) as any[]) {
      if (!u?.auth_uid) continue;
      const deptLookupName = u?.departments_lookup?.department_name ?? null;
      const dept = deptLookupName ?? (typeof u.department === "string" ? u.department : u.department);
      userInfoById.set(u.auth_uid, {
        auth_uid: u.auth_uid,
        name: u.name ?? null,
        department: dept ?? null,
        level: u.level ?? null,
        batch: u.batch ?? null,
        student_id: u.student_id ?? null,
      } as UserInfoRow);
    }

    const profileById = new Map<string, string>();
    for (const p of (userProfileRes.data ?? []) as any[]) {
      if (p?.auth_uid && typeof p.profile_picture_url === "string") {
        profileById.set(p.auth_uid, p.profile_picture_url);
      }
    }

    // Map rows to LFPost shape expected by UI
    const result: LFPost[] = posts.map((ap) => {
      const lf = lfByPost.get(ap.post_id) ?? null;
      const author = ap.author_id ? userInfoById.get(ap.author_id) ?? null : null;
      const avatar = ap.author_id ? profileById.get(ap.author_id) ?? null : null;
      const course =
        author?.department && (author.batch !== null && author.batch !== undefined)
          ? `${author.department}-${author.batch}`
          : author?.department ?? undefined;

      return {
        id: ap.post_id,
        category: (lf?.category ? String(lf.category) : "lost").toLowerCase(),
        title: ap.title,
        description: ap.description,
        authorAuthUid: ap.author_id ?? undefined,
        authorName: author?.name ?? "Unknown",
        authorCourse: course,
        authorAvatar: avatar ?? undefined,
        likeCount: typeof ap.like_count === "number" ? ap.like_count : 0,
        commentCount: typeof ap.comment_count === "number" ? ap.comment_count : 0,
        createdAt: ap.created_at ?? null,
        updatedAt: ap.updated_at ?? null,
        imgUrl: lf?.img_url ?? null,
        dateLostOrFound: lf?.date_lost_or_found ?? null,
        timeLostOrFound: lf?.time_lost_or_found ?? null,
      } as LFPost;
    });

    // If category column is missing in DB, we may not be able to filter in the SQL query.
    // Keep behavior correct by filtering the mapped results as a last step.
    return category ? result.filter((p) => p.category === category) : result;
  } catch (err) {
    console.error("fetchLostAndFoundPosts unexpected error", err);
    throw err;
  }
}

/**
 * Create a new Lost & Found post.
 * Steps:
 *  - insert into all_posts (type = 'lostfound')
 *  - insert into lost_and_found_posts with the same post_id
 *
 * Params:
 *  - authorAuthUid: string (auth_uid of current user) — REQUIRED if your RLS or DB requires it
 *  - title, description
 *  - dateLostOrFound (YYYY-MM-DD) optional
 *  - timeLostOrFound (HH:MM) optional
 *  - imgUrl optional (string). If you want to upload to Supabase Storage, upload separately and pass returned url.
 *
 * Returns the created LFPost (joined)
 */
export async function createLostAndFoundPost({
  authorAuthUid,
  category,
  title,
  description,
  dateLostOrFound,
  timeLostOrFound,
  imgUrl,
}: {
  authorAuthUid: string | null;
  category: "lost" | "found";
  title: string;
  description: string;
  dateLostOrFound?: string | null;
  timeLostOrFound?: string | null;
  imgUrl?: string | null;
}): Promise<LFPost> {
  try {
    // Insert into all_posts
    const { data: insertData, error: insertError } = await supabase
      .from("all_posts")
      .insert([
        {
          type: "lostfound",
          title,
          description,
          author_id: authorAuthUid ?? null,
          like_count: 0,
          comment_count: 0,
        },
      ])
      .select("post_id, title, description, author_id, like_count, comment_count, created_at, updated_at")
      .single();

    if (insertError) {
      console.error("createLostAndFoundPost: insert all_posts error", insertError);
      throw insertError;
    }

    const postId = (insertData as AllPostsRow).post_id;
    // Insert into lost_and_found_posts
    // NOTE: tolerate older DBs where the new `category` column doesn't exist yet.
    let lfError = (await supabase.from("lost_and_found_posts").insert([
      {
        post_id: postId,
        date_lost_or_found: dateLostOrFound ?? null,
        time_lost_or_found: timeLostOrFound ?? null,
        img_url: imgUrl ?? null,
        category: String(category).toLowerCase(),
      },
    ])).error;

    if (lfError) {
      const fallback = await supabase.from("lost_and_found_posts").insert([
        {
          post_id: postId,
          date_lost_or_found: dateLostOrFound ?? null,
          time_lost_or_found: timeLostOrFound ?? null,
          img_url: imgUrl ?? null,
        },
      ]);
      if (!fallback.error) {
        lfError = null;
      }
    }

    if (lfError) {
      // attempt to rollback all_posts insert (best-effort)
      console.error("createLostAndFoundPost: insert lost_and_found_posts error", lfError);
      try {
        await supabase.from("all_posts").delete().eq("post_id", postId);
      } catch (rollbackErr) {
        console.error("createLostAndFoundPost: rollback failed", rollbackErr);
      }
      throw lfError;
    }

    // Return the joined post (reuse fetch function to keep mapping consistent)
    const [created] = await fetchLostAndFoundPosts({ limit: 1, order: "newest" });
    // The above returns newest post; if multiple posts exist, ensure we return the inserted by id
    // Safer: fetch by post id explicitly
    const { data: fetchById, error: fetchErr } = await supabase
      .from("all_posts")
      .select("post_id, type, title, description, author_id, like_count, comment_count, created_at, updated_at")
      .eq("post_id", postId)
      .maybeSingle();

    if (fetchErr || !fetchById) {
      // Fallback to building from insertData + lf row
      // tolerate missing category column
      let lfRowRes = await supabase
        .from("lost_and_found_posts")
        .select("post_id, date_lost_or_found, time_lost_or_found, img_url, category")
        .eq("post_id", postId)
        .maybeSingle();
      if (lfRowRes.error) {
        lfRowRes = await supabase
          .from("lost_and_found_posts")
          .select("post_id, date_lost_or_found, time_lost_or_found, img_url")
          .eq("post_id", postId)
          .maybeSingle();
      }
      const lfRow = (lfRowRes.data ?? null) as LostAndFoundRow | null;

      const authorRow = authorAuthUid
        ? ((await supabase.from("user_info").select("auth_uid,name,department,level,batch").eq("auth_uid", authorAuthUid).maybeSingle()).data as any)
        : null;
      const profileRow = authorAuthUid
        ? ((await supabase.from("user_profile").select("auth_uid,profile_picture_url").eq("auth_uid", authorAuthUid).maybeSingle()).data as any)
        : null;

      const authorName = authorRow?.name ?? "Unknown";
      const dept = authorRow?.department ?? null;
      const batch = authorRow?.batch ?? null;
      const course = dept && batch ? `${dept}-${batch}` : dept ?? undefined;
      const avatar = profileRow?.profile_picture_url ?? undefined;

      return {
        id: postId,
        category: (lfRow?.category ? String(lfRow.category) : String(category)).toLowerCase(),
        title,
        description,
        authorAuthUid: authorAuthUid ?? undefined,
        authorName,
        authorCourse: course,
        authorAvatar: avatar,
        likeCount: 0,
        commentCount: 0,
        createdAt: (insertData as AllPostsRow).created_at ?? null,
        updatedAt: (insertData as AllPostsRow).updated_at ?? null,
        imgUrl: lfRow?.img_url ?? null,
        dateLostOrFound: lfRow?.date_lost_or_found ?? null,
        timeLostOrFound: lfRow?.time_lost_or_found ?? null,
      } as LFPost;
    }

    // fetch user info / profile
    const allPostRow = fetchById as AllPostsRow;
    // tolerate missing category column
    let lfRowRes2 = await supabase
      .from("lost_and_found_posts")
      .select("post_id, date_lost_or_found, time_lost_or_found, img_url, category")
      .eq("post_id", postId)
      .maybeSingle();
    if (lfRowRes2.error) {
      lfRowRes2 = await supabase
        .from("lost_and_found_posts")
        .select("post_id, date_lost_or_found, time_lost_or_found, img_url")
        .eq("post_id", postId)
        .maybeSingle();
    }
    const lfRow2 = (lfRowRes2.data ?? null) as LostAndFoundRow | null;

    const { data: userInfoData } = await supabase
      .from("user_info")
      .select("auth_uid,name,department,departments_lookup(department_name),batch")
      .eq("auth_uid", allPostRow.author_id)
      .maybeSingle();

    const { data: userProfileData } = await supabase
      .from("user_profile")
      .select("auth_uid,profile_picture_url")
      .eq("auth_uid", allPostRow.author_id)
      .maybeSingle();

    const authorName = userInfoData?.name ?? "Unknown";
    const deptName =
      userInfoData?.departments_lookup?.department_name ??
      (typeof userInfoData?.department === "string" ? userInfoData?.department : undefined);
    const batch = userInfoData?.batch ?? undefined;
    const course = deptName && batch ? `${deptName}-${batch}` : deptName ?? undefined;

    return {
      id: allPostRow.post_id,
      category: (lfRow2?.category ? String(lfRow2.category) : String(category)).toLowerCase(),
      title: allPostRow.title,
      description: allPostRow.description,
      authorAuthUid: allPostRow.author_id ?? undefined,
      authorName,
      authorCourse: course,
      authorAvatar: userProfileData?.profile_picture_url ?? undefined,
      likeCount: typeof allPostRow.like_count === "number" ? allPostRow.like_count : 0,
      commentCount: typeof allPostRow.comment_count === "number" ? allPostRow.comment_count : 0,
      createdAt: allPostRow.created_at ?? null,
      updatedAt: allPostRow.updated_at ?? null,
      imgUrl: lfRow2?.img_url ?? null,
      dateLostOrFound: lfRow2?.date_lost_or_found ?? null,
      timeLostOrFound: lfRow2?.time_lost_or_found ?? null,
    } as LFPost;
  } catch (err) {
    console.error("createLostAndFoundPost unexpected error", err);
    throw err;
  }
}

/**
 * Update Lost & Found post metadata.
 * - updates can include title, description, dateLostOrFound, timeLostOrFound, imgUrl
 */
export async function updateLostAndFoundPost({
  postId,
  updates,
}: {
  postId: string;
  updates: {
    category?: "lost" | "found";
    title?: string;
    description?: string;
    dateLostOrFound?: string | null;
    timeLostOrFound?: string | null;
    imgUrl?: string | null;
  };
}): Promise<LFPost> {
  try {
    const allUpdates: Partial<AllPostsRow> = {};
    if (typeof updates.title === "string") allUpdates.title = updates.title;
    if (typeof updates.description === "string") allUpdates.description = updates.description;

    if (Object.keys(allUpdates).length) {
      const { error: updErr } = await supabase.from("all_posts").update(allUpdates).eq("post_id", postId);
      if (updErr) throw updErr;
    }

    const lfUpdates: Partial<LostAndFoundRow> = {};
    if (typeof updates.category === "string") lfUpdates.category = updates.category.toLowerCase();
    // `date_lost_or_found` is NOT NULL in the DB schema. Only include it in the
    // upsert when the caller provides a non-empty string. This prevents
    // attempting to write NULL and violating the constraint.
    if (typeof updates.dateLostOrFound === "string" && updates.dateLostOrFound.trim() !== "") {
      lfUpdates.date_lost_or_found = updates.dateLostOrFound;
    }
    if ("timeLostOrFound" in updates) lfUpdates.time_lost_or_found = updates.timeLostOrFound ?? null;
    if ("imgUrl" in updates) lfUpdates.img_url = updates.imgUrl ?? null;

    if (Object.keys(lfUpdates).length) {
      // Ensure we don't attempt to insert a NULL `category` when the row is missing.
      // If caller didn't provide `category`, try to reuse existing category from DB
      // or default to 'lost'. If the DB doesn't have the column, the existing
      // fallback logic below will strip it and retry.
      if (!("category" in lfUpdates)) {
        try {
          const { data: existing, error: fetchErr } = await supabase
            .from("lost_and_found_posts")
            .select("category")
            .eq("post_id", postId)
            .maybeSingle();
          if (!fetchErr && existing && typeof (existing as any).category === "string") {
            lfUpdates.category = (existing as any).category;
          } else {
            lfUpdates.category = "lost";
          }
        } catch (e) {
          // If select fails (older DB without column) or is forbidden by RLS
          // (403), default to 'lost' so we don't upsert a NULL category.
          lfUpdates.category = "lost";
        }
      }

      // upsert into lost_and_found_posts (in case row missing)
      const { error: lfErr } = await supabase
        .from("lost_and_found_posts")
        .upsert([{ post_id: postId, ...lfUpdates }], { onConflict: "post_id" });
      if (lfErr) {
        // Only attempt a fallback that strips `category` when the error strongly
        // indicates the `category` column is missing from the DB (older schema).
        // If the upsert failed for another reason (RLS/403, NOT NULL violation,
        // etc.), rethrow the original error to avoid inserting NULL into the
        // NOT NULL `category` column.
        const errMsg = (lfErr && (lfErr as any).message) ? String((lfErr as any).message).toLowerCase() : "";
        const errCode = (lfErr && (lfErr as any).code) ? String((lfErr as any).code) : "";

        const looksLikeMissingColumn =
          errCode === "42703" || // undefined_column
          errMsg.includes("column \"category\"") ||
          errMsg.includes("does not exist") ||
          errMsg.includes("unrecognized column") ||
          errMsg.includes("missing column");

        if ("category" in lfUpdates && looksLikeMissingColumn) {
          const { category: _ignored, ...rest } = lfUpdates as any;
          const fallback = await supabase
            .from("lost_and_found_posts")
            .upsert([{ post_id: postId, ...rest }], { onConflict: "post_id" });
          if (fallback.error) throw fallback.error;
        } else {
          throw lfErr;
        }
      }
    }

    // return fresh post
    const posts = await fetchLostAndFoundPosts({ limit: 100, order: "newest" });
    const found = posts.find((p) => p.id === postId);
    if (!found) {
      // If not found in recent list, fetch directly
      const byId = await fetchLostAndFoundPostById(postId);
      if (!byId) throw new Error("Failed to fetch updated post");
      return byId;
    }
    return found;
  } catch (err) {
    console.error("updateLostAndFoundPost error", err);
    throw err;
  }
}

/**
 * Fetch a single lost & found post by id (joined)
 */
export async function fetchLostAndFoundPostById(postId: string): Promise<LFPost | null> {
  try {
    const { data: allRow, error: allErr } = await supabase
      .from("all_posts")
      .select("post_id, type, title, description, author_id, like_count, comment_count, created_at, updated_at")
      .eq("post_id", postId)
      .maybeSingle();

    if (allErr) {
      console.error("fetchLostAndFoundPostById all_posts error", allErr);
      throw allErr;
    }
    if (!allRow) return null;

    // tolerate missing category column
    let lfRow: any = null;
    const lfTry1 = await supabase
      .from("lost_and_found_posts")
      .select("post_id, date_lost_or_found, time_lost_or_found, img_url, category")
      .eq("post_id", postId)
      .maybeSingle();
    if (lfTry1.error) {
      console.warn("fetchLostAndFoundPostById lost_and_found_posts error", lfTry1.error);
      const lfTry2 = await supabase
        .from("lost_and_found_posts")
        .select("post_id, date_lost_or_found, time_lost_or_found, img_url")
        .eq("post_id", postId)
        .maybeSingle();
      if (lfTry2.error) {
        console.warn("fetchLostAndFoundPostById lost_and_found_posts fallback error", lfTry2.error);
      } else {
        lfRow = lfTry2.data ?? null;
      }
    } else {
      lfRow = lfTry1.data ?? null;
    }

    const { data: userInfoData } = await supabase
      .from("user_info")
      .select("auth_uid,name,department,departments_lookup(department_name),batch")
      .eq("auth_uid", allRow.author_id)
      .maybeSingle();

    const { data: userProfileData } = await supabase
      .from("user_profile")
      .select("auth_uid,profile_picture_url")
      .eq("auth_uid", allRow.author_id)
      .maybeSingle();

    const authorName = userInfoData?.name ?? "Unknown";
    const deptName =
      userInfoData?.departments_lookup?.department_name ??
      (typeof userInfoData?.department === "string" ? userInfoData?.department : undefined);
    const batch = userInfoData?.batch ?? undefined;
    const course = deptName && batch ? `${deptName}-${batch}` : deptName ?? undefined;

    return {
      id: allRow.post_id,
      category: (lfRow?.category ? String(lfRow.category) : "lost").toLowerCase(),
      title: allRow.title,
      description: allRow.description,
      authorAuthUid: allRow.author_id ?? undefined,
      authorName,
      authorCourse: course,
      authorAvatar: userProfileData?.profile_picture_url ?? undefined,
      likeCount: typeof allRow.like_count === "number" ? allRow.like_count : 0,
      commentCount: typeof allRow.comment_count === "number" ? allRow.comment_count : 0,
      createdAt: allRow.created_at ?? null,
      updatedAt: allRow.updated_at ?? null,
      imgUrl: lfRow?.img_url ?? null,
      dateLostOrFound: lfRow?.date_lost_or_found ?? null,
      timeLostOrFound: lfRow?.time_lost_or_found ?? null,
    } as LFPost;
  } catch (err) {
    console.error("fetchLostAndFoundPostById unexpected error", err);
    throw err;
  }
}

/**
 * Delete a Lost & Found post.
 * - deletes lost_and_found_posts row first
 * - then deletes all_posts row
 *
 * Return true if deleted, false otherwise.
 */
export async function deleteLostAndFoundPost(postId: string): Promise<boolean> {
  try {
    const { error: lfErr } = await supabase.from("lost_and_found_posts").delete().eq("post_id", postId);
    if (lfErr) {
      console.warn("deleteLostAndFoundPost: failed to delete lost_and_found_posts", lfErr);
      // continue to attempt deleting all_posts
    }

    const { error: allErr } = await supabase.from("all_posts").delete().eq("post_id", postId);
    if (allErr) {
      console.error("deleteLostAndFoundPost: failed to delete all_posts", allErr);
      throw allErr;
    }
    return true;
  } catch (err) {
    console.error("deleteLostAndFoundPost unexpected error", err);
    throw err;
  }
}

/**
 * Increment/decrement like_count on a post and return new like_count.
 * delta: +1 or -1
 */
export async function changePostLikeCount(postId: string, delta = 1): Promise<number> {
  try {
    const { data: fetch, error: fetchErr } = await supabase
      .from("all_posts")
      .select("like_count")
      .eq("post_id", postId)
      .single();

    if (fetchErr) {
      console.error("changePostLikeCount fetchErr", fetchErr);
      throw fetchErr;
    }
    const current = Number((fetch as any)?.like_count ?? 0);
    const next = Math.max(0, current + delta);

    const { error: updateErr } = await supabase.from("all_posts").update({ like_count: next }).eq("post_id", postId);
    if (updateErr) {
      console.error("changePostLikeCount updateErr", updateErr);
      throw updateErr;
    }
    return next;
  } catch (err) {
    console.error("changePostLikeCount unexpected error", err);
    throw err;
  }
}

/**
 * Increment comment_count on a post by delta (default +1). Useful when client adds/removes comments.
 * Returns new comment_count.
 */
export async function changePostCommentCount(postId: string, delta = 1): Promise<number> {
  try {
    const { data: fetch, error: fetchErr } = await supabase
      .from("all_posts")
      .select("comment_count")
      .eq("post_id", postId)
      .single();

    if (fetchErr) {
      console.error("changePostCommentCount fetchErr", fetchErr);
      throw fetchErr;
    }
    const current = Number((fetch as any)?.comment_count ?? 0);
    const next = Math.max(0, current + delta);

    const { error: updateErr } = await supabase.from("all_posts").update({ comment_count: next }).eq("post_id", postId);
    if (updateErr) {
      console.error("changePostCommentCount updateErr", updateErr);
      throw updateErr;
    }
    return next;
  } catch (err) {
    console.error("changePostCommentCount unexpected error", err);
    throw err;
  }
}

/**
 * Helper: get current signed-in user's auth UID (null if not signed in)
 */
export async function getCurrentUserAuthUid(): Promise<string | null> {
  try {
    // v2
    // @ts-ignore
    const authRes = await supabase.auth.getUser?.();
    const user = authRes?.data?.user ?? null;
    // fallback
    // @ts-ignore
    const userOld = supabase.auth.user?.();
    const uid = user?.id ?? userOld?.id ?? null;
    return uid ?? null;
  } catch (err) {
    console.warn("getCurrentUserAuthUid failed", err);
    return null;
  }
}
