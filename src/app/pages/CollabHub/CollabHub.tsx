import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { CategoryFilter } from "@/app/pages/CollabHub/components/CategoryFilter";
import type { Category } from "@/app/pages/CollabHub/components/Category";
import CreateCollabPost from "./components/CreateCollabPost";
import { addNotification } from "../../../mockData/notifications";
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
  const [initialLoad, setInitialLoad] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const PAGE_SIZE = 20;

  const categories: Category[] = ["all", "research", "competition", "project"];

  const filteredPosts = useMemo(() => {
    if (filter === "all") return posts;
    return posts.filter((p) => p.category === filter);
  }, [filter, posts]);

  async function loadPosts({ reset }: { reset: boolean }) {
    if (reset) {
      setLoading(true);
      setInitialLoad(true);
      setHasMore(true);
      setPage(0);
      setPosts([]);
    } else {
      if (loadingMore || loading || !hasMore) return;
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
        const rows = rpcRes.data as any[];
        const mapped: CollabPost[] = rows.map((r) => {
          const dept = typeof r.author_department === "string" ? r.author_department : "";
          const batch = typeof r.author_batch === "string" ? r.author_batch : "";
          const authorBatch = dept && batch ? `${dept}-${batch}` : dept || "";

          return {
            id: String(r.post_id),
            category: (String(r.category) as Category) ?? "research",
            title: String(r.title ?? ""),
            content: String(r.description ?? ""),
            authorAuthUid: typeof r.author_auth_uid === "string" ? r.author_auth_uid : undefined,
            authorName: typeof r.author_name === "string" ? r.author_name : "Unknown",
            authorBatch,
            authorAvatarUrl: typeof r.author_avatar === "string" ? r.author_avatar : null,
            tags: Array.isArray(r.tags) ? (r.tags.filter((t: any) => typeof t === "string") as string[]) : [],
            likes: Number(r.like_count ?? 0),
            comments: Number(r.comment_count ?? 0),
            createdAt: typeof r.created_at === "string" ? r.created_at : null,
          } satisfies CollabPost;
        });

        setPosts((prev) => (reset ? mapped : [...prev, ...mapped]));
        setHasMore(mapped.length === PAGE_SIZE);
        setPage((p) => (reset ? 1 : p + 1));
        return;
      }

      // Fallback path (kept for environments where RPC isn't applied yet)
      const { data: postRows, error: postsError } = await supabase
        .from("all_posts")
        .select("post_id,title,description,author_id,like_count,comment_count,created_at")
        .eq("type", "collab")
        .order("created_at", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (postsError) throw postsError;

      const postIds = (postRows ?? []).filter(Boolean).map((r: any) => r.post_id);
      const authorIds = Array.from(
        new Set((postRows ?? []).map((r: any) => r?.author_id).filter((x: any) => typeof x === "string"))
      ) as string[];

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
          ? supabase.from("collab_posts").select("post_id,category_id").in("post_id", postIds)
          : Promise.resolve({ data: [], error: null } as any),
        supabase.from("collab_category").select("category_id,category"),
        postIds.length
          ? supabase.from("post_tags").select("post_id,skill_id").in("post_id", postIds)
          : Promise.resolve({ data: [], error: null } as unknown as { data: unknown[]; error: unknown }),
        postIds.length
          ? supabase.from("skills_lookup").select("id,skill")
          : Promise.resolve({ data: [], error: null } as unknown as { data: unknown[]; error: unknown }),
        authorIds.length
          ? supabase
              .from("user_info")
              .select("auth_uid,name,batch,department,departments_lookup(department_name)")
              .in("auth_uid", authorIds)
          : Promise.resolve({ data: [], error: null } as any),
        authorIds.length
          ? supabase.from("user_profile").select("auth_uid,profile_picture_url").in("auth_uid", authorIds)
          : Promise.resolve({ data: [], error: null } as any),
        supabase.from("departments_lookup").select("dept_id,department_name"),
      ]);

      if ((metaRes as any).error) throw (metaRes as any).error;

      if (categoriesRes.error) throw categoriesRes.error;

      if (postTagsRes && (postTagsRes as any).error) {
        // If post_tags is missing or inaccessible, warn and continue without tags.
        // eslint-disable-next-line no-console
        console.warn("post_tags fetch failed; continuing without tags:", (postTagsRes as any).error);
      }
      if (skillsRes && (skillsRes as any).error) {
        // eslint-disable-next-line no-console
        console.warn("skills_lookup fetch failed; continuing without mapping skill names:", (skillsRes as any).error);
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
        if (typeof postId === "string") {
          const arr = tagsByPostId.get(postId) ?? [];
          const skillName = skillNameById.get(skillId as number | string);
          if (skillName) arr.push(skillName);
          tagsByPostId.set(postId, arr);
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
      for (const row of ((metaRes as any).data ?? []) as Array<Record<string, unknown>>) {
        const postId = row.post_id;
        const categoryId = row.category_id;
        if (typeof postId === "string" && (typeof categoryId === "number" || typeof categoryId === "string")) {
          metaByPostId.set(postId, String(categoryId));
        }
      }

      const merged: CollabPost[] = [];
      for (const row of (postRows ?? []) as Array<Record<string, unknown>>) {
        const postId = row.post_id;
        const title = row.title;
        const description = row.description;
        const authorId = row.author_id;
        const categoryId = typeof postId === "string" ? metaByPostId.get(postId) : undefined;
        const category = typeof categoryId === "string" ? categoryById.get(categoryId) : undefined;

        if (
          typeof postId !== "string" ||
          typeof title !== "string" ||
          typeof description !== "string" ||
          typeof authorId !== "string" ||
          !category
        ) {
          continue;
        }

        const user = userByAuthUid.get(authorId);
        merged.push({
          id: postId,
          category,
          title,
          content: description,
          authorAuthUid: authorId,
          authorName: user?.name ?? "Unknown",
          authorBatch: user?.batch ?? "",
          authorAvatarUrl: user?.avatarUrl ?? null,
          tags: tagsByPostId.get(postId) ?? [],
          likes: typeof row.like_count === "number" ? row.like_count : 0,
          comments: typeof row.comment_count === "number" ? row.comment_count : 0,
          createdAt: (typeof row.created_at === "string" || row.created_at === null) ? (row.created_at as string | null) : null,
        });
      }

      const next = merged;
      const visible = filter === "all" ? next : next.filter((p) => p.category === filter);
      setPosts((prev) => (reset ? visible : [...prev, ...visible]));
      setHasMore(next.length === PAGE_SIZE);
      setPage((p) => (reset ? 1 : p + 1));
    } catch (e) {
      console.error(e);
      if (reset) setPosts([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setInitialLoad(false);
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

  if (initialLoad && loading) {
    return <Loading />;
  }

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
            <div className="lg:flex lg:items-center lg:justify-center lg:min-h-50 border-stroke-grey">
              <p className="text-text-lighter-lm text-lg">Loading…</p>
            </div>
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

            await loadPosts();
          } catch (e) {
            console.error(e);
          }
        }}
      />
    </div>
  );
}

export default CollabHub;
