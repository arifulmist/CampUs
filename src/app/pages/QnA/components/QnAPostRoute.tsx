import { useEffect, useMemo, useRef, useState } from "react";

import { supabase } from "@/supabase/supabaseClient";
import { UserInfo } from "@/components/UserInfo";
import { CommentButton, LikeButton, ShareButton } from "@/components/PostButtons";

type QnAPostDetail = {
  id: string;
  title: string;
  description: string;
  category: "Question" | "Advice" | "Resource";
  createdAt: string;
  likeCount: number;
  commentCount: number;
  attachmentUrl: string | null;
  authorName: string;
  authorBatch: string;
  authorId: string | null;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function getRecord(obj: Record<string, unknown>, key: string): Record<string, unknown> | null {
  const v = obj[key];
  return isRecord(v) ? v : null;
}

function formatPostTimestamp(createdAt: string): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return "Posted just now";
  if (diffMinutes < 60) return `Posted ${diffMinutes} min ago`;
  if (diffHours < 24) return `Posted ${diffHours} hr ago`;
  if (diffDays < 7) return `Posted ${diffDays} days ago`;

  return `Posted on ${date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })}`;
}

export function QnAPostRoute({
  postId,
  onInitialLoadDone,
}: {
  postId: string;
  onInitialLoadDone?: () => void;
}) {
  const initialLoadNotifiedRef = useRef(false);
  const onInitialLoadDoneRef = useRef<typeof onInitialLoadDone>(onInitialLoadDone);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [detail, setDetail] = useState<QnAPostDetail | null>(null);

  useEffect(() => {
    onInitialLoadDoneRef.current = onInitialLoadDone;
  }, [onInitialLoadDone]);

  useEffect(() => {
    initialLoadNotifiedRef.current = false;
  }, [postId]);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const { data, error: fetchError } = await supabase
          .from("all_posts")
          .select(
            `
            post_id,
            title,
            description,
            like_count,
            comment_count,
            created_at,
            qna_posts!inner(
              img_url,
              qna_category(category_name)
            ),
            author:user_info!fk_author(
              name,
              auth_uid,
              batch,
              departments_lookup!inner(department_name)
            )
          `
          )
          .eq("post_id", postId)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (!alive) return;

        const row = data as unknown;
        if (!isRecord(row)) {
          setDetail(null);
          return;
        }

        const id = row.post_id;
        const title = row.title;
        const description = row.description;
        const createdAt = row.created_at;

        const qnaPosts = getRecord(row, "qna_posts");
        const qnaCategory = qnaPosts ? getRecord(qnaPosts, "qna_category") : null;
        const categoryName = qnaCategory?.category_name;
        const category: QnAPostDetail["category"] =
          categoryName === "Advice" || categoryName === "Resource" || categoryName === "Question"
            ? categoryName
            : "Question";

        const attachmentRaw = qnaPosts?.img_url;
        const attachmentUrl = typeof attachmentRaw === "string" && attachmentRaw.trim() ? attachmentRaw : null;

        const likeCountRaw = row.like_count;
        const commentCountRaw = row.comment_count;
        const likeCount = typeof likeCountRaw === "number" ? likeCountRaw : Number(likeCountRaw ?? 0);
        const commentCount = typeof commentCountRaw === "number" ? commentCountRaw : Number(commentCountRaw ?? 0);

        const author = getRecord(row, "author");
        const authorName = author?.name;
        const authorId = author?.auth_uid;
        const batch = author?.batch;
        const deptLookup = author ? getRecord(author, "departments_lookup") : null;
        const dept = deptLookup?.department_name;
        const authorBatch =
          typeof dept === "string" && dept.trim() && (typeof batch === "string" || typeof batch === "number")
            ? `${dept}-${String(batch)}`
            : "N/A";

        if (typeof id !== "string" || typeof title !== "string") {
          setDetail(null);
          return;
        }

        setDetail({
          id,
          title,
          description: typeof description === "string" ? description : "",
          category,
          createdAt: typeof createdAt === "string" ? createdAt : new Date().toISOString(),
          likeCount: Number.isFinite(likeCount) ? likeCount : 0,
          commentCount: Number.isFinite(commentCount) ? commentCount : 0,
          attachmentUrl,
          authorName: typeof authorName === "string" && authorName.trim() ? authorName : "Unknown",
          authorBatch,
          authorId: typeof authorId === "string" ? authorId : null,
        });
      } catch (e) {
        console.error(e);
        if (!alive) return;
        setError("Failed to load post");
        setDetail(null);
      } finally {
        if (alive) setLoading(false);
        if (alive && !initialLoadNotifiedRef.current) {
          initialLoadNotifiedRef.current = true;
          onInitialLoadDoneRef.current?.();
        }
      }
    }

    void load();
    return () => {
      alive = false;
    };
  }, [postId]);

  const postDate = useMemo(() => {
    if (!detail) return "";
    return formatPostTimestamp(detail.createdAt);
  }, [detail]);

  if (loading) {
    return (
      <div className="bg-primary-lm border border-stroke-grey lg:rounded-xl lg:p-10 flex flex-col gap-6 w-full">
        <p className="text-text-lighter-lm">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-primary-lm border border-stroke-grey lg:rounded-xl lg:p-10 flex flex-col gap-6 w-full">
        <p className="text-accent-lm">{error}</p>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="bg-primary-lm border border-stroke-grey lg:rounded-xl lg:p-10 flex flex-col gap-6 w-full">
        <p className="text-text-lighter-lm">Post not found.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:gap-4 bg-primary-lm border border-stroke-grey lg:rounded-xl lg:p-8">
      <p className="w-fit lg:px-2.5 lg:py-0.5 bg-hover-lm text-stroke-peach text-sm border border-stroke-peach rounded-xl">
        {detail.category}
      </p>

      <p className="font-header font-medium text-xl text-text-lm wrap-break-word">{detail.title}</p>

      <UserInfo
        userName={detail.authorName}
        userBatch={detail.authorBatch}
        userId={detail.authorId ?? undefined}
        postDate={postDate}
      />

      <p className="text-text-lm whitespace-pre-wrap wrap-break-word">{detail.description}</p>

      {detail.attachmentUrl ? (
        <div className="lg:mt-5 w-full h-full flex justify-center">
          <div className="rounded-xl overflow-hidden bg-primary-lm w-[80%] h-[30%]">
            <img src={detail.attachmentUrl} alt="Post attachment" className="w-full h-full object-cover" />
          </div>
        </div>
      ) : null}

      <div className="lg:flex lg:gap-3 lg:justify-start lg:mt-2">
        <LikeButton postId={detail.id} initialLikeCount={detail.likeCount} />
        <CommentButton postId={detail.id} initialCommentCount={detail.commentCount} />
        <ShareButton />
      </div>
    </div>
  );
}
