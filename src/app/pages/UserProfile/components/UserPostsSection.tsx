import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useUserProfileContext } from "./UserProfileContext";
import { supabase } from "@/supabase/supabaseClient";

import EventPost, { type EventPostType } from "../../Events/components/EventPost";
import {
  CollabPostCard,
  type CollabPost,
} from "../../CollabHub/components/CollabPostCard";
import { QnaPostCard, type QnaFeedPost } from "../../QnA/components/QnAPostCard";
import { LFPostCard, type LFPost } from "../../LostAndFound/components/LFPostCard";

function asCollabCategory(value: unknown): CollabPost["category"] | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  if (v === "all" || v === "research" || v === "competition" || v === "project") {
    return v as CollabPost["category"];
  }
  return null;
}

function postPath(type: string, postId: string) {
  const t = type.trim().toLowerCase();
  const base = t === "lostfound" ? "lost-and-found" : t;
  return `/${base}/${postId}`;
}

function formatRelativeTime(dateString?: string | null) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 3) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function splitDeptBatch(label: string): { dept: string; batch: string } {
  const v = label.trim();
  const idx = v.indexOf("-");
  if (idx === -1) return { dept: v, batch: "" };
  return { dept: v.slice(0, idx).trim(), batch: v.slice(idx + 1).trim() };
}

