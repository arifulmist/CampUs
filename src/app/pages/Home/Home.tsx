import { UpcomingEvents } from "@/components/UpcomingEvents.tsx";
import { Spinner } from "@/components/ui/spinner";
import { supabase } from "@/supabase/supabaseClient";
import { formatRelativeTime } from "@/utils/datetime";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import EventPost, {
  type EventPostType,
} from "@/app/pages/Events/components/EventPost";
import {
  CollabPostCard,
  type CollabPost,
} from "@/app/pages/CollabHub/components/CollabPostCard";
import {
  QnaPostCard,
  type QnaFeedPost,
} from "@/app/pages/QnA/components/QnaPostCard";
import {
  LFPostCard,
  type LFPost,
} from "@/app/pages/LostAndFound/components/LFPostCard";

type BasePostResult = {
  post_id: string;
  type: string;
  title: string;
  description: string;
  author_id: string;
  created_at: string | null;
  like_count: number | null;
  comment_count: number | null;
};

type AuthorRow = {
  auth_uid: string;
  name: string | null;
  department: string | null;
  batch: string | number | null;
};

type ProfileRow = {
  auth_uid: string;
  profile_picture_url: string | null;
};

type SkillRow = {
  id: number;
  skill: string;
};

type PostTagRow = {
  post_id: string;
  skill_id: number;
};

type EventMetaRow = {
  post_id: string;
  location: string | null;
  event_start_date: string | null;
  event_end_date: string | null;
  img_url: string | null;
  events_category: { category_name: string | null } | null;
};

type CollabMetaRow = {
  post_id: string;
  category_id: string | number;
};

type CollabCategoryRow = {
  category_id: string | number;
  category: string;
};

type QnaMetaRow = {
  post_id: string;
  img_url: string | null;
  qna_category: { category_name: string | null } | null;
};

type LostFoundMetaRow = {
  post_id: string;
  img_url: string | null;
  category: string | null;
};

type UserSkillRow = {
  skill_id: number | null;
};

type UserInterestRow = {
  interest_id: number | null;
};

type PostIdOnlyRow = {
  post_id: string | null;
};

function normalizePostType(
  type: string,
): "event" | "collab" | "qna" | "lostfound" | string {
  const t = String(type ?? "")
    .trim()
    .toLowerCase();
  if (t === "events" || t === "event") return "event";
  if (t === "lost-and-found" || t === "lostfound" || t === "lost_and_found")
    return "lostfound";
  if (t === "collabhub" || t === "collab") return "collab";
  return t;
}

function deptBatchLabel(
  dept?: string | null,
  batch?: string | number | null,
): string {
  const d = typeof dept === "string" ? dept.trim() : "";
  const b = batch == null ? "" : String(batch).trim();
  if (d && b) return `${d}-${b}`;
  return d || b;
}

function asCollabCategory(value: unknown): CollabPost["category"] | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  if (
    v === "all" ||
    v === "research" ||
    v === "competition" ||
    v === "project"
  ) {
    return v as CollabPost["category"];
  }
  return null;
}

function asQnaCategory(value: unknown): QnaFeedPost["category"] {
  if (typeof value !== "string") return "Question";
  const v = value.trim().toLowerCase();
  if (v === "question") return "Question";
  if (v === "advice") return "Advice";
  if (v === "resource") return "Resource";
  return "Question";
}

