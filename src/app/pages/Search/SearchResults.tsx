import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { supabase } from "@/supabase/supabaseClient";
import useDebounce from "@/hooks/useDebounce";

import { UserInfo } from "@/components/UserInfo";
import { formatRelativeTime } from "@/utils/datetime";

import EventPost, { type EventPostType } from "@/app/pages/Events/components/EventPost";
import { CollabPostCard, type CollabPost } from "@/app/pages/CollabHub/components/CollabPostCard";
import { QnaPostCard, type QnaFeedPost } from "@/app/pages/QnA/components/QnaPostCard";
import { LFPostCard, type LFPost } from "@/app/pages/LostAndFound/components/LFPostCard";

function useQueryParam(key: string) {
  const { search } = useLocation();
  return new URLSearchParams(search).get(key) ?? "";
}

type PersonResult = {
  auth_uid: string;
  name: string;
  student_id: string | null;
  department: string | null;
  batch: string | number | null;
};

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
  student_id: string | null;
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
};

function normalizePostType(type: string): "event" | "collab" | "qna" | "lostfound" | string {
  const t = type.trim().toLowerCase();
  if (t === "events" || t === "event") return "event";
  if (t === "lost-and-found" || t === "lostfound" || t === "lost_and_found") return "lostfound";
  if (t === "collabhub" || t === "collab") return "collab";
  return t;
}

function deptBatchLabel(dept?: string | null, batch?: string | number | null): string {
  const d = typeof dept === "string" ? dept.trim() : "";
  const b = batch == null ? "" : String(batch).trim();
  if (d && b) return `${d}-${b}`;
  return d || b;
}

