import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { Navigate } from "react-router-dom";

import { LikeButton, CommentButton, ShareButton } from "@/components/PostButtons";
import { UserInfo } from "@/components/UserInfo";
import { supabase } from "../../../../../supabase/supabaseClient";

type EventPostsRow = {
  post_id: string;
  img_url: string | null;
  all_posts: {
    post_id: string;
    title: string;
    description: string;
    author_id: string;
    like_count: number | null;
    comment_count: number | null;
    created_at: string | null;
  } | null;
  events_category: {
    category_name: string;
  } | null;
};

type UserInfoRow = {
  auth_uid: string;
  name: string | null;
  batch: number | null;
  department: string | null;
  student_id: string | null;
  departments_lookup?: {
    department_name: string | null;
  } | null;
};

type UserProfileRow = {
  profile_picture_url: string | null;
};

type PostTagRow = {
  skill_id: number | null;
};

type SkillRow = {
  id: number;
  skill: string;
};

type DepartmentRow = {
  dept_id: string;
  department_name: string;
};

type EventDetail = {
  postId: string;
  category: string;
  title: string;
  description: string;
  createdAt: string | null;
  authorId: string | null;
  authorStudentId: string | null;
  authorName: string;
  authorDeptBatch: string;
  authorProfilePictureUrl: string | null;
  tags: string[];
  imageUrl: string | null;
  likeCount: number;
  commentCount: number;
};

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

