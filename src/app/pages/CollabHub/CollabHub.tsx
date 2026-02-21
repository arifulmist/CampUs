import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { CategoryFilter } from "@/app/pages/CollabHub/components/CategoryFilter";
import type { Category } from "@/app/pages/CollabHub/components/Category";
import CreateCollabPost from "./components/CreateCollabPost";
import { addNotification } from "../../../mockData/notifications";
import { toast } from "react-hot-toast";
import { supabase } from "@/supabase/supabaseClient";
import { createCollabPost } from "./backend/collab";
import { CollabPostCard, type CollabPost } from "./components/CollabPostCard";

import postEmptyState from "@/assets/images/noPost.svg";
import { Loading } from "../Fallback/Loading";

export function CollabHub() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<CollabPost[]>([]);
  const [filter, setFilter] = useState<Category>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadTokenRef = useRef(0);
  const inFlightRef = useRef(false);

  const PAGE_SIZE = 20;

  const categories: Category[] = ["all", "research", "competition", "project"];

  const filteredPosts = useMemo(() => {
    if (filter === "all") return posts;
    return posts.filter((p) => p.category === filter);
  }, [filter, posts]);

  function mergeUniqueById(prev: CollabPost[], next: CollabPost[], reset: boolean): CollabPost[] {
    if (reset) {
      const seen = new Set<string>();
      const out: CollabPost[] = [];
      for (const p of next) {
        const key = String(p.id);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(p);
      }
      return out;
    }

    const seen = new Set(prev.map((p) => String(p.id)));
    const out = [...prev];
    for (const p of next) {
      const key = String(p.id);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(p);
    }
    return out;
  }

  type QueryRes<T> = { data: T | null; error: unknown | null };

  async function loadPosts({ reset }: { reset: boolean }) {
    // Prevent duplicate page loads from the intersection observer.
    // Allow a reset to start even if something else is in-flight; stale results are ignored via token.
    if (!reset) {
      if (inFlightRef.current) return;
      if (loadingMore || loading || !hasMore) return;
    }

    const token = ++loadTokenRef.current;

    inFlightRef.current = true;

    if (reset) {
      setLoading(true);
      setHasMore(true);
      setPage(0);
      setPosts([]);
    } else {
      setLoadingMore(true);
    }

    const offset = (reset ? 0 : page) * PAGE_SIZE;
    try {
      // Prefer RPC (fewer round-trips). Fallback to existing multi-query merge if not deployed.
      const rpcCategory = filter === "all" ? null : String(filter);
      const rpcRes = await supabase.rpc("get_collab_feed_page", {
        p_limit: PAGE_SIZE,
        p_offset: offset,
        p_category: rpcCategory,
      });

      if (!rpcRes.error && Array.isArray(rpcRes.data)) {
        const rows = rpcRes.data as unknown[];
        const allowedCategories: Category[] = ["research", "competition", "project"];
        const mapped = rows
          .map<CollabPost | null>((row) => {
            const r = (row ?? {}) as Record<string, unknown>;
            const dept = typeof r.author_department === "string" ? r.author_department : "";
            const batch = typeof r.author_batch === "string" ? r.author_batch : "";
            const authorBatch = dept && batch ? `${dept}-${batch}` : dept || "";

            const id = String(r.post_id ?? r.id ?? "").trim();
            if (!id) return null;

            const catRaw = typeof r.category === "string" ? r.category.trim().toLowerCase() : "";
            const category: Category = allowedCategories.includes(catRaw as Category)
              ? (catRaw as Category)
              : "research";

            const authorAuthUid =
              typeof r.author_auth_uid === "string"
                ? r.author_auth_uid
                : typeof r.author_id === "string"
                  ? r.author_id
                  : "";

            return {
              id,
              category,
              title: String(r.title ?? ""),
              content: String(r.description ?? r.content ?? ""),
              authorAuthUid,
              authorName:
                typeof r.author_name === "string"
                  ? r.author_name
                  : typeof r.name === "string"
                    ? r.name
                    : "Unknown",
              authorBatch,
              authorAvatarUrl:
                typeof r.author_avatar === "string"
                  ? r.author_avatar
                  : typeof r.author_avatar_url === "string"
                    ? r.author_avatar_url
                    : typeof r.avatar_url === "string"
                      ? r.avatar_url
                      : null,
              tags: Array.isArray(r.tags)
                ? (r.tags.filter((t: unknown) => typeof t === "string") as string[])
                : [],
              likes: Number(r.like_count ?? r.likes ?? 0),
              comments: Number(r.comment_count ?? r.comments ?? 0),
              createdAt: typeof r.created_at === "string" ? r.created_at : null,
            } satisfies CollabPost;
          })
          .filter((x): x is CollabPost => x !== null);

        // If RPC returns rows but we can't map any into UI posts, fall back to
        // the non-RPC path so the feed doesn't appear empty due to a schema mismatch.
        if (rows.length === 0 || mapped.length > 0) {
          if (loadTokenRef.current !== token) return;

          setPosts((prev) => mergeUniqueById(prev, mapped, reset));
          setHasMore(rows.length === PAGE_SIZE);
          setPage((p) => (reset ? 1 : p + 1));
          return;
        }

        console.warn(
          "get_collab_feed_page returned rows but none could be mapped; falling back to query loader"
        );
      }

      // Fallback path (kept for environments where RPC isn't applied yet)
      const { data: postRows, error: postsError } = await supabase
        .from("all_posts")
        .select("post_id,title,description,author_id,like_count,comment_count,created_at")
        .eq("type", "collab")
        .order("created_at", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (postsError) throw postsError;

      const postRowsArr = (postRows ?? []) as Array<Record<string, unknown>>;
      const postIds = postRowsArr
        .map((r) => r.post_id)
        .filter((x): x is string | number => typeof x === "string" || typeof x === "number");

      const authorIds = Array.from(
        new Set(
          postRowsArr
            .map((r) => r.author_id)
            .filter((x): x is string => typeof x === "string" && x.length > 0)
        )
      );

      const [
        metaRes,
        categoriesRes,
        postTagsRes,
        skillsRes,
        usersRes,
        profilesRes,
        departmentsRes,
      ] = await Promise.all([
        postIds.length
          ? (supabase
              .from("collab_posts")
              .select("post_id,category_id")
              .in("post_id", postIds) as unknown as Promise<QueryRes<Array<Record<string, unknown>>>>)
          : Promise.resolve({ data: [], error: null } satisfies QueryRes<Array<Record<string, unknown>>>),
        supabase.from("collab_category").select("category_id,category"),
        postIds.length
          ? (supabase
              .from("post_tags")
              .select("post_id,skill_id")
              .in("post_id", postIds) as unknown as Promise<QueryRes<Array<Record<string, unknown>>>>)
          : Promise.resolve({ data: [], error: null } satisfies QueryRes<Array<Record<string, unknown>>>),
        postIds.length
          ? (supabase
              .from("skills_lookup")
              .select("id,skill") as unknown as Promise<QueryRes<Array<Record<string, unknown>>>>)
          : Promise.resolve({ data: [], error: null } satisfies QueryRes<Array<Record<string, unknown>>>),
        authorIds.length
          ? supabase
              .from("user_info")
              .select("auth_uid,name,batch,department,departments_lookup(department_name)")
              .in("auth_uid", authorIds)
          : Promise.resolve({ data: [], error: null } satisfies QueryRes<Array<Record<string, unknown>>>),
        authorIds.length
          ? supabase
              .from("user_profile")
              .select("auth_uid,profile_picture_url")
              .in("auth_uid", authorIds)
          : Promise.resolve({ data: [], error: null } satisfies QueryRes<Array<Record<string, unknown>>>),
        supabase.from("departments_lookup").select("dept_id,department_name"),
      ]);

      if ((metaRes as QueryRes<Array<Record<string, unknown>>>).error) {
        throw (metaRes as QueryRes<Array<Record<string, unknown>>>).error;
      }

      if (categoriesRes.error) throw categoriesRes.error;

      if ((postTagsRes as QueryRes<Array<Record<string, unknown>>>).error) {
        // If post_tags is missing or inaccessible, warn and continue without tags.
        console.warn(
          "post_tags fetch failed; continuing without tags:",
          (postTagsRes as QueryRes<Array<Record<string, unknown>>>).error
        );
      }
      if ((skillsRes as QueryRes<Array<Record<string, unknown>>>).error) {
        console.warn(
          "skills_lookup fetch failed; continuing without mapping skill names:",
          (skillsRes as QueryRes<Array<Record<string, unknown>>>).error
        );
      }
      if (usersRes.error) throw usersRes.error;
      if (profilesRes.error) throw profilesRes.error;
      if (departmentsRes.error) throw departmentsRes.error;

      const categoryById = new Map<string, Category>();
      for (const row of (categoriesRes.data ?? []) as Array<Record<string, unknown>>) {
        const id = row.category_id;
        const cat = row.category;
        if ((typeof id === "number" || typeof id === "string") && typeof cat === "string") {
          categoryById.set(String(id), cat as Category);
        }
      }

      const tagsByPostId = new Map<string, string[]>();
      // Map skill id -> skill name
      const skillNameById = new Map<number | string, string>();
      for (const row of (skillsRes?.data ?? []) as Array<Record<string, unknown>>) {
        const id = row.id;
        const skill = row.skill;
        if ((typeof id === "number" || typeof id === "string") && typeof skill === "string") {
          skillNameById.set(id, skill);
        }
      }

      for (const row of (postTagsRes?.data ?? []) as Array<Record<string, unknown>>) {
        const postId = row.post_id;
        const skillId = row.skill_id;
        if (typeof postId === "string" || typeof postId === "number") {
          const key = String(postId);
          const arr = tagsByPostId.get(key) ?? [];
          const skillName = skillNameById.get(skillId as number | string);
          if (skillName) arr.push(skillName);
          tagsByPostId.set(key, arr);
        }
      }

      const deptNameById = new Map<string, string>();
      for (const row of (departmentsRes.data ?? []) as Array<Record<string, unknown>>) {
        const id = row.dept_id;
        const name = row.department_name;
        if (typeof id === "string" && typeof name === "string") {
          deptNameById.set(id, name);
        }
      }

      const profilePicByAuthUid = new Map<string, string>();
      for (const row of (profilesRes.data ?? []) as Array<Record<string, unknown>>) {
        const authUid = row.auth_uid;
        const url = row.profile_picture_url;
        if (typeof authUid === "string" && typeof url === "string" && url.trim()) {
          profilePicByAuthUid.set(authUid, url);
        }
      }

      const userByAuthUid = new Map<
        string,
        { name: string; batch: string; avatarUrl: string | null }
      >();
      for (const row of (usersRes.data ?? []) as Array<Record<string, unknown>>) {
        const authUid = row.auth_uid;
        const name = row.name;
        const batchVal = row.batch;
        const deptId = row.department;
        const deptLookup = row.departments_lookup as Record<string, unknown> | null | undefined;
        const deptName =
          (typeof deptLookup?.department_name === "string" && deptLookup.department_name) ||
          (typeof deptId === "string" ? deptNameById.get(deptId) ?? deptId : "");

        const batch = typeof batchVal === "number" ? String(batchVal) : (typeof batchVal === "string" ? batchVal : "");
        const label = deptName && batch ? `${deptName}-${batch}` : deptName || "";

        if (typeof authUid === "string" && typeof name === "string") {
          userByAuthUid.set(authUid, {
            name,
            batch: label,
            avatarUrl: profilePicByAuthUid.get(authUid) ?? null,
          });
        }
      }

      const metaByPostId = new Map<string, string>();
      for (const row of ((metaRes as QueryRes<Array<Record<string, unknown>>>).data ?? []) as Array<Record<string, unknown>>) {
        const postId = row.post_id;
        const categoryId = row.category_id;
        if ((typeof postId === "string" || typeof postId === "number") && (typeof categoryId === "number" || typeof categoryId === "string")) {
          metaByPostId.set(String(postId), String(categoryId));
        }
      }

      const merged: CollabPost[] = [];
      for (const row of postRowsArr) {
        const postId = row.post_id;
        const title = row.title;
        const description = row.description;
        const authorId = row.author_id;
        const postKey = (typeof postId === "string" || typeof postId === "number") ? String(postId) : "";
        const categoryId = postKey ? metaByPostId.get(postKey) : undefined;

        const allowedCategories: Category[] = ["research", "competition", "project"];
        const categoryRaw = typeof categoryId === "string" ? categoryById.get(categoryId) : undefined;
        const categoryNorm = typeof categoryRaw === "string" ? categoryRaw.trim().toLowerCase() : "";
        const category: Category = allowedCategories.includes(categoryNorm as Category)
          ? (categoryNorm as Category)
          : "research";

        if (
          (!postKey) ||
          typeof title !== "string" ||
          typeof description !== "string" ||
          typeof authorId !== "string"
        ) {
          continue;
        }

        const user = userByAuthUid.get(authorId);
        merged.push({
          id: postKey,
          category,
          title,
          content: description,
          authorAuthUid: authorId,
          authorName: user?.name ?? "Unknown",
          authorBatch: user?.batch ?? "",
          authorAvatarUrl: user?.avatarUrl ?? null,
          tags: tagsByPostId.get(postKey) ?? [],
          likes: typeof row.like_count === "number" ? row.like_count : 0,
          comments: typeof row.comment_count === "number" ? row.comment_count : 0,
          createdAt: (typeof row.created_at === "string" || row.created_at === null) ? (row.created_at as string | null) : null,
        });
      }

      const next = merged;
      const visible = filter === "all" ? next : next.filter((p) => p.category === filter);
      if (loadTokenRef.current !== token) return;
      setPosts((prev) => mergeUniqueById(prev, visible, reset));
      setHasMore(next.length === PAGE_SIZE);
      setPage((p) => (reset ? 1 : p + 1));
    } catch (e) {
      console.error(e);
      if (reset) setPosts([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);

      if (loadTokenRef.current === token) {
        inFlightRef.current = false;
      }
    }
  }

  useEffect(() => {
    void loadPosts({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    if (!hasMore) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;
        void loadPosts({ reset: false });
      },
      { root: null, rootMargin: "400px", threshold: 0 }
    );

    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loadingMore, loading, page]);

  return (
    <div className="lg:flex lg:gap-10 lg:h-full lg:w-full lg:p-10 bg-background-lm lg:animate-slide-in">
      {/* LEFT: Posts */}
      <div className="lg:flex-1">
        <div className="lg:flex lg:flex-col lg:gap-10 lg:h-full bg-primary-lm lg:p-10 lg:rounded-2xl border border-stroke-grey">
          {/* Announce collaboration */}
          <button
            onClick={() => setModalOpen(true)}
            className="lg:w-full lg:rounded-lg lg:border border-stroke-grey bg-secondary-lm lg:px-4 lg:py-3 text-left text-accent-lm hover:bg-hover-lm lg:transition"
          >
            Click to post a collaboration post here.
          </button>

          {/* Posts */}
          {loading ? (
            <Loading />
          ) : filteredPosts.length === 0 ? (
            <div className="lg:flex flex-col lg:items-center lg:justify-center lg:min-h-50 border-stroke-grey">
              <img src={postEmptyState} className="lg:size-50"></img>
              <p className="text-text-lighter-lm text-lg">
                No posts in this category
              </p>
            </div>
          ) : (
            filteredPosts.map((p) => {
              return (
                <CollabPostCard
                  key={p.id}
                  post={p}
                  onClick={() => navigate(`/collab/${p.id}`)}
                />
              );
            })
          )}

          {loadingMore ? (
            <div className="lg:flex lg:items-center lg:justify-center lg:py-4">
              <p className="text-text-lighter-lm">Loading more…</p>
            </div>
          ) : null}

          <div ref={sentinelRef} />
        </div>
      </div>

      <CategoryFilter
        categories={categories}
        selected={filter}
        onChange={setFilter}
      />

      <CreateCollabPost
        open={modalOpen}
        onOpenChange={setModalOpen}
        onCreate={async (payload) => {
          try {
            const { data } = await supabase.auth.getUser();
            const authUid = data.user?.id;
            if (!authUid) return;

            await createCollabPost({
              title: payload.title,
              description: payload.description,
              category: payload.category,
              tags: payload.tags,
              author_id: authUid,
            });

            // Reload feed so avatar/name reflect DB.
            // (We keep notifications behavior unchanged.)
            addNotification({
              type: "collab",
              title: `New Collab: ${payload.title}`,
              description: payload.description,
              path: "/collab",
            });

            // Inform user and refresh feed so new post appears immediately
            toast.success("Post created!");
            await loadPosts({ reset: true });
          } catch (e) {
            console.error(e);
          }
        }}
      />
    </div>
  );
}

export default CollabHub;
