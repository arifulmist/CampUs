// src/features/feed/components/EventPost.tsx
import React, { useEffect, useState } from "react";
import { PostBody } from "@/components/PostBody";
import userImg from "@/assets/images/placeholderUser.png";

export type Segment = {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  location?: string;
};

export type EventPostType = {
  id: string;
  category: string;
  title: string;
  author: string;
  authorAuthUid?: string;
  dept?: string;       
  batch?: string;     
  excerpt?: string;
  body?: string;
  location?: string;          
  image?: string | null;
  eventStartDate?: string | null;
  eventEndDate?: string | null;
  segments?: Segment[];
  tags: { skill_id: number; name: string }[];
  likes?: number; 
  comments?: number;
  shares?: number;
  createdAt?: string;  
  profilePictureUrl?: string;
};

interface Props {
  post: EventPostType;
  onClick?: () => void; // optional click handler to open detail
}

export default function EventPost({ post, onClick }: Props) {
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
      // schedule state update to avoid synchronous setState inside effect
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
        else text = date.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
      }
    }

    // schedule to avoid synchronous setState inside effect
    setTimeout(() => setFormattedDate(text), 0);
  }, [post.createdAt]);
  const deptBatch = `${post.dept ?? ""}-${post.batch ?? ""}`.trim();

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
      categorySet={"events"}
      title={post.title}
  user={{
    name: post.author,
    batch: deptBatch,
    imgURL: post.profilePictureUrl ?? userImg,
    userId: post.authorAuthUid,
  }}
  content={{
    text: post.body ?? post.excerpt ?? "",
    img: post.image ?? undefined,
  }}
  tags={post.tags.map((tag) => tag.name)}
  category={post.category}
  deptBatch={deptBatch}
  formattedDate={formattedDate}
  eventStartDate={post.eventStartDate ?? post.segments?.[0]?.startDate}
  eventEndDate={post.eventEndDate ?? post.segments?.[0]?.endDate}
  location={post.location ?? null}
/>


     
    </article>
  );
}
