import React, { useEffect, useState } from "react";
import { PostBody } from "@/components/PostBody";
import userImg from "@/assets/images/placeholderUser.png";

export type LostFoundPostType = {
  id: string;
  category: "lost" | "found";
  title: string;
  author: string;
  authorAuthUid?: string;
  deptBatch?: string;
  body: string;
  image?: string | null;
  likes?: number;
  comments?: number;
  createdAt?: string | null;
  profilePictureUrl?: string | null;
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

export default function LostFoundPost({ post, onClick }: { post: LostFoundPostType; onClick?: () => void }) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!onClick) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };

  const [formattedDate, setFormattedDate] = useState<string | undefined>(undefined);

  useEffect(() => {
    const text = post.createdAt ? formatRelativeTime(post.createdAt) : undefined;
    setTimeout(() => setFormattedDate(text), 0);
  }, [post.createdAt]);

  const deptBatch = `${post.deptBatch ?? ""}`.trim();

  return (
    <article
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      aria-pressed={onClick ? false : undefined}
    >
      <PostBody
        postId={post.id}
        initialLikeCount={typeof post.likes === "number" ? post.likes : undefined}
        initialCommentCount={typeof post.comments === "number" ? post.comments : undefined}
        categorySet={"lostfound"}
        title={post.title}
        user={{
          name: post.author,
          batch: deptBatch,
          imgURL: post.profilePictureUrl ?? userImg,
          userId: post.authorAuthUid,
        }}
        content={{
          text: post.body ?? "",
          img: post.image ?? undefined,
        }}
        category={post.category}
        formattedDate={formattedDate}
      />
    </article>
  );
}
