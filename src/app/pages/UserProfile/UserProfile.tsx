import { useState, useEffect } from "react";

import { UpcomingEvents } from "@/components/UpcomingEvents";

import InterestedPosts from "./components/InterestedPosts";
import type { InterestedItem } from "./backend/interestedStore";
import { supabase } from "@/supabase/supabaseClient";

import { UserProfileProvider } from "./components/UserProfileProvider";
import { ProfileSection } from "./components/ProfileSection";
import { SkillsSection } from "./components/SkillsSection";
import { InterestsSection } from "./components/InterestsSection";
import { UserPostsSection } from "./components/UserPostsSection";
import { useUserProfileContext } from "./components/UserProfileContext";
import { Loading } from "../Fallback/Loading";

function UserProfileMainColumn() {
  const { viewedAuthUid, canEdit } = useUserProfileContext();
  const key = viewedAuthUid ?? "none";

  return (
    <div className={`flex flex-col lg:gap-5 ${canEdit ? "lg:w-[70vw]" : "lg:w-full"}`}>
      <ProfileSection key={`profile-${key}`} />
      <SkillsSection key={`skills-${key}`} />
      <InterestsSection key={`interests-${key}`} />
      <UserPostsSection key={`posts-${key}`} />
    </div>
  );
}

function UserProfileSidebar({ interestedPosts }: { interestedPosts: InterestedItem[] }) {
  const { canEdit } = useUserProfileContext();

  return (
    <div className="flex flex-col lg:gap-5 lg:w-[20vw] lg:sticky lg:top-40 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
      {canEdit ? <UpcomingEvents /> : null}
      {canEdit ? <InterestedPosts items={interestedPosts} /> : null}
    </div>
  );
}

