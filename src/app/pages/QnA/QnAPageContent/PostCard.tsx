import React, { useState, useRef, useEffect } from "react";
import type { Post } from "./types";
import { UserInfo } from "@/components/UserInfo";
import { Heart, MessageCircle } from "lucide-react";
import { formatPostTimestamp } from "./QAPageContent";
import { categoryStyles } from "./types";
export default function PostCard({
  post,
  isOwner,
  onOpenDetail,
  onLike,
  onAddInlineComment,
}: {
  post: Post;
  isOwner: boolean;
  onOpenDetail: () => void;
  onLike: () => void;
  onAddInlineComment: (text: string) => void;
}) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [collapsed, setCollapsed] = useState(true);
  const [showReadMore, setShowReadMore] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [displayTime, setDisplayTime] = useState(formatPostTimestamp(post.createdAt));

  // Check if content overflows
  useEffect(() => {
    if (!contentRef.current) return;
    setShowReadMore(contentRef.current.scrollHeight > contentRef.current.clientHeight + 1);
  }, [post.content]);

  // Update timestamp every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayTime(formatPostTimestamp(post.createdAt));
    }, 60000);
    return () => clearInterval(interval);
  }, [post.createdAt]);

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onAddInlineComment(commentText);
    setCommentText("");
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenDetail()}
      className="lg:relative bg-secondary-lm lg:p-8 lg:rounded-2xl border-2 border-stroke-grey hover:bg-hover-lm hover:border-stroke-peach lg:transition cursor-pointer lg:w-full lg:flex lg:flex-col lg:justify-between lg:min-h-56"
    >
      <div className="flex items-center gap-3 mb-2">
        <span
          className={`px-3 py-1 font-semibold rounded-full border ${categoryStyles[post.category]} text-sm`}
        >
        
          {post.category}
        </span>
        </div>
        <UserInfo
          userImg={post.authorAvatar}
          userName={post.author}
          userBatch={post.authorCourse}
        />
        <span className="text-medium text-accent-lm">{displayTime}</span>
      
   
      {/* Title & Content */}
      <h3 className="font-extrabold text-2xl mb-1">{post.title}</h3>
      <div
        ref={contentRef}
        style={collapsed ? { maxHeight: "6rem", overflow: "hidden" } : {}}
        className="text-text-lighter-lm text-md lg:leading-relaxed mb-2"
      >
        {post.content}
      </div>
      {showReadMore && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setCollapsed((c) => !c);
          }}
          className="text-accent-lm text-sm lg:font-medium mb-2"
        >
          {collapsed ? "Read more" : "Show less"}
        </button>
      )}

      {post.imageUrl && (
        <img src={post.imageUrl} alt={post.title} className="w-full rounded-lg mb-2" />
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-2">
        {post.tags.map((tag) => (
          <span
            key={tag}
            className="text-s px-2 py-1 bg-accent-lm rounded-full text-background-lm"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Like & Comment Buttons */}
      <div className="flex items-center gap-4 mb-2 text-xs text-text-lighter-lm">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLike();
          }}
          className={`flex items-center gap-1 ${post.likedByUser ? "text-red-500" : "hover:text-accent-lm"}`}
        >
          <Heart size={16} />
          {post.reactions}
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetail();
          }}
          className="flex items-center gap-1 hover:text-accent-lm"
        >
          <MessageCircle size={16} />
          {post.comments}
        </button>
      </div>

      {/* Inline Comment */}
      <form onSubmit={handleCommentSubmit} className="flex gap-2 mt-2">
        <input
          type="text"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 border border-stroke-grey rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-lm"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-accent-lm text-background-lm rounded-lg hover:bg-hover-btn-lm"
        >
          Add
        </button>
      </form>
    </div>
  );
}
