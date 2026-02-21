import type { Category } from "./Category";
import React, { useEffect, useState } from "react";
import { PostBody } from "@/components/PostBody";
import userImg from "@/assets/images/placeholderUser.png";

export type CollabPost = {
  id: string;
  category: Category;
  title: string;
  content: string;
  authorAuthUid: string;
  authorName: string;
  authorBatch: string;
  authorAvatarUrl: string | null;
  tags: string[]; // tag names (without '#')
  likes: number;
  comments: number;
  createdAt?: string | null;
};

export function CollabPostCard({
  post,
  onClick,
  showPostTypeLabel,
}: {
  post: CollabPost;
  onClick?: () => void;
  showPostTypeLabel?: boolean;
}) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!onClick) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };

  const [formattedDate, setFormattedDate] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!post.createdAt) {
      setTimeout(() => setFormattedDate(undefined), 0);
      return;
    }

    const date = new Date(post.createdAt);
    const now = Date.now();
    const diffMs = now - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    let text: string;
    if (diffMinutes < 1) text = "just now";
    else if (diffMinutes < 60) text = `${diffMinutes} min ago`;
    else {
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) text = `${diffHours} hr ago`;
      else {
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 3) text = `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
        else
          text = date.toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          });
      }
    }

    setTimeout(() => setFormattedDate(text), 0);
  }, [post.createdAt]);

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
        initialLikeCount={post.likes}
        initialCommentCount={post.comments}
        categorySet={"collab"}
        postTypeLabel={showPostTypeLabel ? "Collab" : undefined}
        title={post.title}
        user={{
          name: post.authorName,
          batch: post.authorBatch ?? "",
          imgURL: post.authorAvatarUrl ?? userImg,
          userId: post.authorAuthUid,
        }}
        content={{
          text: post.content,
        }}
        tags={post.tags}
        category={post.category}
        deptBatch={post.authorBatch}
        formattedDate={formattedDate}
      />
    </article>
  );
}
