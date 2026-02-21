import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

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
import {
  EllipsisVertical as LucideEllipsisVertical,
  Pencil as LucidePencil,
  Trash2 as LucideTrash2,
} from "lucide-react";

import { CommentButton, InterestedButton, LikeButton, ShareButton } from "@/components/PostButtons";
import { UserInfo } from "@/components/UserInfo";
import { getCategoryClass } from "@/utils/categoryColors";
import { formatDateToLocale, formatRelativeTime, isSameDay } from "@/utils/datetime";
import { EventSegment } from "./EventSegment";
import { supabase } from "@/supabase/supabaseClient";
import { EditEventModal } from "./EditEventModal";
import { DeleteEventModal } from "./DeleteEventModal";
import ImagePreview from "@/components/ImagePreview";

type EventPostsRow = {
  post_id: string;
  location: string | null;
  event_start_date: string | null;
  event_end_date: string | null;
  registration_link: string | null;
  category_id: number | null;
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
    category_id?: number;
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
  categoryId: number;
  category: string;
  title: string;
  description: string;
  location: string;
  eventStartDate: string;
  eventEndDate: string;
  registrationLink: string | null;
  createdAt: string | null;
  authorId: string | null;
  authorStudentId: string | null;
  authorName: string;
  authorDeptBatch: string;
  authorProfilePictureUrl: string | null;
  tags: string[];
  tagObjects: Array<{ skill_id: number; name: string }>;
  imageUrl: string | null;
  likeCount: number;
  commentCount: number;
  segments?: Array<{
    id: string;
    name: string;
    description: string;
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    location?: string | null;
  }>;
};

function toTimeInputValue(value: unknown): string {
  if (typeof value !== "string") return "";
  const m = value.match(/^(\d{2}:\d{2})/);
  if (m) return m[1];
  return value.length >= 5 ? value.slice(0, 5) : value;
}