function asCollabCategory(value: unknown): CollabPost["category"] | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  if (v === "all" || v === "research" || v === "competition" || v === "project") {
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

export default function SearchResults() {
  const q = useQueryParam("q").trim();
  const debouncedQ = useDebounce(q, 300);
  const navigate = useNavigate();

  const [tab, setTab] = useState<"people" | "posts">("people");
  const [people, setPeople] = useState<PersonResult[]>([]);
  const [posts, setPosts] = useState<BasePostResult[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTokenRef = useRef(0);

  const [eventById, setEventById] = useState<Map<string, EventPostType>>(new Map());
  const [collabById, setCollabById] = useState<Map<string, CollabPost>>(new Map());
  const [qnaById, setQnaById] = useState<Map<string, QnaFeedPost>>(new Map());
  const [lostFoundById, setLostFoundById] = useState<Map<string, LFPost>>(new Map());

  useEffect(() => {
    const token = ++loadTokenRef.current;

    if (!debouncedQ) {
      // Schedule state updates to avoid cascading-render lint warnings.
      setTimeout(() => {
        if (loadTokenRef.current !== token) return;
        setPeople([]);
        setPosts([]);
        setEventById(new Map());
        setCollabById(new Map());
        setQnaById(new Map());
        setLostFoundById(new Map());
        setLoading(false);
      }, 0);
      return;
    }

    const fetchData = async () => {
      setLoading(true);

      try {

      if (tab === "people") {
        const { data } = await supabase
          .from("user_info")
          .select("auth_uid,name,student_id,department,batch")
          .ilike("name", `%${debouncedQ}%`)
          .limit(10);
        if (loadTokenRef.current !== token) return;
        const peopleRows = (data ?? []) as PersonResult[];

        // If department values are numeric ids, resolve them to names
        const deptIds = Array.from(
          new Set(
            peopleRows
              .map((r) => (typeof r.department === "string" ? r.department.trim() : String(r.department ?? "")))
              .filter((d) => !!d && /^[0-9]+$/.test(d))
          )
        );

        if (deptIds.length > 0) {
          const { data: deptRows, error: deptErr } = await supabase
            .from("departments_lookup")
            .select("dept_id,department_name")
            .in("dept_id", deptIds);
          if (!deptErr && Array.isArray(deptRows)) {
            const nameById = new Map<string, string>();
            for (const r of deptRows as Array<Record<string, unknown>>) {
              const id = r.dept_id;
              const name = r.department_name;
              if ((typeof id === "number" || typeof id === "string") && typeof name === "string") {
                nameById.set(String(id), name);
              }
            }
            for (const row of peopleRows) {
              if (typeof row.department === "string" && nameById.has(row.department.trim())) {
                row.department = nameById.get(row.department.trim()) ?? row.department;
              }
            }
          }
        }

        setPeople(peopleRows);
        setPosts([]);
        setEventById(new Map());
        setCollabById(new Map());
        setQnaById(new Map());
        setLostFoundById(new Map());
      }

      if (tab === "posts") {
        // prepare state for posts branch
        setPeople([]);
        setPosts([]);
        setEventById(new Map());
        setCollabById(new Map());
        setQnaById(new Map());
        setLostFoundById(new Map());

        // --- Title search ---
        const { data: postsByTitle } = await supabase
          .from("all_posts")
          .select("post_id,type,title,description,author_id,created_at,like_count,comment_count")
          .ilike("title", `%${debouncedQ}%`)
          .limit(10);
        if (loadTokenRef.current !== token) return;

        // --- Description search ---
        const { data: postsByDesc } = await supabase
          .from("all_posts")
          .select("post_id,type,title,description,author_id,created_at,like_count,comment_count")
          .ilike("description", `%${debouncedQ}%`)
          .limit(10);
        if (loadTokenRef.current !== token) return;

        // --- Author search ---
        const { data: authors } = await supabase
          .from("user_info")
          .select("auth_uid, name, student_id")
          .ilike("name", `%${debouncedQ}%`);

        let postsByAuthor: BasePostResult[] = [];
        if (authors?.length) {
          const authorIds = authors.map((a) => a.auth_uid);
          const { data } = await supabase
            .from("all_posts")
            .select("post_id,type,title,description,author_id,created_at,like_count,comment_count")
            .in("author_id", authorIds)
            .limit(10);
          postsByAuthor = (data ?? []) as BasePostResult[];
        }

        // --- Merge & deduplicate ---
        const mergedPosts = [
          ...(postsByTitle ?? []),
          ...(postsByDesc ?? []),
          ...(postsByAuthor ?? []),
        ];

        const uniquePosts = new Map<string, BasePostResult>();
        for (const post of mergedPosts as BasePostResult[]) {
          if (!post?.post_id) continue;
          uniquePosts.set(post.post_id, post);
        }

        const finalPosts = Array.from(uniquePosts.values());

        if (loadTokenRef.current !== token) return;
        setPosts(finalPosts);
        setPeople([]);

        // Load post-card details in batch, per type.
        const byType = {
          event: [] as string[],
          collab: [] as string[],
          qna: [] as string[],
          lostfound: [] as string[],
        };
        const authorIdsForBatch = Array.from(
          new Set(
            finalPosts
              .map((p) => p.author_id)
              .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
          )
        );

        for (const p of finalPosts) {
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
                .select("auth_uid,name,department,batch,student_id")
                .in("auth_uid", authorIdsForBatch)
            : Promise.resolve({ data: [], error: null } as unknown as { data: AuthorRow[]; error: null }),
          authorIdsForBatch.length
            ? supabase
                .from("user_profile")
                .select("auth_uid,profile_picture_url")
                .in("auth_uid", authorIdsForBatch)
            : Promise.resolve({ data: [], error: null } as unknown as { data: ProfileRow[]; error: null }),
        ]);

        if (usersRes.error) throw usersRes.error;
        if (profilesRes.error) throw profilesRes.error;

        const authorNameById = new Map<string, string>();
        const authorDeptById = new Map<string, string>();
        const authorBatchById = new Map<string, string>();
        for (const row of (usersRes.data ?? []) as AuthorRow[]) {
          const id = row.auth_uid;
          if (typeof id !== "string") continue;

          if (typeof row.name === "string" && row.name.trim()) authorNameById.set(id, row.name);
          if (typeof row.department === "string" && row.department.trim()) authorDeptById.set(id, row.department);
          if (row.batch != null && String(row.batch).trim()) authorBatchById.set(id, String(row.batch));
        }

        const authorAvatarById = new Map<string, string>();
        for (const row of (profilesRes.data ?? []) as ProfileRow[]) {
          const id = row.auth_uid;
          const url = row.profile_picture_url;
          if (typeof id === "string" && typeof url === "string" && url.trim()) {
            authorAvatarById.set(id, url);
          }
        }

        // If some department values are numeric ids, resolve them to names
        const deptIds = new Set<string>();
        for (const dept of authorDeptById.values()) {
          if (dept && /^[0-9]+$/.test(String(dept).trim())) deptIds.add(String(dept).trim());
        }
        // Also resolve people-results later; we do dept resolution separately for people branch.
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
              if ((typeof id === "number" || typeof id === "string") && typeof name === "string") {
                nameById.set(String(id), name);
              }
            }
            for (const [authId, deptVal] of Array.from(authorDeptById.entries())) {
              const key = String(deptVal ?? "").trim();
              if (key && nameById.has(key)) authorDeptById.set(authId, nameById.get(key)!);
            }
          }
        }

        const baseById = new Map<string, BasePostResult>();
        for (const r of finalPosts) baseById.set(r.post_id, r);

        // Shared tag lookup (events + collab)
        const needsSkills = byType.event.length > 0 || byType.collab.length > 0;
        const [skillsRes, eventTagsRes, collabTagsRes] = await Promise.all([
          needsSkills
            ? supabase.from("skills_lookup").select("id,skill")
            : Promise.resolve({ data: [], error: null } as unknown as { data: SkillRow[]; error: null }),
          byType.event.length
            ? supabase.from("post_tags").select("post_id,skill_id").in("post_id", byType.event)
            : Promise.resolve({ data: [], error: null } as unknown as { data: PostTagRow[]; error: null }),
          byType.collab.length
            ? supabase.from("post_tags").select("post_id,skill_id").in("post_id", byType.collab)
            : Promise.resolve({ data: [], error: null } as unknown as { data: PostTagRow[]; error: null }),
        ]);

        if (skillsRes.error) throw skillsRes.error;
        if (eventTagsRes.error) throw eventTagsRes.error;
        if (collabTagsRes.error) throw collabTagsRes.error;

        const skillById = new Map<number, string>();
        for (const row of (skillsRes.data ?? []) as SkillRow[]) {
          if (typeof row.id === "number" && typeof row.skill === "string" && row.skill.trim()) {
            skillById.set(row.id, row.skill);
          }
        }

        const eventTagsByPostId = new Map<string, { skill_id: number; name: string }[]>();
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

        const [eventsRes, collabMetaRes, collabCatsRes, qnaRes, lfRes] = await Promise.all([
          byType.event.length
            ? supabase
                .from("event_posts")
                .select("post_id,location,event_start_date,event_end_date,img_url,events_category(category_name)")
                .in("post_id", byType.event)
            : Promise.resolve({ data: [], error: null } as unknown as { data: EventMetaRow[]; error: null }),
          byType.collab.length
            ? supabase.from("collab_posts").select("post_id,category_id").in("post_id", byType.collab)
            : Promise.resolve({ data: [], error: null } as unknown as { data: CollabMetaRow[]; error: null }),
          byType.collab.length
            ? supabase.from("collab_category").select("category_id,category")
            : Promise.resolve({ data: [], error: null } as unknown as { data: CollabCategoryRow[]; error: null }),
          byType.qna.length
            ? supabase
                .from("qna_posts")
                .select("post_id,img_url,qna_category(category_name)")
                .in("post_id", byType.qna)
            : Promise.resolve({ data: [], error: null } as unknown as { data: QnaMetaRow[]; error: null }),
          byType.lostfound.length
            ? supabase
                .from("lost_and_found_posts")
                .select("post_id,img_url")
                .in("post_id", byType.lostfound)
            : Promise.resolve({ data: [], error: null } as unknown as { data: LostFoundMetaRow[]; error: null }),
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
          if ((typeof id === "number" || typeof id === "string") && typeof cat === "string" && cat.trim()) {
            collabCategoryById.set(String(id), cat);
          }
        }

        const collabCategoryIdByPostId = new Map<string, string>();
        for (const row of (collabMetaRes.data ?? []) as CollabMetaRow[]) {
          const postId = row.post_id;
          const categoryId = row.category_id;
          if (typeof postId === "string" && (typeof categoryId === "number" || typeof categoryId === "string")) {
            collabCategoryIdByPostId.set(postId, String(categoryId));
          }
        }

        const lfImgByPostId = new Map<string, string | null>();
        for (const row of (lfRes.data ?? []) as LostFoundMetaRow[]) {
          const postId = row.post_id;
          if (typeof postId !== "string") continue;
          lfImgByPostId.set(postId, typeof row.img_url === "string" && row.img_url.trim() ? row.img_url : null);
        }

        const qnaByPostId = new Map<string, { category: QnaFeedPost["category"]; imgUrl: string | null }>();
        for (const row of (qnaRes.data ?? []) as QnaMetaRow[]) {
          const postId = row.post_id;
          if (typeof postId !== "string") continue;
          qnaByPostId.set(postId, {
            category: asQnaCategory(row.qna_category?.category_name ?? null),
            imgUrl: typeof row.img_url === "string" && row.img_url.trim() ? row.img_url : null,
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

          const catName = typeof row.events_category?.category_name === "string" ? row.events_category.category_name : "Events";

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
            comments: typeof base.comment_count === "number" ? base.comment_count : 0,
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
          const authorBatch = deptBatchLabel(authorDeptById.get(authorId), authorBatchById.get(authorId));

          const categoryId = collabCategoryIdByPostId.get(postId);
          const categoryRaw = categoryId ? collabCategoryById.get(categoryId) : null;
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
            comments: typeof base.comment_count === "number" ? base.comment_count : 0,
            createdAt: base.created_at ?? null,
          });
        }

        const qnaMap = new Map<string, QnaFeedPost>();
        for (const postId of byType.qna) {
          const base = baseById.get(postId);
          if (!base) continue;
          const authorId = base.author_id;
          const author = authorNameById.get(authorId) ?? "Unknown";
          const authorCourse = deptBatchLabel(authorDeptById.get(authorId), authorBatchById.get(authorId)) || "—";
          const qnaMeta = qnaByPostId.get(postId);

          qnaMap.set(postId, {
            id: postId,
            title: base.title,
            author,
            authorAvatar: null,
            authorAuthUid: authorId,
            authorCourse,
            content: base.description,
            category: qnaMeta?.category ?? "Question",
            tags: [],
            reactions: typeof base.like_count === "number" ? base.like_count : 0,
            comments: typeof base.comment_count === "number" ? base.comment_count : 0,
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
          const authorCourse = deptBatchLabel(authorDeptById.get(authorId), authorBatchById.get(authorId)) || "—";

          lostFoundMap.set(postId, {
            id: postId,
            title: base.title,
            author,
            authorCourse,
            authorAvatar: undefined,
            authorAuthUid: authorId,
            description: base.description,
            imageUrl: lfImgByPostId.get(postId) ?? undefined,
            reactions: typeof base.like_count === "number" ? base.like_count : 0,
            comments: typeof base.comment_count === "number" ? base.comment_count : 0,
            shares: 0,
            timestamp: formatRelativeTime(base.created_at ?? null),
          });
        }

        if (loadTokenRef.current !== token) return;
        setEventById(eventsMap);
        setCollabById(collabMap);
        setQnaById(qnaMap);
        setLostFoundById(lostFoundMap);
      }

      } catch (e) {
        console.error(e);
      } finally {
        if (loadTokenRef.current === token) {
          setLoading(false);
        }
      }
    };

    fetchData();
  }, [debouncedQ, tab]);

  // Helper to build correct URL
  const buildUrl = (p: { type: string; post_id: string }) => {
    const type = normalizePostType(p.type);
    if (type === "lostfound") return `/lost-and-found/${p.post_id}`;
    if (type === "event") return `/events/${p.post_id}`;
    if (type === "collab") return `/collab/${p.post_id}`;
    if (type === "qna") return `/qna/${p.post_id}`;
    return `/${String(type)}/${p.post_id}`;
  };

  return (
    <div className="p-10 w-full h-full bg-primary-lm lg:rounded-2xl lg:m-10">
      <h1 className="text-xl font-semibold font-header text-text-lm">Search Results for "{q}"</h1>

      {/* Tabs */}
      <div className="flex mt-4 border-b border-b-stroke-grey">
        <button
          className={`lg:p-2 cursor-pointer ${tab === "people" ? "border-b-2 border-accent-lm text-accent-lm bg-hover-lm" : "text-text-lighter-lm/80 hover:bg-stroke-grey transition"}`}
          onClick={() => setTab("people")}
        >
          People
        </button>
        <button
          className={`lg:p-2 cursor-pointer ${tab === "posts" ? "border-b-2 border-accent-lm text-accent-lm bg-hover-lm" : "text-text-lighter-lm/80 hover:bg-stroke-grey transition"}`}
          onClick={() => setTab("posts")}
        >
          Posts
        </button>
      </div>

      {loading && <div className="mt-4">Loading…</div>}

      {!loading && tab === "people" && (
        <div className="mt-4 space-y-2">
          {people.length === 0 && <div>No people found</div>}
          {people.map((u) => (
            <div
              key={u.auth_uid}
              className="block"
            >
              <div className="lg:p-2 hover:bg-hover-lm transition lg:rounded-lg">
                <UserInfo
                  userName={u.name}
                  userBatch={deptBatchLabel(u.department, u.batch)}
                  userId={u.auth_uid}
                  studentId={u.student_id ?? undefined}
                />
              </div>
              <hr className="border-stroke-grey lg:mt-2"></hr>
            </div>
          ))}
        </div>
      )}

      {!loading && tab === "posts" && (
        <div className="mt-4 flex flex-col lg:gap-5">
          {posts.length === 0 && <div>No posts found</div>}
          {posts.map((p) => {
            const t = normalizePostType(p.type);

            if (t === "event") {
              const post = eventById.get(p.post_id);
              if (!post) return null;
              return (
                <div key={p.post_id} className="lg:mb-4">
                  <EventPost
                    post={post}
                    onClick={() => navigate(buildUrl(p))}
                  />
                </div>
              );
            }

            if (t === "collab") {
              const post = collabById.get(p.post_id);
              if (!post) return null;
              return (
                <div key={p.post_id} className="lg:mb-4">
                  <CollabPostCard
                    post={post}
                    onClick={() => navigate(buildUrl(p))}
                  />
                </div>
              );
            }

            if (t === "qna") {
              const post = qnaById.get(p.post_id);
              if (!post) return null;
              return (
                <div key={p.post_id} className="lg:mb-4">
                  <QnaPostCard
                    post={post}
                    onOpenDetail={() => navigate(buildUrl(p))}
                    onLike={() => {
                      /* keep search results read-only */
                    }}
                    onAddInlineComment={() => {
                      /* keep search results read-only */
                    }}
                  />
                </div>
              );
            }

            if (t === "lostfound") {
              const post = lostFoundById.get(p.post_id);
              if (!post) return null;
              return (
                <div key={p.post_id} className="lg:mb-4">
                  <LFPostCard
                    post={post}
                    isLiked={false}
                    onToggleLike={() => {
                      /* keep search results read-only */
                    }}
                    onOpenComments={() => navigate(buildUrl(p))}
                    onEdit={() => navigate(buildUrl(p))}
                    onRemove={() => {
                      /* keep search results read-only */
                    }}
                  />
                </div>
              );
            }

            const url = buildUrl(p);
            return (
              <div key={p.post_id} className="lg:mb-4">
                <button
                  onClick={() => navigate(url)}
                  className="block p-3 border border-stroke-grey rounded-lg bg-secondary-lm hover:bg-hover-lm transition text-left w-full"
                >
                  <div className="text-xs text-text-lighter-lm">{p.type}</div>
                  <div className="font-semibold text-text-lm">{p.title}</div>
                  <div className="text-sm text-text-lighter-lm">{p.description}</div>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
