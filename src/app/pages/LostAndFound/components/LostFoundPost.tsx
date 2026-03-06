import React, { useEffect, useState } from "react";
import { PostBody } from "@/components/PostBody";
import userImg from "@/assets/images/placeholderUser.png";
import { formatRelativeTime } from "@/utils/datetime";

export type LostFoundPostType = {
  id: string;
  category: "lost" | "found";
  title: string;
  author: string;
  authorAuthUid?: string;
  deptBatch?: string;
  body: string;
  image?: string | null;
  images?: string[];
  likes?: number;
  comments?: number;
  createdAt?: string | null;
  profilePictureUrl?: string | null;
  dateLostOrFound?: string | null;
  timeLostOrFound?: string | null;
};

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
          imgs: Array.isArray(post.images) ? post.images : undefined,
        }}
        category={post.category}
        formattedDate={formattedDate}
        lostFoundDate={post.dateLostOrFound ?? null}
        lostFoundTime={post.timeLostOrFound ?? null}
      />
    </article>
  );
}
