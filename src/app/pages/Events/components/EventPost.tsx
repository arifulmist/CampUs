// src/features/feed/components/EventPost.tsx
import React from "react";
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

  
  function formatRelativeTime(dateString?: string) {
    if (!dateString) return null;
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

 const formattedDate = formatRelativeTime(post.createdAt) ?? undefined;
  const deptBatch = `${post.dept ?? ""}-${post.batch ?? ""}`.trim();

  return (
    <article
      className="lg:rounded-xl lg:border border-stroke-grey bg-primary-lm lg:p-6 lg:shadow-sm"
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      aria-pressed={onClick ? false : undefined}
    >
      <PostBody
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
/>


     
    </article>
  );
}