export function UserProfile() {
  const [interestedPosts, setInterestedPosts] = useState<InterestedItem[]>([]);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!alive) return;
        if (!user) {
          setInterestedPosts([]);
          return;
        }

        const { data, error } = await supabase
          .from("user_interested_posts")
          .select(
            "post_id, all_posts:all_posts!user_interested_posts_post_id_fkey(post_id,type,title,created_at,author_id)"
          )
          .eq("user_id", user.id);

        if (!alive) return;
        if (error) throw error;

        const rows = (data ?? []) as unknown as Array<Record<string, unknown>>;

        const base = rows
          .map((r) => {
            const postId = r.post_id;
            const postObj = r.all_posts as Record<string, unknown> | null | undefined;
            const typeRaw = postObj?.type;
            const title = postObj?.title;
            const createdAtRaw = postObj?.created_at;
            const authorId = postObj?.author_id;

            if (typeof postId !== "string" || typeof typeRaw !== "string" || typeof title !== "string") {
              return null;
            }

            const t = typeRaw.trim().toLowerCase();
            const routeType =
              t === "events" || t === "event"
                ? "event"
                : t === "lost-and-found" || t === "lostfound" || t === "lost_and_found"
                  ? "lostfound"
                  : t === "collabhub" || t === "collab"
                    ? "collab"
                    : t;

            const createdAt = typeof createdAtRaw === "string" ? Date.parse(createdAtRaw) : Date.now();

            return {
              id: postId,
              routeType,
              title,
              createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
              authorId: typeof authorId === "string" ? authorId : null,
            };
          })
          .filter(Boolean) as Array<{
          id: string;
          routeType: string;
          title: string;
          createdAt: number;
          authorId: string | null;
        }>;

        const postIds = base.map((b) => b.id);
        const authorIds = Array.from(new Set(base.map((b) => b.authorId).filter((x): x is string => !!x)));
        const eventIds = base.filter((b) => b.routeType === "event").map((b) => b.id);
        const collabIds = base.filter((b) => b.routeType === "collab").map((b) => b.id);

        const [authorsRes, eventMetaRes, eventTagsRes, skillsRes, collabMetaRes, collabCatsRes, collabTagsRes] =
          await Promise.all([
            authorIds.length
              ? supabase.from("user_info").select("auth_uid,name").in("auth_uid", authorIds)
              : Promise.resolve({ data: [], error: null } as unknown as { data: unknown[]; error: unknown }),
            eventIds.length
              ? supabase
                  .from("event_posts")
                  .select("post_id,category_id,events_category(category_name)")
                  .in("post_id", eventIds)
              : Promise.resolve({ data: [], error: null } as unknown as { data: unknown[]; error: unknown }),
            eventIds.length
              ? supabase.from("post_tags").select("post_id,skill_id").in("post_id", eventIds)
              : Promise.resolve({ data: [], error: null } as unknown as { data: unknown[]; error: unknown }),
            eventIds.length || collabIds.length
              ? supabase.from("skills_lookup").select("id,skill")
              : Promise.resolve({ data: [], error: null } as unknown as { data: unknown[]; error: unknown }),
            collabIds.length
              ? supabase.from("collab_posts").select("post_id,category_id").in("post_id", collabIds)
              : Promise.resolve({ data: [], error: null } as unknown as { data: unknown[]; error: unknown }),
            collabIds.length
              ? supabase.from("collab_category").select("category_id,category")
              : Promise.resolve({ data: [], error: null } as unknown as { data: unknown[]; error: unknown }),
            collabIds.length
              ? supabase.from("post_tags").select("post_id,skill_id").in("post_id", collabIds)
              : Promise.resolve({ data: [], error: null } as unknown as { data: unknown[]; error: unknown }),
          ]);

        if ((authorsRes as any).error) throw (authorsRes as any).error;
        if ((eventMetaRes as any).error) throw (eventMetaRes as any).error;
        if ((eventTagsRes as any).error) throw (eventTagsRes as any).error;
        if ((skillsRes as any).error) throw (skillsRes as any).error;
        if ((collabMetaRes as any).error) throw (collabMetaRes as any).error;
        if ((collabCatsRes as any).error) throw (collabCatsRes as any).error;
        if ((collabTagsRes as any).error) throw (collabTagsRes as any).error;

        const authorNameById = new Map<string, string>();
        for (const row of ((authorsRes as any).data ?? []) as Array<Record<string, unknown>>) {
          const id = row.auth_uid;
          const name = row.name;
          if (typeof id === "string" && typeof name === "string" && name.trim()) {
            authorNameById.set(id, name);
          }
        }

        const eventCategoryByPostId = new Map<string, string>();
        for (const row of ((eventMetaRes as any).data ?? []) as Array<Record<string, unknown>>) {
          const postId = row.post_id;
          const eventsCategory = row.events_category as Record<string, unknown> | null | undefined;
          const catName = eventsCategory?.category_name;
          if (typeof postId === "string" && typeof catName === "string" && catName.trim()) {
            eventCategoryByPostId.set(postId, catName);
          }
        }

        const skillById = new Map<number, string>();
        for (const row of ((skillsRes as any).data ?? []) as Array<Record<string, unknown>>) {
          const id = row.id;
          const skill = row.skill;
          if (typeof id === "number" && typeof skill === "string" && skill.trim()) {
            skillById.set(id, skill);
          }
        }

        const eventTagsByPostId = new Map<string, string[]>();
        for (const row of ((eventTagsRes as any).data ?? []) as Array<Record<string, unknown>>) {
          const postId = row.post_id;
          const skillId = row.skill_id;
          if (typeof postId !== "string" || typeof skillId !== "number") continue;
          const skill = skillById.get(skillId);
          if (!skill) continue;
          const arr = eventTagsByPostId.get(postId) ?? [];
          arr.push(skill);
          eventTagsByPostId.set(postId, arr);
        }

        const collabCategoryById = new Map<string, string>();
        for (const row of ((collabCatsRes as any).data ?? []) as Array<Record<string, unknown>>) {
          const id = row.category_id;
          const name = row.category;
          if ((typeof id === "number" || typeof id === "string") && typeof name === "string" && name.trim()) {
            collabCategoryById.set(String(id), name);
          }
        }

        const collabCategoryByPostId = new Map<string, string>();
        for (const row of ((collabMetaRes as any).data ?? []) as Array<Record<string, unknown>>) {
          const postId = row.post_id;
          const categoryId = row.category_id;
          if (typeof postId !== "string" || (typeof categoryId !== "number" && typeof categoryId !== "string")) continue;
          const name = collabCategoryById.get(String(categoryId));
          if (name) collabCategoryByPostId.set(postId, name);
        }

        const collabTagsByPostId = new Map<string, string[]>();
        for (const row of ((collabTagsRes as any).data ?? []) as Array<Record<string, unknown>>) {
          const postId = row.post_id;
          const skillId = row.skill_id;
          if (typeof postId !== "string" || typeof skillId !== "number") continue;
          const skill = skillById.get(skillId);
          if (!skill) continue;
          const arr = collabTagsByPostId.get(postId) ?? [];
          arr.push(skill);
          collabTagsByPostId.set(postId, arr);
        }

        const mapped: InterestedItem[] = base
          .map((b) => {
            const userName = b.authorId ? authorNameById.get(b.authorId) : undefined;
            const tags =
              b.routeType === "event"
                ? eventTagsByPostId.get(b.id) ?? []
                : b.routeType === "collab"
                  ? collabTagsByPostId.get(b.id) ?? []
                  : [];

            const categoryLabel =
              b.routeType === "event"
                ? eventCategoryByPostId.get(b.id) ?? "Events"
                : b.routeType === "collab"
                  ? collabCategoryByPostId.get(b.id) ?? "Collab"
                  : b.routeType === "qna"
                    ? "QnA"
                    : b.routeType === "lostfound"
                      ? "Lost & Found"
                      : b.routeType;

            return {
              id: b.id,
              title: b.title,
              routeType: b.routeType,
              category: categoryLabel,
              userName,
              tags,
              createdAt: b.createdAt,
            } satisfies InterestedItem;
          })
          .filter((x) => typeof x.id === "string" && typeof x.title === "string")
          .filter((x) => postIds.includes(x.id));

        setInterestedPosts(mapped);
      } catch (e) {
        console.error(e);
        if (alive) setInterestedPosts([]);
      }
    }

    const handler = () => void load();
    window.addEventListener("campus:interested_changed", handler as EventListener);
    void load();
    return () => {
      alive = false;
      window.removeEventListener("campus:interested_changed", handler as EventListener);
    };
  }, []);

  return (
    <UserProfileProvider>
      <UserProfileBody interestedPosts={interestedPosts} />
    </UserProfileProvider>
  );
}

function UserProfileBody({ interestedPosts }: { interestedPosts: InterestedItem[] }) {
  const { profileLoading, canEdit } = useUserProfileContext();

  if (profileLoading) {
    return (
      <Loading></Loading>
    );
  }

  return (
    <div className="lg:my-10 lg:px-10 lg:w-full lg:h-full flex lg:gap-10 lg:justify-center lg:items-start">
      <UserProfileMainColumn />
      {canEdit ? <UserProfileSidebar interestedPosts={interestedPosts} /> : null}
    </div>
  );
}