export function EventPostRoute({ postId }: { postId: string }) {
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<EventDetail | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      try {
        const { data: ev, error: evError } = await supabase
          .from("event_posts")
          .select(
            `
            post_id,
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
          .eq("post_id", postId)
          .maybeSingle();

        if (evError) throw evError;

        const eventRow = (ev as unknown as EventPostsRow | null) ?? null;
        if (!eventRow || !eventRow.all_posts) {
          if (!alive) return;
          setDetail(null);
          return;
        }

        const authorId: string | null = eventRow.all_posts.author_id ?? null;

        const [authorInfoRes, authorProfileRes, tagsRes, skillsRes, departmentsRes] =
          await Promise.all([
            authorId
              ? supabase
                  .from("user_info")
                  .select("auth_uid,name,batch,department,student_id,departments_lookup(department_name)")
                  .eq("auth_uid", authorId)
                  .maybeSingle()
              : Promise.resolve({ data: null as UserInfoRow | null, error: null as unknown }),
            authorId
              ? supabase
                  .from("user_profile")
                  .select("profile_picture_url")
                  .eq("auth_uid", authorId)
                  .maybeSingle()
              : Promise.resolve({ data: null as UserProfileRow | null, error: null as unknown }),
            supabase.from("post_tags").select("skill_id").eq("post_id", postId),
            supabase.from("skills_lookup").select("id, skill"),
            supabase.from("departments_lookup").select("dept_id, department_name"),
          ]);

        if (authorInfoRes.error) throw authorInfoRes.error;
        if (authorProfileRes.error) throw authorProfileRes.error;
        if (tagsRes.error) throw tagsRes.error;
        if (skillsRes.error) throw skillsRes.error;
        if (departmentsRes.error) throw departmentsRes.error;

        const userInfo = (authorInfoRes.data as unknown as UserInfoRow | null) ?? null;
        const departments = (departmentsRes.data as unknown as DepartmentRow[] | null) ?? [];

        const deptName =
          userInfo?.departments_lookup?.department_name ??
          (userInfo?.department
            ? departments.find((d) => d.dept_id === userInfo.department)?.department_name ?? null
            : null);

        const authorName = userInfo?.name ?? "Unknown";
        const batch = userInfo?.batch;
        const deptPart = (deptName ?? userInfo?.department ?? "").trim();
        const batchPart = batch !== null && batch !== undefined ? String(batch) : "";
        const authorDeptBatch = [deptPart, batchPart].filter((x) => x).join("-");

        const skillById = new Map<number, string>();
        const skills = (skillsRes.data as unknown as SkillRow[] | null) ?? [];
        for (const s of skills) {
          if (typeof s.id === "number" && typeof s.skill === "string") {
            skillById.set(s.id, s.skill);
          }
        }

        const tagRows = (tagsRes.data as unknown as PostTagRow[] | null) ?? [];
        const tags = tagRows
          .map((t) => (typeof t.skill_id === "number" ? skillById.get(t.skill_id) : null))
          .filter((x): x is string => typeof x === "string" && x.trim().length > 0);

        const authorProfile =
          (authorProfileRes.data as unknown as UserProfileRow | null) ?? null;

        const d: EventDetail = {
          postId,
          category: eventRow.events_category?.category_name ?? "Uncategorized",
          title: eventRow.all_posts.title ?? "Untitled",
          description: eventRow.all_posts.description ?? "",
          createdAt: eventRow.all_posts.created_at ?? null,
          authorId,
          authorStudentId: userInfo?.student_id ?? null,
          authorName,
          authorDeptBatch,
          authorProfilePictureUrl: authorProfile?.profile_picture_url ?? null,
          tags,
          imageUrl: typeof eventRow.img_url === "string" ? eventRow.img_url : null,
          likeCount: Number(eventRow.all_posts.like_count ?? 0),
          commentCount: Number(eventRow.all_posts.comment_count ?? 0),
        };

        if (!alive) return;
        setDetail(d);
      } catch (e) {
        console.error(e);
        if (!alive) return;
        toast.error("Failed to load event post");
        setDetail(null);
      } finally {
        if (alive) setLoading(false);
      }
    }

    void load();
    return () => {
      alive = false;
    };
  }, [postId]);

  if (loading) {
    return (
      <div className="lg:flex lg:flex-col lg:gap-3 bg-primary-lm border border-stroke-grey lg:p-8 lg:rounded-2xl mb-5">
        <p className="text-text-lighter-lm">Loading…</p>
      </div>
    );
  }

  if (!detail) {
    return <Navigate to="/404" replace />;
  }

  return (
    <div className="lg:flex lg:flex-col lg:gap-3 bg-primary-lm border border-stroke-grey lg:p-8 lg:rounded-2xl lg:animate-slide-in mb-5">
      <div className="lg:mt-1 lg:mb-3">
        <p className="inline-block px-4 py-1 rounded-full font-semibold text-text-lm text-base">
          {detail.category}
        </p>
      </div>

      <h3 className="text-text-lm lg:font-extrabold lg:font-header">{detail.title}</h3>

      {detail.tags.length > 0 && (
        <div className="lg:flex lg:gap-2 lg:flex-wrap lg:mt-2">
          {detail.tags.map((t) => (
            <p
              key={t}
              className="lg:border border-accent-lm text-accent-lm lg:rounded-full lg:px-3 lg:py-1 text-sm"
            >
              #{t}
            </p>
          ))}
        </div>
      )}

      <div className="lg:items-center lg:justify-between lg:mt-2">
        <UserInfo
          userName={detail.authorName}
          userBatch={detail.authorDeptBatch}
          userImg={detail.authorProfilePictureUrl ?? undefined}
          postDate={formatRelativeTime(detail.createdAt)}
          userId={detail.authorId ?? undefined}
          studentId={detail.authorStudentId ?? undefined}
        />
      </div>

      <p className="mt-2 text-text-lm whitespace-pre-wrap">{detail.description}</p>

      {detail.imageUrl ? (
        <div className="lg:w-full lg:h-120 lg:overflow-hidden lg:mt-4">
          <img
            src={detail.imageUrl}
            alt="event post"
            className="lg:object-cover lg:object-center lg:w-full lg:h-full lg:rounded-lg"
          />
        </div>
      ) : null}

      <div className="lg:flex lg:gap-3 lg:justify-start lg:mt-3">
        <LikeButton postId={detail.postId} initialLikeCount={detail.likeCount} />
        <CommentButton postId={detail.postId} initialCommentCount={detail.commentCount} />
        <ShareButton />
      </div>
    </div>
  );
}