function formatDateDisplay(dateString?: string | null) {
  return formatDateToLocale(dateString, "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}



export function EventPostRoute({
  postId,
  onInitialLoadDone,
}: {
  postId: string;
  onInitialLoadDone?: () => void;
}) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<EventDetail | null>(null);
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

        const { data: ev, error: evError } = await supabase
          .from("event_posts")
          .select(
            `
            post_id,
            location,
            event_start_date,
            event_end_date,
            registration_link,
            category_id,
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
              category_id,
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

        const [authorInfoRes, authorProfileRes, tagsRes, skillsRes, segmentsRes, departmentsRes] =
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
            supabase.from("event_segment").select(`
              segment_id,
              segment_title,
              segment_description,
              segment_start_date,
              segment_end_date,
              segment_start_time,
              segment_end_time,
              segment_location
            `).eq("post_id", postId),
            supabase.from("departments_lookup").select("dept_id, department_name"),
          ]);

        if (authorInfoRes.error) throw authorInfoRes.error;
        if (authorProfileRes.error) throw authorProfileRes.error;
        if (tagsRes.error) throw tagsRes.error;
        if (skillsRes.error) throw skillsRes.error;
        if (segmentsRes && segmentsRes.error) throw segmentsRes.error;
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
        const tagObjects = tagRows
          .map((t) => {
            const id = typeof t.skill_id === "number" ? t.skill_id : null;
            if (!id) return null;
            const name = skillById.get(id) ?? "";
            if (!name.trim()) return null;
            return { skill_id: id, name };
          })
          .filter((x): x is { skill_id: number; name: string } => !!x);
        const tags = tagObjects.map((t) => t.name);

        const authorProfile =
          (authorProfileRes.data as unknown as UserProfileRow | null) ?? null;

        const d: EventDetail = {
          postId,
          categoryId: Number(eventRow.category_id ?? eventRow.events_category?.category_id ?? 0),
          category: eventRow.events_category?.category_name ?? "Uncategorized",
          title: eventRow.all_posts.title ?? "Untitled",
          description: eventRow.all_posts.description ?? "",
          location: eventRow.location ?? "",
          eventStartDate: eventRow.event_start_date ?? "",
          eventEndDate: eventRow.event_end_date ?? "",
          registrationLink: eventRow.registration_link ?? null,
          createdAt: eventRow.all_posts.created_at ?? null,
          authorId,
          authorStudentId: userInfo?.student_id ?? null,
          authorName,
          authorDeptBatch,
          authorProfilePictureUrl: authorProfile?.profile_picture_url ?? null,
          tags,
          tagObjects,
          imageUrl: typeof eventRow.img_url === "string" ? eventRow.img_url : null,
          likeCount: Number(eventRow.all_posts.like_count ?? 0),
          commentCount: Number(eventRow.all_posts.comment_count ?? 0),
          segments: [],
        };

        const segRows =
          ((segmentsRes.data as unknown as
            | Array<{
                segment_id: string;
                segment_title: string;
                segment_description: string;
                segment_start_date: string;
                segment_end_date: string;
                segment_start_time: string;
                segment_end_time: string;
                segment_location: string | null;
              }>
            | null) ?? []) as Array<{
            segment_id: string;
            segment_title: string;
            segment_description: string;
            segment_start_date: string;
            segment_end_date: string;
            segment_start_time: string;
            segment_end_time: string;
            segment_location: string | null;
          }>;

        d.segments = segRows.map((s) => ({
          id: s.segment_id,
          name: s.segment_title,
          description: s.segment_description,
          startDate: s.segment_start_date,
          endDate: s.segment_end_date,
          startTime: toTimeInputValue(s.segment_start_time),
          endTime: toTimeInputValue(s.segment_end_time),
          location: s.segment_location,
        }));

        if (!alive) return;
        setCurrentUserId(uid);
        setDetail(d);
      } catch (e) {
        console.error(e);
        if (!alive) return;
        toast.error("Failed to load event post");
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
      <div className="lg:flex lg:flex-col lg:gap-3 bg-primary-lm border border-stroke-grey lg:p-8 lg:rounded-2xl mb-5">
        <p className="text-text-lighter-lm">Loading…</p>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="lg:flex lg:flex-col lg:gap-6 lg:h-full lg:w-full lg:p-10 lg:animate-fade-in">
        <div className="bg-primary-lm border border-stroke-grey lg:rounded-xl lg:p-10 flex flex-col gap-6 w-full">
          <p className="text-text-lighter-lm">Event not found or you do not have access to view it.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="lg:flex lg:flex-col lg:gap-3 bg-primary-lm border border-stroke-grey lg:p-8 lg:rounded-2xl lg:animate-slide-in mb-5">
      <div className="lg:mt-1 lg:mb-3 flex items-center justify-between">
        <p
          className={`inline-block px-4 py-1 rounded-full font-semibold text-text-lm text-base ${getCategoryClass(detail.category, "events")}`}
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
      {(detail.eventStartDate || detail.eventEndDate || detail.location) && (
        <div className="mt-2">
          {(detail.eventStartDate || detail.eventEndDate) && (
            <p className="text-accent-lm font-semibold text-md">
              {detail.eventStartDate && detail.eventEndDate && isSameDay(detail.eventStartDate, detail.eventEndDate)
                ? formatDateDisplay(detail.eventStartDate)
                : (
                    <>
                      {detail.eventStartDate ? formatDateDisplay(detail.eventStartDate) : ""}
                      {detail.eventStartDate && detail.eventEndDate ? " \u2014 " : ""}
                      {detail.eventEndDate ? formatDateDisplay(detail.eventEndDate) : ""}
                    </>
                  )}
            </p>
          )}

          {detail.location ? (
            <p className="text-text-lm font-semibold text-md mt-1">{detail.location}</p>
          ) : null}
        </div>
      )}

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

      {detail.segments && detail.segments.length > 0 && (
        <div className="flex flex-col lg:gap-3 lg:mt-4 lg:mb-3">
          {detail.segments.map((seg) => (
            <div key={seg.id} className="lg:rounded-lg">
              <EventSegment
                segmentTitle={seg.name}
                segmentDescription={seg.description}
                segmentStartDate={seg.startDate}
                segmentEndDate={seg.endDate}
                segmentStartTime={seg.startTime}
                segmentEndTime={seg.endTime}
                segmentLocation={seg.location ?? undefined}
              />
            </div>
          ))}
        </div>
      )}

      {detail.imageUrl ? (
        <div className="lg:w-full lg:h-120 lg:overflow-hidden lg:mt-4">
          <button type="button" onClick={() => openPreview(detail.imageUrl, undefined)} className="w-full h-full block">
            <img
              src={detail.imageUrl}
              alt="event post"
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
        <EditEventModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          initial={{
            postId: detail.postId,
            title: detail.title,
            description: detail.description,
            location: detail.location,
            categoryId: detail.categoryId,
            eventStartDate: detail.eventStartDate,
            eventEndDate: detail.eventEndDate,
            imageUrl: detail.imageUrl,
            segments: (detail.segments ?? []).map((s) => ({
              id: s.id,
              name: s.name,
              description: s.description,
              startDate: s.startDate,
              endDate: s.endDate,
              startTime: s.startTime,
              endTime: s.endTime,
              location: s.location ?? undefined,
            })),
            tags: detail.tagObjects,
          }}
          onSaved={() => {
            setReloadToken((t) => t + 1);
          }}
        />
      </LocalErrorBoundary>

      <LocalErrorBoundary>
        <DeleteEventModal
          open={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          postId={detail.postId}
          onDeleted={() => {
            setDeleteOpen(false);
            navigate("/events", { replace: true });
          }}
        />
      </LocalErrorBoundary>
    </div>
  );
}