export function UserPostsSection() {
  const navigate = useNavigate();
  const {
    canEdit,
    viewedAuthUid,
    displayName,
    batchLabel,
    profilePictureUrl,
    userPosts,
    userPostsLoading,
    userPostsError,
  } = useUserProfileContext();

  const [eventById, setEventById] = useState<Map<string, EventPostType>>(new Map());
  const [collabById, setCollabById] = useState<Map<string, CollabPost>>(new Map());
  const [qnaById, setQnaById] = useState<Map<string, QnaFeedPost>>(new Map());
  const [lostFoundById, setLostFoundById] = useState<Map<string, LFPost>>(new Map());

  const idsByType = useMemo(() => {
    const byType = {
      event: [] as string[],
      collab: [] as string[],
      qna: [] as string[],
      lostfound: [] as string[],
    };

    for (const p of userPosts) {
      const t = p.type.trim().toLowerCase();
      if (t === "event") byType.event.push(p.postId);
      else if (t === "collab") byType.collab.push(p.postId);
      else if (t === "qna") byType.qna.push(p.postId);
      else if (t === "lostfound") byType.lostfound.push(p.postId);
    }
    return byType;
  }, [userPosts]);

  useEffect(() => {
    let alive = true;

    async function loadAll() {
      const authorAuthUid = viewedAuthUid;
      if (!authorAuthUid) {
        if (!alive) return;
        setEventById(new Map());
        setCollabById(new Map());
        setQnaById(new Map());
        setLostFoundById(new Map());
        return;
      }

      const { dept, batch } = splitDeptBatch(batchLabel);

      // EVENTS
      if (idsByType.event.length) {
        try {
          const { data: events, error: eventsError } = await supabase
            .from("event_posts")
            .select(
              `
              post_id,
              location,
              event_start_date,
              event_end_date,
              img_url,
              all_posts (
                post_id,
                title,
                description,
                author_id,
                like_count,
                comment_count,
                created_at
              ),
              events_category (
                category_name
              )
            `
            )
            .in("post_id", idsByType.event);

          if (eventsError) throw eventsError;

          const [{ data: tags }, { data: skills }] = await Promise.all([
            supabase.from("post_tags").select("post_id,skill_id").in("post_id", idsByType.event),
            supabase.from("skills_lookup").select("id,skill"),
          ]);

          const skillNameById = new Map<number, string>();
          for (const s of (skills ?? []) as any[]) {
            if (typeof s?.id === "number" && typeof s?.skill === "string") {
              skillNameById.set(s.id, s.skill);
            }
          }

          const tagsByPostId = new Map<string, { skill_id: number; name: string }[]>();
          for (const t of (tags ?? []) as any[]) {
            const postId = t?.post_id;
            const skillId = t?.skill_id;
            if (typeof postId !== "string" || typeof skillId !== "number") continue;
            const name = skillNameById.get(skillId) ?? "";
            const arr = tagsByPostId.get(postId) ?? [];
            arr.push({ skill_id: skillId, name });
            tagsByPostId.set(postId, arr);
          }

          const map = new Map<string, EventPostType>();
          for (const ev of (events ?? []) as any[]) {
            const postId = ev?.post_id;
            const postObj = ev?.all_posts;
            if (typeof postId !== "string") continue;

            map.set(postId, {
              id: postId,
              category: ev?.events_category?.category_name ?? "Uncategorized",
              title: typeof postObj?.title === "string" ? postObj.title : "Untitled",
              author: displayName,
              authorAuthUid,
              dept,
              batch,
              excerpt:
                typeof postObj?.description === "string"
                  ? postObj.description.slice(0, 100)
                  : "",
              body: typeof postObj?.description === "string" ? postObj.description : "",
              location: ev?.location ?? null,
              eventStartDate: ev?.event_start_date ?? null,
              eventEndDate: ev?.event_end_date ?? null,
              image: ev?.img_url ?? null,
              likes: typeof postObj?.like_count === "number" ? postObj.like_count : 0,
              comments:
                typeof postObj?.comment_count === "number" ? postObj.comment_count : 0,
              shares: 0,
              createdAt: typeof postObj?.created_at === "string" ? postObj.created_at : "",
              segments: [],
              tags: tagsByPostId.get(postId) ?? [],
              profilePictureUrl: profilePictureUrl ?? undefined,
            });
          }

          if (!alive) return;
          setEventById(map);
        } catch (e) {
          console.error(e);
          if (alive) setEventById(new Map());
        }
      } else {
        setEventById(new Map());
      }

      // COLLAB
      if (idsByType.collab.length) {
        try {
          const [{ data: postRows, error: postsError }, { data: metaRows, error: metaError }] =
            await Promise.all([
              supabase
                .from("all_posts")
                .select("post_id,title,description,author_id,like_count,comment_count,created_at")
                .eq("type", "collab")
                .in("post_id", idsByType.collab),
              supabase.from("collab_posts").select("post_id,category_id").in("post_id", idsByType.collab),
            ]);

          if (postsError) throw postsError;
          if (metaError) throw metaError;

          const [categoriesRes, postTagsRes, skillsRes] = await Promise.all([
            supabase.from("collab_category").select("category_id,category"),
            supabase.from("post_tags").select("post_id,skill_id").in("post_id", idsByType.collab),
            supabase.from("skills_lookup").select("id,skill"),
          ]);

          if (categoriesRes.error) throw categoriesRes.error;
          if (postTagsRes.error) throw postTagsRes.error;
          if (skillsRes.error) throw skillsRes.error;

          const categoryById = new Map<string, string>();
          for (const row of (categoriesRes.data ?? []) as Array<Record<string, unknown>>) {
            const id = row.category_id;
            const cat = row.category;
            if ((typeof id === "number" || typeof id === "string") && typeof cat === "string") {
              categoryById.set(String(id), cat);
            }
          }

          const skillNameById = new Map<number, string>();
          for (const row of (skillsRes.data ?? []) as Array<Record<string, unknown>>) {
            const id = row.id;
            const skill = row.skill;
            if (typeof id === "number" && typeof skill === "string" && skill.trim()) {
              skillNameById.set(id, skill);
            }
          }

          const tagsByPostId = new Map<string, string[]>();
          for (const row of (postTagsRes.data ?? []) as Array<Record<string, unknown>>) {
            const postId = row.post_id;
            const skillId = row.skill_id;
            if (typeof postId !== "string" || typeof skillId !== "number") continue;
            const skill = skillNameById.get(skillId);
            if (!skill) continue;
            const arr = tagsByPostId.get(postId) ?? [];
            arr.push(skill);
            tagsByPostId.set(postId, arr);
          }

          const metaByPostId = new Map<string, string>();
          for (const row of (metaRows ?? []) as Array<Record<string, unknown>>) {
            const postId = row.post_id;
            const categoryId = row.category_id;
            if (typeof postId === "string" && (typeof categoryId === "string" || typeof categoryId === "number")) {
              metaByPostId.set(postId, String(categoryId));
            }
          }

          const map = new Map<string, CollabPost>();
          for (const row of (postRows ?? []) as any[]) {
            const postId = row?.post_id;
            const title = row?.title;
            const description = row?.description;
            if (typeof postId !== "string" || typeof title !== "string" || typeof description !== "string") {
              continue;
            }

            const categoryId = metaByPostId.get(postId);
            const categoryRaw = categoryId ? categoryById.get(categoryId) : undefined;
            const category = asCollabCategory(categoryRaw);
            if (!category) continue;

            map.set(postId, {
              id: postId,
              category,
              title,
              content: description,
              authorAuthUid,
              authorName: displayName,
              authorBatch: batchLabel,
              authorAvatarUrl: profilePictureUrl,
              tags: tagsByPostId.get(postId) ?? [],
              likes: typeof row?.like_count === "number" ? row.like_count : 0,
              comments: typeof row?.comment_count === "number" ? row.comment_count : 0,
              createdAt: typeof row?.created_at === "string" ? row.created_at : null,
            });
          }

          if (!alive) return;
          setCollabById(map);
        } catch (e) {
          console.error(e);
          if (alive) setCollabById(new Map());
        }
      } else {
        setCollabById(new Map());
      }

      // QNA
      if (idsByType.qna.length) {
        try {
          const { data: rows, error } = await supabase
            .from("all_posts")
            .select("post_id,title,description,like_count,comment_count,created_at")
            .ilike("type", "qna")
            .in("post_id", idsByType.qna);
          if (error) throw error;

          const map = new Map<string, QnaFeedPost>();
          for (const r of (rows ?? []) as any[]) {
            const postId = r?.post_id;
            const title = r?.title;
            const description = r?.description;
            if (typeof postId !== "string" || typeof title !== "string" || typeof description !== "string") continue;
            map.set(postId, {
              id: postId,
              title,
              author: displayName,
              authorAvatar: profilePictureUrl,
              authorAuthUid,
              authorCourse: batchLabel || "—",
              content: description,
              category: "Question",
              tags: [],
              reactions: typeof r?.like_count === "number" ? r.like_count : 0,
              comments: typeof r?.comment_count === "number" ? r.comment_count : 0,
              shares: 0,
              timestamp: formatRelativeTime(r?.created_at ?? null),
            });
          }

          if (!alive) return;
          setQnaById(map);
        } catch (e) {
          console.error(e);
          if (alive) setQnaById(new Map());
        }
      } else {
        setQnaById(new Map());
      }

      // LOSTFOUND
      if (idsByType.lostfound.length) {
        try {
          const { data: rows, error } = await supabase
            .from("all_posts")
            .select("post_id,title,description,like_count,comment_count,created_at")
            .eq("type", "lostfound")
            .in("post_id", idsByType.lostfound);
          if (error) throw error;

          const map = new Map<string, LFPost>();
          for (const r of (rows ?? []) as any[]) {
            const postId = r?.post_id;
            const title = r?.title;
            const description = r?.description;
            if (typeof postId !== "string" || typeof title !== "string" || typeof description !== "string") continue;
            map.set(postId, {
              id: postId,
              title,
              author: displayName,
              authorCourse: batchLabel || "—",
              authorAvatar: undefined,
              authorAuthUid,
              description,
              imageUrl: undefined,
              reactions: typeof r?.like_count === "number" ? r.like_count : 0,
              comments: typeof r?.comment_count === "number" ? r.comment_count : 0,
              shares: 0,
              timestamp: formatRelativeTime(r?.created_at ?? null),
            });
          }

          if (!alive) return;
          setLostFoundById(map);
        } catch (e) {
          console.error(e);
          if (alive) setLostFoundById(new Map());
        }
      } else {
        setLostFoundById(new Map());
      }
    }

    void loadAll();
    return () => {
      alive = false;
    };
  }, [batchLabel, displayName, idsByType, profilePictureUrl, viewedAuthUid]);

  return (
    <div className="bg-primary-lm border border-stroke-grey lg:rounded-xl lg:p-8 flex flex-col h-fit">
      <h4 className="font-header">Posts</h4>
      <div className="flex flex-col lg:gap-5 lg:mt-4">
        {userPostsLoading ? (
          <p className="text-sm text-text-lighter-lm">Loading…</p>
        ) : userPostsError ? (
          <p className="text-sm text-accent-lm">{userPostsError}</p>
        ) : userPosts.length === 0 ? (
          <p className="text-text-lighter-lm">No posts yet.</p>
        ) : (
          userPosts.map((p) => {
            const t = p.type.trim().toLowerCase();

            if (t === "event") {
              const post = eventById.get(p.postId);
              if (!post) return null;
              return (
                <EventPost
                  key={p.postId}
                  post={post}
                  onClick={() => navigate(`/events/${p.postId}`)}
                />
              );
            }

            if (t === "collab") {
              const post = collabById.get(p.postId);
              if (!post) return null;
              return (
                <CollabPostCard
                  key={p.postId}
                  post={post}
                  onClick={() => navigate(`/collab/${p.postId}`)}
                />
              );
            }

            if (t === "qna") {
              const post = qnaById.get(p.postId);
              if (!post) return null;
              return (
                <QnaPostCard
                  key={p.postId}
                  post={post}
                  onOpenDetail={() => navigate(postPath("qna", p.postId))}
                  onLike={() => {
                    /* keep profile feed read-only for now */
                  }}
                  onAddInlineComment={() => {
                    /* keep profile feed read-only for now */
                  }}
                />
              );
            }

            if (t === "lostfound") {
              const post = lostFoundById.get(p.postId);
              if (!post) return null;
              return (
                <LFPostCard
                  key={p.postId}
                  post={post}
                  isLiked={false}
                  onToggleLike={() => {
                    /* keep profile feed read-only for now */
                  }}
                  onOpenComments={() => navigate(postPath("lostfound", p.postId))}
                  onEdit={() => {
                    if (canEdit) navigate(postPath("lostfound", p.postId));
                  }}
                  onRemove={() => {
                    if (canEdit) navigate(postPath("lostfound", p.postId));
                  }}
                />
              );
            }

            // fallback: preserve navigation for unknown types
            return (
              <button
                key={p.postId}
                type="button"
                onClick={() => navigate(postPath(p.type, p.postId))}
                className="bg-secondary-lm hover:bg-hover-lm border border-stroke-grey hover:border-stroke-peach transition duration-200 lg:p-6 lg:rounded-lg cursor-pointer text-left"
              >
                <div className="text-xs text-text-lighter-lm">{p.type}</div>
                <h5 className="font-header">{p.title}</h5>
                <p className="text-sm text-text-lighter-lm">{p.description}</p>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
