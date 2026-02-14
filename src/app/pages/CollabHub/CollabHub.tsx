import { useState, useMemo, useEffect } from "react";
import { CategoryFilter } from "@/app/pages/CollabHub/components/CategoryFilter";
import type { Category } from "@/app/pages/CollabHub/components/Category";
import CreateCollabPost from "./components/CreateCollabPost";
import { addNotification } from "../../../mockData/notifications";
import { supabase } from "@/supabase/supabaseClient";
import { createCollabPost } from "./backend/collab";
import {
  addInterested,
  removeInterested,
  getInterested,
  subscribe as interestedSubscribe,
} from "@/app/pages/UserProfile/backend/interestedStore";

import { CollabPostCard, type CollabPost } from "./components/CollabPostCard";

import postEmptyState from "@/assets/images/noPost.svg";

export function CollabHub() {
  const [posts, setPosts] = useState<CollabPost[]>([]);
  const [filter, setFilter] = useState<Category>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [interestedIds, setInterestedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const categories: Category[] = ["all", "research", "competition", "project"];

  const filteredPosts = useMemo(() => {
    if (filter === "all") return posts;
    return posts.filter((p) => p.category === filter);
  }, [filter, posts]);

  useEffect(() => {
    // Initialize from store and subscribe for changes
    setInterestedIds(new Set(getInterested().map((i) => i.id)));
    const unsub = interestedSubscribe((items) =>
      setInterestedIds(new Set(items.map((i) => i.id)))
    );
    return unsub;
  }, []);

  async function loadPosts() {
    setLoading(true);
    try {
      const [{ data: postRows, error: postsError }, { data: metaRows, error: metaError }] =
        await Promise.all([
          supabase
            .from("all_posts")
            .select(
              "post_id,title,description,author_id,like_count,comment_count,created_at"
            )
            .eq("type", "collab")
            .order("created_at", { ascending: false }),
          supabase.from("collab_posts").select("post_id,category_id"),
        ]);

      if (postsError) throw postsError;
      if (metaError) throw metaError;

      // After fetching posts/meta, fetch related lookup tables. Use
      // `post_tags` + `skills_lookup` for tags (post_tags stores skill IDs).
      const postIds = (postRows ?? []).filter(Boolean).map((r: any) => r.post_id);

      const [
        categoriesRes,
        postTagsRes,
        skillsRes,
        usersRes,
        profilesRes,
        departmentsRes,
      ] = await Promise.all([
        supabase.from("collab_category").select("category_id,category"),
        postIds.length
          ? supabase.from("post_tags").select("post_id,skill_id").in("post_id", postIds)
          : Promise.resolve({ data: [], error: null } as unknown as { data: unknown[]; error: unknown }),
        postIds.length
          ? supabase.from("skills_lookup").select("id,skill")
          : Promise.resolve({ data: [], error: null } as unknown as { data: unknown[]; error: unknown }),
        supabase
          .from("user_info")
          .select(
            "auth_uid,name,batch,department,departments_lookup(department_name)"
          ),
        supabase.from("user_profile").select("auth_uid,profile_picture_url"),
        supabase.from("departments_lookup").select("dept_id,department_name"),
      ]);

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
          if (skillName) arr.push(`#${skillName}`);
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
      for (const row of (metaRows ?? []) as Array<Record<string, unknown>>) {
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
          tags: (tagsByPostId.get(postId) ?? []).map((t) => `#${t}`),
          likes: typeof row.like_count === "number" ? row.like_count : 0,
          comments: typeof row.comment_count === "number" ? row.comment_count : 0,
        });
      }

      setPosts(merged);
    } catch (e) {
      console.error(e);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPosts();
  }, []);

  const toggleInterested = (p: CollabPost) => {
    if (interestedIds.has(p.id)) {
      removeInterested(p.id);
    } else {
      addInterested({
        id: p.id,
        title: p.title,
        routeType: "collab",
        category: p.category,
        tags: (p.tags ?? []).map((t) => (t.startsWith("#") ? t.slice(1) : t)),
        userName: p.authorName,
        content: p.content,
        createdAt: Date.now(),
      });
    }
  };

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
              const isInterested = interestedIds.has(p.id);
              return (
                <CollabPostCard
                  key={p.id}
                  post={p}
                  isInterested={isInterested}
                  onToggleInterested={toggleInterested}
                />
              );
            })
          )}
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

            await createCollabPost({ ...payload, author_id: authUid });

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
