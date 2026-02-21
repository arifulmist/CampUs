import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

import {
  EllipsisVertical as LucideEllipsisVertical,
  Pencil as LucidePencil,
  Trash2 as LucideTrash2,
} from "lucide-react";

import { CommentButton, InterestedButton, LikeButton, ShareButton } from "@/components/PostButtons";
import { UserInfo } from "@/components/UserInfo";
import { getCategoryClass } from "@/utils/categoryColors";
import { supabase } from "@/supabase/supabaseClient";

import { EditLostFoundModal } from "./EditLostFoundModal";
import { DeleteLostFoundModal } from "./DeleteLostFoundModal";
import ImagePreview from "@/components/ImagePreview";

class LocalErrorBoundary extends React.Component<
  { children?: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: unknown) {
    console.error("LocalErrorBoundary caught:", err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-primary-lm border border-stroke-grey rounded-lg p-4">
          <p className="text-text-lighter-lm">Something went wrong loading this panel.</p>
        </div>
      );
    }
    return this.props.children ?? null;
  }
}

type AllPostRow = {
  post_id: string;
  title: string;
  description: string;
  author_id: string | null;
  like_count: number | null;
  comment_count: number | null;
  created_at: string | null;
};

type LFRow = {
  post_id: string;
  date_lost_or_found: string | null;
  time_lost_or_found: string | null;
  img_url: string | null;
  category: string | null;
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

type DepartmentRow = {
  dept_id: string;
  department_name: string;
};

type Detail = {
  postId: string;
  category: "lost" | "found";
  title: string;
  description: string;
  createdAt: string | null;
  authorId: string | null;
  authorStudentId: string | null;
  authorName: string;
  authorDeptBatch: string;
  authorProfilePictureUrl: string | null;
  likeCount: number;
  commentCount: number;
  imageUrl: string | null;
  dateLostOrFound: string | null;
  timeLostOrFound: string | null;
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

function formatDateDisplay(dateString?: string | null) {
  if (!dateString) return "";
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return String(dateString);
  }
}

function formatTimeDisplay(timeString?: string | null) {
  if (!timeString) return "";
  try {
    const parts = String(timeString).split(":");
    const h = parseInt(parts[0] ?? "0", 10) || 0;
    const m = (parts[1] ?? "00").padStart(2, "0");
    const suffix = h >= 12 ? "PM" : "AM";
    let hour12 = h % 12;
    if (hour12 === 0) hour12 = 12;
    return `${hour12}:${m} ${suffix}`;
  } catch {
    return String(timeString);
  }
}

export function LostFoundPostRoute({
  postId,
  onInitialLoadDone,
}: {
  postId: string;
  onInitialLoadDone?: () => void;
}) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string | null>(null);

  const openPreview = (src: string | null, name?: string) => {
    if (!src) return;
    setPreviewSrc(src);
    setPreviewName(name ?? null);
    setPreviewOpen(true);
  };

  const closePreview = () => {
    setPreviewOpen(false);
    setPreviewSrc(null);
    setPreviewName(null);
  };

  const menuRef = useRef<HTMLDivElement | null>(null);
  const initialLoadNotifiedRef = useRef(false);
  const onInitialLoadDoneRef = useRef(onInitialLoadDone);

  useEffect(() => {
    onInitialLoadDoneRef.current = onInitialLoadDone;
  }, [onInitialLoadDone]);

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
      if (!target) return;
      if (menuRef.current && menuRef.current.contains(target)) return;
      setMenuOpen(false);
    }

    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [menuOpen]);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      try {
        const { data: authData } = await supabase.auth.getUser();
        const uid = authData?.user?.id ?? null;

        const [allRes, lfResTry1] = await Promise.all([
          supabase
            .from("all_posts")
            .select("post_id,title,description,author_id,like_count,comment_count,created_at")
            .eq("post_id", postId)
            .maybeSingle(),
          supabase
            .from("lost_and_found_posts")
            .select("post_id,date_lost_or_found,time_lost_or_found,img_url,category")
            .eq("post_id", postId)
            .maybeSingle(),
        ]);

        if (allRes.error) throw allRes.error;

        // tolerate missing category column / RLS on lost_and_found_posts
        let lf: LFRow | null = null;
        if (!lfResTry1.error) {
          lf = (lfResTry1.data as unknown as LFRow | null) ?? null;
        } else {
          const lfResTry2 = await supabase
            .from("lost_and_found_posts")
            .select("post_id,date_lost_or_found,time_lost_or_found,img_url")
            .eq("post_id", postId)
            .maybeSingle();
          if (lfResTry2.error) {
            console.warn("LostFoundPostRoute: failed loading lost_and_found_posts", lfResTry1.error);
            lf = null;
          } else {
            lf = (lfResTry2.data as unknown as LFRow | null) ?? null;
          }
        }

        const all = (allRes.data as unknown as AllPostRow | null) ?? null;

        if (!all) {
          if (!alive) return;
          setDetail(null);
          return;
        }

        const authorId: string | null = all.author_id ?? null;

        const [authorInfoRes, authorProfileRes, departmentsRes] = await Promise.all([
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
          supabase.from("departments_lookup").select("dept_id, department_name"),
        ]);

        if (authorInfoRes.error) throw authorInfoRes.error;
        if (authorProfileRes.error) throw authorProfileRes.error;
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

        const authorProfile = (authorProfileRes.data as unknown as UserProfileRow | null) ?? null;

        const cat = (lf?.category ? String(lf.category) : "lost").toLowerCase() === "found" ? "found" : "lost";

        const d: Detail = {
          postId,
          category: cat,
          title: all.title ?? "Untitled",
          description: all.description ?? "",
          createdAt: all.created_at ?? null,
          authorId,
          authorStudentId: userInfo?.student_id ?? null,
          authorName,
          authorDeptBatch,
          authorProfilePictureUrl: authorProfile?.profile_picture_url ?? null,
          likeCount: Number(all.like_count ?? 0),
          commentCount: Number(all.comment_count ?? 0),
          imageUrl: typeof lf?.img_url === "string" ? lf.img_url : null,
          dateLostOrFound: lf?.date_lost_or_found ?? null,
          timeLostOrFound: lf?.time_lost_or_found ?? null,
        };

        if (!alive) return;
        setCurrentUserId(uid);
        setDetail(d);
      } catch (e) {
        console.error(e);
        if (!alive) return;
        toast.error("Failed to load lost & found post");
        setDetail(null);
      } finally {
        if (alive) {
          setLoading(false);
          if (!initialLoadNotifiedRef.current) {
            initialLoadNotifiedRef.current = true;
            onInitialLoadDoneRef.current?.();
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
      <div className="lg:flex lg:flex-col lg:gap-3 bg-primary-lm border border-stroke-grey lg:p-8 lg:rounded-2xl mb-5">
        <p className="text-text-lighter-lm">Loading…</p>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="lg:flex lg:flex-col lg:gap-6 lg:h-full lg:w-full lg:p-10 lg:animate-fade-in">
        <div className="bg-primary-lm border border-stroke-grey lg:rounded-xl lg:p-10 flex flex-col gap-6 w-full">
          <p className="text-text-lighter-lm">Post not found or you do not have access to view it.</p>
        </div>
      </div>
    );
  }

  const categoryLabel = detail.category.charAt(0).toUpperCase() + detail.category.slice(1);

  return (
    <div className="lg:flex lg:flex-col lg:gap-3 bg-primary-lm border border-stroke-grey lg:p-8 lg:rounded-2xl lg:animate-slide-in mb-5">
      <div className="lg:mt-1 lg:mb-3 flex items-center justify-between">
        <p
          className={`inline-block px-4 py-1 rounded-full font-semibold text-text-lm text-base ${getCategoryClass(detail.category, "lostfound")}`}
        >
          {categoryLabel}
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

      {(detail.dateLostOrFound || detail.timeLostOrFound) && (
        <div className="mt-2">
          {detail.dateLostOrFound ? (
            <p className="text-accent-lm font-semibold text-md">
              {detail.category === "lost" ? "Date Lost: " : "Date Found: "}
              {formatDateDisplay(detail.dateLostOrFound)}
            </p>
          ) : null}
          {detail.timeLostOrFound ? (
            <p className="text-text-lm font-semibold text-md mt-1">
              {detail.category === "lost" ? "Time Lost: " : "Time Found: "}
              {formatTimeDisplay(detail.timeLostOrFound)}
            </p>
          ) : null}
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
          <button type="button" onClick={() => openPreview(detail.imageUrl, undefined)} className="w-full h-full block">
            <img
              src={detail.imageUrl}
              alt="lost and found post"
              className="lg:object-contain lg:w-full lg:h-full lg:rounded-lg"
            />
          </button>
        </div>
      ) : null}

      {previewOpen && previewSrc ? (
        <ImagePreview src={previewSrc} filename={previewName ?? undefined} onClose={closePreview} />
      ) : null}

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

      <LocalErrorBoundary>
        <EditLostFoundModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          initial={{
            postId: detail.postId,
            category: detail.category,
            title: detail.title,
            description: detail.description,
            dateLostOrFound: detail.dateLostOrFound,
            timeLostOrFound: detail.timeLostOrFound,
            imageUrl: detail.imageUrl,
          }}
          onSaved={() => {
            setReloadToken((t) => t + 1);
          }}
        />
      </LocalErrorBoundary>

      <LocalErrorBoundary>
        <DeleteLostFoundModal
          open={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          postId={detail.postId}
          onDeleted={() => {
            setDeleteOpen(false);
            navigate("/lost-and-found", { replace: true });
          }}
        />
      </LocalErrorBoundary>
    </div>
  );
}