export function Home() {
  const navigate = useNavigate();

  const [, setAuthUid] = useState<string | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<BasePostResult[]>([]);
  const [popularPosts, setPopularPosts] = useState<BasePostResult[]>([]);
  const [, setHasSkillsOrInterests] = useState<boolean>(false);

  const [relatedLoading, setRelatedLoading] = useState<boolean>(true);
  const [popularLoading, setPopularLoading] = useState<boolean>(true);

  const [eventById, setEventById] = useState<Map<string, EventPostType>>(
    new Map(),
  );
  const [collabById, setCollabById] = useState<Map<string, CollabPost>>(
    new Map(),
  );
  const [qnaById, setQnaById] = useState<Map<string, QnaFeedPost>>(new Map());
  const [lostFoundById, setLostFoundById] = useState<Map<string, LFPost>>(
    new Map(),
  );

  const hydratePostCards = async (basePosts: BasePostResult[]) => {
    const byType = {
      event: [] as string[],
      collab: [] as string[],
      qna: [] as string[],
      lostfound: [] as string[],
    };

    const authorIdsForBatch = Array.from(
      new Set(
        basePosts
          .map((p) => p.author_id)
          .filter(
            (x): x is string => typeof x === "string" && x.trim().length > 0,
          ),
      ),
    );

    for (const p of basePosts) {
      const t = normalizePostType(p.type);
      if (t === "event") byType.event.push(p.post_id);
      else if (t === "collab") byType.collab.push(p.post_id);
      else if (t === "qna") byType.qna.push(p.post_id);
      else if (t === "lostfound") byType.lostfound.push(p.post_id);
    }

    const [usersRes, profilesRes] = await Promise.all([
      authorIdsForBatch.length
        ? supabase
            .from("user_info")
            .select("auth_uid,name,department,batch")
            .in("auth_uid", authorIdsForBatch)
        : Promise.resolve({ data: [], error: null } as unknown as {
            data: AuthorRow[];
            error: null;
          }),
      authorIdsForBatch.length
        ? supabase
            .from("user_profile")
            .select("auth_uid,profile_picture_url")
            .in("auth_uid", authorIdsForBatch)
        : Promise.resolve({ data: [], error: null } as unknown as {
            data: ProfileRow[];
            error: null;
          }),
    ]);

    if (usersRes.error) throw usersRes.error;
    if (profilesRes.error) throw profilesRes.error;

    const authorNameById = new Map<string, string>();
    const authorDeptById = new Map<string, string>();
    const authorBatchById = new Map<string, string>();
    for (const row of (usersRes.data ?? []) as AuthorRow[]) {
      const id = row.auth_uid;
      if (typeof id !== "string") continue;
      if (typeof row.name === "string" && row.name.trim())
        authorNameById.set(id, row.name);
      if (typeof row.department === "string" && row.department.trim())
        authorDeptById.set(id, row.department);
      if (row.batch != null && String(row.batch).trim())
        authorBatchById.set(id, String(row.batch));
    }

    const authorAvatarById = new Map<string, string>();
    for (const row of (profilesRes.data ?? []) as ProfileRow[]) {
      const id = row.auth_uid;
      const url = row.profile_picture_url;
      if (typeof id === "string" && typeof url === "string" && url.trim()) {
        authorAvatarById.set(id, url);
      }
    }

    // Resolve department ids to names (ensures dept_name-batch display)
    const deptIds = new Set<string>();
    for (const dept of authorDeptById.values()) {
      if (dept && /^[0-9]+$/.test(String(dept).trim()))
        deptIds.add(String(dept).trim());
    }
    if (deptIds.size > 0) {
      const { data: deptRows, error: deptErr } = await supabase
        .from("departments_lookup")
        .select("dept_id,department_name")
        .in("dept_id", Array.from(deptIds));
      if (!deptErr && Array.isArray(deptRows)) {
        const nameById = new Map<string, string>();
        for (const r of deptRows as Array<Record<string, unknown>>) {
          const id = r.dept_id;
          const name = r.department_name;
          if (
            (typeof id === "number" || typeof id === "string") &&
            typeof name === "string"
          ) {
            nameById.set(String(id), name);
          }
        }
        for (const [authId, deptVal] of Array.from(authorDeptById.entries())) {
          const key = String(deptVal ?? "").trim();
          if (key && nameById.has(key))
            authorDeptById.set(authId, nameById.get(key)!);
        }
      }
    }

    const baseById = new Map<string, BasePostResult>();
    for (const r of basePosts) baseById.set(r.post_id, r);

    // Shared tag lookup (events + collab)
    const needsSkills = byType.event.length > 0 || byType.collab.length > 0;
    const [skillsRes, eventTagsRes, collabTagsRes] = await Promise.all([
      needsSkills
        ? supabase.from("skills_lookup").select("id,skill")
        : Promise.resolve({ data: [], error: null } as unknown as {
            data: SkillRow[];
            error: null;
          }),
      byType.event.length
        ? supabase
            .from("post_tags")
            .select("post_id,skill_id")
            .in("post_id", byType.event)
        : Promise.resolve({ data: [], error: null } as unknown as {
            data: PostTagRow[];
            error: null;
          }),
      byType.collab.length
        ? supabase
            .from("post_tags")
            .select("post_id,skill_id")
            .in("post_id", byType.collab)
        : Promise.resolve({ data: [], error: null } as unknown as {
            data: PostTagRow[];
            error: null;
          }),
    ]);

    if (skillsRes.error) throw skillsRes.error;
    if (eventTagsRes.error) throw eventTagsRes.error;
    if (collabTagsRes.error) throw collabTagsRes.error;

    const skillById = new Map<number, string>();
    for (const row of (skillsRes.data ?? []) as SkillRow[]) {
      if (
        typeof row.id === "number" &&
        typeof row.skill === "string" &&
        row.skill.trim()
      ) {
        skillById.set(row.id, row.skill);
      }
    }

    const eventTagsByPostId = new Map<
      string,
      { skill_id: number; name: string }[]
    >();
    for (const row of (eventTagsRes.data ?? []) as PostTagRow[]) {
      const postId = row.post_id;
      const skillId = row.skill_id;
      if (typeof postId !== "string" || typeof skillId !== "number") continue;
      const name = skillById.get(skillId) ?? "";
      const arr = eventTagsByPostId.get(postId) ?? [];
      arr.push({ skill_id: skillId, name });
      eventTagsByPostId.set(postId, arr);
    }

    const collabTagsByPostId = new Map<string, string[]>();
    for (const row of (collabTagsRes.data ?? []) as PostTagRow[]) {
      const postId = row.post_id;
      const skillId = row.skill_id;
      if (typeof postId !== "string" || typeof skillId !== "number") continue;
      const name = skillById.get(skillId);
      if (!name) continue;
      const arr = collabTagsByPostId.get(postId) ?? [];
      arr.push(name);
      collabTagsByPostId.set(postId, arr);
    }

    const [eventsRes, collabMetaRes, collabCatsRes, qnaRes, lfRes] =
      await Promise.all([
        byType.event.length
          ? supabase
              .from("event_posts")
              .select(
                "post_id,location,event_start_date,event_end_date,img_url,events_category(category_name)",
              )
              .in("post_id", byType.event)
          : Promise.resolve({ data: [], error: null } as unknown as {
              data: EventMetaRow[];
              error: null;
            }),
        byType.collab.length
          ? supabase
              .from("collab_posts")
              .select("post_id,category_id")
              .in("post_id", byType.collab)
          : Promise.resolve({ data: [], error: null } as unknown as {
              data: CollabMetaRow[];
              error: null;
            }),
        byType.collab.length
          ? supabase.from("collab_category").select("category_id,category")
          : Promise.resolve({ data: [], error: null } as unknown as {
              data: CollabCategoryRow[];
              error: null;
            }),
        byType.qna.length
          ? supabase
              .from("qna_posts")
              .select("post_id,img_url,qna_category(category_name)")
              .in("post_id", byType.qna)
          : Promise.resolve({ data: [], error: null } as unknown as {
              data: QnaMetaRow[];
              error: null;
            }),
        byType.lostfound.length
          ? supabase
              .from("lost_and_found_posts")
              .select("post_id,img_url,category")
              .in("post_id", byType.lostfound)
          : Promise.resolve({ data: [], error: null } as unknown as {
              data: LostFoundMetaRow[];
              error: null;
            }),
      ]);

    if (eventsRes.error) throw eventsRes.error;
    if (collabMetaRes.error) throw collabMetaRes.error;
    if (collabCatsRes.error) throw collabCatsRes.error;
    if (qnaRes.error) throw qnaRes.error;
    if (lfRes.error) throw lfRes.error;

    const collabCategoryById = new Map<string, string>();
    for (const row of (collabCatsRes.data ?? []) as CollabCategoryRow[]) {
      const id = row.category_id;
      const cat = row.category;
      if (
        (typeof id === "number" || typeof id === "string") &&
        typeof cat === "string" &&
        cat.trim()
      ) {
        collabCategoryById.set(String(id), cat);
      }
    }

    const collabCategoryIdByPostId = new Map<string, string>();
    for (const row of (collabMetaRes.data ?? []) as CollabMetaRow[]) {
      const postId = row.post_id;
      const categoryId = row.category_id;
      if (
        typeof postId === "string" &&
        (typeof categoryId === "number" || typeof categoryId === "string")
      ) {
        collabCategoryIdByPostId.set(postId, String(categoryId));
      }
    }

    const lfImgByPostId = new Map<string, string | null>();
    const lfCategoryByPostId = new Map<string, string | null>();
    for (const row of (lfRes.data ?? []) as LostFoundMetaRow[]) {
      const postId = row.post_id;
      if (typeof postId !== "string") continue;
      lfImgByPostId.set(
        postId,
        typeof row.img_url === "string" && row.img_url.trim()
          ? row.img_url
          : null,
      );
      lfCategoryByPostId.set(
        postId,
        typeof row.category === "string" && row.category.trim()
          ? row.category
          : null,
      );
    }

    const qnaByPostId = new Map<
      string,
      { category: QnaFeedPost["category"]; imgUrl: string | null }
    >();
    for (const row of (qnaRes.data ?? []) as QnaMetaRow[]) {
      const postId = row.post_id;
      if (typeof postId !== "string") continue;
      qnaByPostId.set(postId, {
        category: asQnaCategory(row.qna_category?.category_name ?? null),
        imgUrl:
          typeof row.img_url === "string" && row.img_url.trim()
            ? row.img_url
            : null,
      });
    }

    const eventsMap = new Map<string, EventPostType>();
    for (const row of (eventsRes.data ?? []) as EventMetaRow[]) {
      const postId = row.post_id;
      if (typeof postId !== "string") continue;
      const base = baseById.get(postId);
      if (!base) continue;

      const authorId = base.author_id;
      const author = authorNameById.get(authorId) ?? "Unknown";
      const dept = authorDeptById.get(authorId) ?? "";
      const batch = authorBatchById.get(authorId) ?? "";
      const catName =
        typeof row.events_category?.category_name === "string"
          ? row.events_category.category_name
          : "Events";

      eventsMap.set(postId, {
        id: postId,
        category: catName,
        title: base.title,
        author,
        authorAuthUid: authorId,
        dept,
        batch,
        excerpt: base.description?.slice(0, 100) ?? "",
        body: base.description ?? "",
        location: row.location ?? undefined,
        image: typeof row.img_url === "string" ? row.img_url : null,
        images: undefined,
        eventStartDate: row.event_start_date ?? null,
        eventEndDate: row.event_end_date ?? null,
        segments: [],
        tags: eventTagsByPostId.get(postId) ?? [],
        likes: typeof base.like_count === "number" ? base.like_count : 0,
        comments:
          typeof base.comment_count === "number" ? base.comment_count : 0,
        shares: 0,
        createdAt: base.created_at ?? undefined,
        profilePictureUrl: authorAvatarById.get(authorId),
      });
    }

    const collabMap = new Map<string, CollabPost>();
    for (const postId of byType.collab) {
      const base = baseById.get(postId);
      if (!base) continue;

      const authorId = base.author_id;
      const authorName = authorNameById.get(authorId) ?? "Unknown";
      const authorBatch = deptBatchLabel(
        authorDeptById.get(authorId),
        authorBatchById.get(authorId),
      );

      const categoryId = collabCategoryIdByPostId.get(postId);
      const categoryRaw = categoryId
        ? collabCategoryById.get(categoryId)
        : null;
      const category = asCollabCategory(categoryRaw);
      if (!category) continue;

      collabMap.set(postId, {
        id: postId,
        category,
        title: base.title,
        content: base.description,
        authorAuthUid: authorId,
        authorName,
        authorBatch,
        authorAvatarUrl: authorAvatarById.get(authorId) ?? null,
        tags: collabTagsByPostId.get(postId) ?? [],
        likes: typeof base.like_count === "number" ? base.like_count : 0,
        comments:
          typeof base.comment_count === "number" ? base.comment_count : 0,
        createdAt: base.created_at ?? null,
      });
    }

    const qnaMap = new Map<string, QnaFeedPost>();
    for (const postId of byType.qna) {
      const base = baseById.get(postId);
      if (!base) continue;

      const authorId = base.author_id;
      const author = authorNameById.get(authorId) ?? "Unknown";
      const authorCourse =
        deptBatchLabel(
          authorDeptById.get(authorId),
          authorBatchById.get(authorId),
        ) || "—";
      const qnaMeta = qnaByPostId.get(postId);

      qnaMap.set(postId, {
        id: postId,
        title: base.title,
        author,
        authorAvatar: authorAvatarById.get(authorId) ?? null,
        authorAuthUid: authorId,
        authorCourse,
        content: base.description,
        category: qnaMeta?.category ?? "Question",
        tags: [],
        reactions: typeof base.like_count === "number" ? base.like_count : 0,
        comments:
          typeof base.comment_count === "number" ? base.comment_count : 0,
        shares: 0,
        timestamp: formatRelativeTime(base.created_at ?? null),
        imageUrl: qnaMeta?.imgUrl ?? null,
      });
    }

    const lostFoundMap = new Map<string, LFPost>();
    for (const postId of byType.lostfound) {
      const base = baseById.get(postId);
      if (!base) continue;

      const authorId = base.author_id;
      const author = authorNameById.get(authorId) ?? "Unknown";
      const authorCourse =
        deptBatchLabel(
          authorDeptById.get(authorId),
          authorBatchById.get(authorId),
        ) || "—";

      lostFoundMap.set(postId, {
        id: postId,
        category: lfCategoryByPostId.get(postId) ?? undefined,
        title: base.title,
        author,
        authorCourse,
        authorAvatar: authorAvatarById.get(authorId) ?? undefined,
        authorAuthUid: authorId,
        description: base.description,
        imageUrl: lfImgByPostId.get(postId) ?? undefined,
        reactions: typeof base.like_count === "number" ? base.like_count : 0,
        comments:
          typeof base.comment_count === "number" ? base.comment_count : 0,
        shares: 0,
        timestamp: formatRelativeTime(base.created_at ?? null),
      });
    }

    setEventById(eventsMap);
    setCollabById(collabMap);
    setQnaById(qnaMap);
    setLostFoundById(lostFoundMap);
  };

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setRelatedLoading(true);
      setPopularLoading(true);

      try {
        const { data: userData, error: userError } =
          await supabase.auth.getUser();
        if (!mounted) return;
        if (userError) console.error("Error fetching user:", userError);
        const uid = userData?.user?.id ?? null;
        setAuthUid(uid);

        // Always show Lost & Found posts
        const { data: lfRows, error: lfErr } = await supabase
          .from("all_posts")
          .select(
            "post_id,type,title,description,author_id,created_at,like_count,comment_count",
          )
          .in("type", ["lostfound", "lost_and_found", "lost-and-found"])
          .order("created_at", { ascending: false })
          .range(0, 9999);

        if (lfErr) console.error("Lost & Found all_posts fetch error:", lfErr);
        const lostFoundPosts = (lfRows ?? []) as BasePostResult[];

        // Relevant: posts tagged with user's skills/interests
        let tagMatchedPosts: BasePostResult[] = [];
        if (uid) {
          const [skillsRes, interestsRes] = await Promise.all([
            supabase.from("user_skills").select("skill_id").eq("auth_uid", uid),
            supabase
              .from("user_interests")
              .select("interest_id")
              .eq("auth_uid", uid),
          ]);

          if (skillsRes.error)
            console.error("user_skills fetch error:", skillsRes.error);
          if (interestsRes.error)
            console.error("user_interests fetch error:", interestsRes.error);

          const skillIds = ((skillsRes.data ?? []) as UserSkillRow[])
            .map((s) => s.skill_id)
            .filter((x): x is number => typeof x === "number");
          const interestIds = ((interestsRes.data ?? []) as UserInterestRow[])
            .map((i) => i.interest_id)
            .filter((x): x is number => typeof x === "number");
          const combinedIds = Array.from(
            new Set([...skillIds, ...interestIds]),
          );

          setHasSkillsOrInterests(combinedIds.length > 0);

          if (combinedIds.length > 0) {
            const { data: tagRows, error: tagErr } = await supabase
              .from("post_tags")
              .select("post_id")
              .in("skill_id", combinedIds)
              .limit(200);
            if (tagErr) console.error("post_tags fetch error:", tagErr);

            const postIds = Array.from(
              new Set(
                ((tagRows ?? []) as PostIdOnlyRow[])
                  .map((r) => r.post_id)
                  .filter(
                    (x): x is string =>
                      typeof x === "string" && x.trim().length > 0,
                  ),
              ),
            );

            if (postIds.length > 0) {
              const { data: baseRows, error: baseErr } = await supabase
                .from("all_posts")
                .select(
                  "post_id,type,title,description,author_id,created_at,like_count,comment_count",
                )
                .in("post_id", postIds)
                .order("created_at", { ascending: false })
                .limit(20);
              if (baseErr)
                console.error("Relevant all_posts fetch error:", baseErr);
              tagMatchedPosts = (baseRows ?? []) as BasePostResult[];
            }
          }
        } else {
          setHasSkillsOrInterests(false);
        }

        // Merge Lost&Found + tag matched; de-dupe; sort by created_at desc
        const mergedRelated = new Map<string, BasePostResult>();
        for (const p of [...lostFoundPosts, ...tagMatchedPosts]) {
          if (!p?.post_id) continue;
          mergedRelated.set(p.post_id, p);
        }
        const finalRelated = Array.from(mergedRelated.values()).sort((a, b) => {
          const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
          const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
          return tb - ta;
        });

        // Most Popular: highest likes
        const { data: popularRows, error: popError } = await supabase
          .from("all_posts")
          .select(
            "post_id,type,title,description,author_id,created_at,like_count,comment_count",
          )
          .order("like_count", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(3);
        if (popError) console.error("Popular posts error:", popError);

        if (!mounted) return;
        setRelatedPosts(finalRelated);
        setPopularPosts((popularRows ?? []) as BasePostResult[]);

        const unionById = new Map<string, BasePostResult>();
        for (const p of [
          ...finalRelated,
          ...((popularRows ?? []) as BasePostResult[]),
        ]) {
          if (!p?.post_id) continue;
          unionById.set(p.post_id, p);
        }

        await hydratePostCards(Array.from(unionById.values()));
      } catch (e) {
        console.error("Home feed load error:", e);
      } finally {
        if (mounted) {
          setRelatedLoading(false);
          setPopularLoading(false);
        }
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const buildUrl = (p: { type: string; post_id: string }) => {
    const type = normalizePostType(p.type);
    if (type === "lostfound") return `/lost-and-found/${p.post_id}`;
    if (type === "event") return `/events/${p.post_id}`;
    if (type === "collab") return `/collab/${p.post_id}`;
    if (type === "qna") return `/qna/${p.post_id}`;
    return `/${String(type)}/${p.post_id}`;
  };

  return (
    <div className="lg:flex lg:gap-10 lg:h-full lg:w-full lg:p-10 lg:animate-fade-in justify-center items-start">
      <div className="bg-primary-lm border border-stroke-grey lg:rounded-xl lg:p-10 flex flex-col gap-10 lg:w-[70vw]">
        {relatedLoading ? (
          <div className="flex items-center gap-3 text-text-lighter-lm">
            <Spinner className="size-5 text-accent-lm" />
            <span>Loading relevant posts...</span>
          </div>
        ) : null}

        {/* {!relatedLoading && !hasSkillsOrInterests && authUid ? (
          <div className="text-text-lighter-lm">Add skills/interests in your profile to see relevant posts here.</div>
        ) : null} */}

        {!relatedLoading
          ? relatedPosts.map((p) => {
              const t = normalizePostType(p.type);

              if (t === "event") {
                const post = eventById.get(p.post_id);
                if (!post) return null;
                return (
                  <EventPost
                    key={p.post_id}
                    post={post}
                    showPostTypeLabel
                    onClick={() => navigate(buildUrl(p))}
                  />
                );
              }

              if (t === "collab") {
                const post = collabById.get(p.post_id);
                if (!post) return null;
                return (
                  <CollabPostCard
                    key={p.post_id}
                    post={post}
                    showPostTypeLabel
                    onClick={() => navigate(buildUrl(p))}
                  />
                );
              }

              if (t === "qna") {
                const post = qnaById.get(p.post_id);
                if (!post) return null;
                return (
                  <QnaPostCard
                    key={p.post_id}
                    post={post}
                    showPostTypeLabel
                    onOpenDetail={() => navigate(buildUrl(p))}
                    onLike={() => {
                      /* Home feed is read-only */
                    }}
                    onAddInlineComment={() => {
                      /* Home feed is read-only */
                    }}
                  />
                );
              }

              if (t === "lostfound") {
                const post = lostFoundById.get(p.post_id);
                if (!post) return null;
                return (
                  <LFPostCard
                    key={p.post_id}
                    post={post}
                    showPostTypeLabel
                    isLiked={false}
                    onToggleLike={() => {
                      /* Home feed is read-only */
                    }}
                    onOpenComments={() => navigate(buildUrl(p))}
                    onEdit={() => navigate(buildUrl(p))}
                    onRemove={() => {
                      /* Home feed is read-only */
                    }}
                  />
                );
              }

              return null;
            })
          : null}

        <h2 className="text-lg font-bold mt-8">Most Popular</h2>
        {popularLoading ? (
          <div className="flex items-center gap-3 text-text-lighter-lm">
            <Spinner className="size-5 text-accent-lm" />
            <span>Loading popular posts...</span>
          </div>
        ) : null}

        {!popularLoading && popularPosts.length === 0 ? (
          <div className="text-gray-500">No popular posts yet</div>
        ) : null}

        {!popularLoading
          ? popularPosts.map((p) => {
              const t = normalizePostType(p.type);

              if (t === "event") {
                const post = eventById.get(p.post_id);
                if (!post) return null;
                return (
                  <EventPost
                    key={p.post_id}
                    post={post}
                    showPostTypeLabel
                    onClick={() => navigate(buildUrl(p))}
                  />
                );
              }

              if (t === "collab") {
                const post = collabById.get(p.post_id);
                if (!post) return null;
                return (
                  <CollabPostCard
                    key={p.post_id}
                    post={post}
                    showPostTypeLabel
                    onClick={() => navigate(buildUrl(p))}
                  />
                );
              }

              if (t === "qna") {
                const post = qnaById.get(p.post_id);
                if (!post) return null;
                return (
                  <QnaPostCard
                    key={p.post_id}
                    post={post}
                    showPostTypeLabel
                    onOpenDetail={() => navigate(buildUrl(p))}
                    onLike={() => {
                      /* Home feed is read-only */
                    }}
                    onAddInlineComment={() => {
                      /* Home feed is read-only */
                    }}
                  />
                );
              }

              if (t === "lostfound") {
                const post = lostFoundById.get(p.post_id);
                if (!post) return null;
                return (
                  <LFPostCard
                    key={p.post_id}
                    post={post}
                    showPostTypeLabel
                    isLiked={false}
                    onToggleLike={() => {
                      /* Home feed is read-only */
                    }}
                    onOpenComments={() => navigate(buildUrl(p))}
                    onEdit={() => navigate(buildUrl(p))}
                    onRemove={() => {
                      /* Home feed is read-only */
                    }}
                  />
                );
              }

              return null;
            })
          : null}
      </div>

      <div className="lg:w-[20vw]">
        <UpcomingEvents />
      </div>
    </div>
  );
}
