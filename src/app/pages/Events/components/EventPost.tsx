// src/features/feed/components/EventPost.tsx
import React from "react";
import { PostBody } from "@/components/PostBody";
import userImg from "@/assets/images/placeholderUser.png";
// don't render buttons here — PostBody already renders the Like/Comment/Share components
// if ShareModal is used by your ShareButton internally, it will open from there

export type Segment = {
  id: string;
  name?: string;
  description?: string;
  date?: string;
  time?: string;
};

export type EventPostType = {
  id: string;
  category: string;
  title: string;
  author: string;
  dept?: string;
  excerpt?: string;
  body?: string;
  image?: string | null;
  segments?: Segment[];
  tags?: string[];
};

interface Props {
  post: EventPostType;
  onClick?: () => void; // optional click handler to open detail
}

export default function EventPost({ post, onClick }: Props) {
  // make the whole article clickable but preserve keyboard accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!onClick) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };

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
          batch: post.dept ?? "",
          imgURL: userImg,
        }}
        content={{
          text: post.body ?? post.excerpt ?? "",
          img: post.image ?? undefined,
        }}
        tags={post.tags}
        category={post.category}
      />
    </article>
  );
}
