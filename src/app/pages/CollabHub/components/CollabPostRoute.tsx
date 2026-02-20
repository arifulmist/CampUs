import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabase/supabaseClient";
import { getCategoryClass } from "@/utils/categoryColors";
import { UserInfo } from "@/components/UserInfo";
import { CommentButton, InterestedButton, LikeButton, ShareButton } from "@/components/PostButtons";
import { toast } from "react-hot-toast";
import { LucideEllipsisVertical, LucidePencil, LucideTrash2 } from "lucide-react";

import { EditCollabModal } from "./EditCollabModal";
import { DeleteCollabModal } from "./DeleteCollabModal";
import type { CollabCategory } from "../backend/collab";

type CollabDetail = {
  postId: string;
  categoryId: string;
  category: CollabCategory;
  title: string;
  description: string;
  createdAt: string | null;
  authorId: string | null;
  authorStudentId: string | null;
  authorName: string;
  authorDeptBatch: string;
  authorProfilePictureUrl: string | null;
  tags: string[];
  tagObjects: Array<{ skill_id: number; name: string }>;
  likeCount: number;
  commentCount: number;
};

type UserInfoRow = {
  auth_uid: string;
  name: string | null;
  batch: number | string | null;
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

type CollabPostRow = {
  post_id: string;
  category_id: string;
};

type AllPostRow = {
  post_id: string;
  type: string;
  title: string | null;
  description: string | null;
  author_id: string | null;
  like_count: number | null;
  comment_count: number | null;
  created_at: string | null;
};

type CategoryRow = {
  category_id: string;
  category: CollabCategory;
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

export function CollabPostRoute({
  postId,
  onInitialLoadDone,
}: {
  postId: string;
  onInitialLoadDone?: () => void;
}) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<CollabDetail | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const menuRef = useRef<HTMLDivElement | null>(null);
  const initialLoadNotifiedRef = useRef(false);

  useEffect(() => {
    initialLoadNotifiedRef.current = false;
  }, [postId]);

  const isOwner = useMemo(() => {
    if (!detail?.authorId || !currentUserId) return false;
    return detail.authorId === currentUserId;
  }, [detail?.authorId, currentUserId]);

  useEffect(() => {
    if (!menuOpen) return;

    function onDocMouseDown(e: MouseEvent) {
      const target = e.target as Node | null;
      if (!menuRef.current) return;
      if (!target) return;
      if (!menuRef.current.contains(target)) setMenuOpen(false);
    }

    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [menuOpen]);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      try {
        const [authRes, postRes, collabRes, tagRes] = await Promise.all([
          supabase.auth.getUser(),
          supabase
            .from("all_posts")
            .select("post_id,type,title,description,author_id,like_count,comment_count,created_at")
            .eq("post_id", postId)
            .maybeSingle(),
          supabase.from("collab_posts").select("post_id,category_id").eq("post_id", postId).maybeSingle(),
          supabase.from("post_tags").select("skill_id").eq("post_id", postId),
        ]);

        if (!alive) return;

        const authUid = authRes.data.user?.id ?? null;
        setCurrentUserId(authUid);

        if (postRes.error) throw postRes.error;
        if (collabRes.error) throw collabRes.error;
        if (tagRes.error) throw tagRes.error;

        const postRow = (postRes.data as unknown as AllPostRow | null) ?? null;
        const collabRow = (collabRes.data as unknown as CollabPostRow | null) ?? null;

        if (!postRow || postRow.type !== "collab" || !collabRow) {
          setDetail(null);
          return;
        }

        const authorId = typeof postRow.author_id === "string" ? postRow.author_id : null;

        const [categoryRes, skillsRes] = await Promise.all([
          supabase.from("collab_category").select("category_id,category"),
          supabase.from("skills_lookup").select("id,skill"),
        ]);

        if (categoryRes.error) throw categoryRes.error;
        if (skillsRes.error) throw skillsRes.error;

        const categoryById = new Map<string, CollabCategory>();
        for (const row of (categoryRes.data ?? []) as unknown as CategoryRow[]) {
          if (row?.category_id && row?.category) categoryById.set(String(row.category_id), row.category);
        }

        const category = categoryById.get(String(collabRow.category_id));
        if (!category) {
          setDetail(null);
          return;
        }

        let userInfo: UserInfoRow | null = null;
        let profile: UserProfileRow | null = null;

        if (authorId) {
          const [userInfoRes, profileRes] = await Promise.all([
            supabase
              .from("user_info")
              .select("auth_uid,name,batch,department,student_id,departments_lookup(department_name)")
              .eq("auth_uid", authorId)
              .maybeSingle(),
            supabase.from("user_profile").select("profile_picture_url").eq("auth_uid", authorId).maybeSingle(),
          ]);
          if (userInfoRes.error) throw userInfoRes.error;
          if (profileRes.error) throw profileRes.error;
          userInfo = (userInfoRes.data as unknown as UserInfoRow | null) ?? null;
          profile = (profileRes.data as unknown as UserProfileRow | null) ?? null;
        }

        const deptName =
          (typeof userInfo?.departments_lookup?.department_name === "string" && userInfo.departments_lookup.department_name) ||
          (typeof userInfo?.department === "string" ? userInfo.department : "");

        const batchVal = userInfo?.batch;
        const batch = typeof batchVal === "number" ? String(batchVal) : typeof batchVal === "string" ? batchVal : "";
        const deptBatch = deptName && batch ? `${deptName}-${batch}` : deptName || "";

        const skillNameById = new Map<number, string>();
        for (const s of (skillsRes.data ?? []) as unknown as SkillRow[]) {
          if (typeof s?.id === "number" && typeof s?.skill === "string") skillNameById.set(s.id, s.skill);
        }

        const tagRows = (tagRes.data ?? []) as unknown as PostTagRow[];
        const tagObjects = tagRows
          .map((t) => ({
            skill_id: typeof t.skill_id === "number" ? t.skill_id : -1,
            name: typeof t.skill_id === "number" ? skillNameById.get(t.skill_id) ?? "" : "",
          }))
          .filter((t) => t.skill_id > 0 && t.name.trim());

        const likeCount = typeof postRow.like_count === "number" ? postRow.like_count : Number(postRow.like_count ?? 0);
        const commentCount =
          typeof postRow.comment_count === "number" ? postRow.comment_count : Number(postRow.comment_count ?? 0);

        setDetail({
          postId,
          categoryId: String(collabRow.category_id),
          category,
          title: String(postRow.title ?? ""),
          description: String(postRow.description ?? ""),
          createdAt: (typeof postRow.created_at === "string" || postRow.created_at === null) ? (postRow.created_at as string | null) : null,
          authorId,
          authorStudentId: typeof userInfo?.student_id === "string" ? userInfo.student_id : null,
          authorName: typeof userInfo?.name === "string" && userInfo.name.trim() ? userInfo.name : "Unknown",
          authorDeptBatch: deptBatch,
          authorProfilePictureUrl: profile?.profile_picture_url ?? null,
          tags: tagObjects.map((t) => t.name),
          tagObjects,
          likeCount,
          commentCount,
        });
      } catch (e) {
        console.error(e);
        toast.error("Failed to load collaboration post");
        setDetail(null);
      } finally {
        if (alive) {
          setLoading(false);
          if (!initialLoadNotifiedRef.current) {
            initialLoadNotifiedRef.current = true;
            onInitialLoadDone?.();
          }
        }
      }
    }

    void load();
    return () => {
      alive = false;
    };
  }, [postId, reloadToken]);

  if (loading) {
    return (
      <div className="bg-primary-lm border border-stroke-grey lg:rounded-2xl lg:p-10 flex flex-col gap-4 w-full">
        <p className="text-text-lighter-lm">Loading…</p>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="bg-primary-lm border border-stroke-grey lg:rounded-2xl lg:p-10 flex flex-col gap-4 w-full">
        <p className="text-text-lighter-lm">Post not found.</p>
      </div>
    );
  }

  return (
    <div className="lg:flex lg:flex-col lg:gap-3 bg-primary-lm border border-stroke-grey lg:p-8 lg:rounded-2xl lg:animate-slide-in mb-5">
      <div className="lg:mt-1 lg:mb-3 flex items-center justify-between">
        <p
          className={`inline-block px-4 py-1 rounded-full font-semibold text-text-lm text-base ${getCategoryClass(
            detail.category,
            "collab"
          )}`}
        >
          {detail.category}
        </p>

        {isOwner ? (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="p-2 rounded-md hover:bg-hover-lm transition duration-150"
              aria-label="Post options"
            >
              <LucideEllipsisVertical className="h-7 w-7 text-accent-lm" />
            </button>

            {menuOpen ? (
              <div className="absolute right-0 mt-2 bg-primary-lm border border-stroke-grey rounded-md overflow-hidden min-w-40">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setEditOpen(true);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-text-lm hover:bg-hover-lm transition duration-150 text-left"
                >
                  <LucidePencil className="h-4 w-4" />
                  Edit Post
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setDeleteOpen(true);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-danger-lm hover:bg-hover-lm transition duration-150 text-left"
                >
                  <LucideTrash2 className="h-4 w-4 text-danger-lm" />
                  Delete Post
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <h3 className="text-text-lm lg:font-extrabold lg:font-header">{detail.title}</h3>

      {detail.tags.length > 0 ? (
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
      ) : null}

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

      <div className="lg:flex lg:items-center lg:justify-between lg:mt-3">
        <div className="lg:flex lg:gap-3 lg:justify-start">
          <LikeButton postId={detail.postId} initialLikeCount={detail.likeCount} />
          <CommentButton postId={detail.postId} initialCommentCount={detail.commentCount} />
          <ShareButton />
        </div>
        <div>
          <InterestedButton postId={detail.postId} />
        </div>
      </div>

      <EditCollabModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        initial={{
          postId: detail.postId,
          title: detail.title,
          description: detail.description,
          category: detail.category,
          tags: detail.tagObjects,
        }}
        onSaved={() => setReloadToken((t) => t + 1)}
      />

      <DeleteCollabModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        postId={detail.postId}
        onDeleted={() => {
          setDeleteOpen(false);
          navigate("/collab", { replace: true });
        }}
      />
    </div>
  );
}

export default CollabPostRoute;
