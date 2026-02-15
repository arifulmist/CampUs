import { useState, useRef, useEffect } from "react";
import type { Post } from "./types";
import { UserInfo } from "@/components/UserInfo";
import { LikeButton, CommentButton, ShareButton } from "../../../../components/PostButtons";
import { Textarea } from "../../../../components/ui/textarea";
import { Button } from "../../../../components/ui/button";
import { categoryStyles } from "./types";
import { formatPostTimestamp } from "./QAPageContent";

export default function PostCard({
  post,
  onOpenDetail,
  onLike,
  onAddInlineComment,
  onEdit,
  onDelete,
}: {
  post: Post;
  onOpenDetail: () => void;
  onLike: () => void;
  onAddInlineComment: (text: string) => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {

  const contentRef = useRef<HTMLDivElement | null>(null);
  const [collapsed, setCollapsed] = useState(true);
  const [showReadMore, setShowReadMore] = useState(false);
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [displayTime, setDisplayTime] = useState(formatPostTimestamp(post.createdAt));


  useEffect(() => {
    if (!contentRef.current) return;
    setShowReadMore(contentRef.current.scrollHeight > contentRef.current.clientHeight + 1);
  }, [post.content]);
  useEffect(() => {
  const interval = setInterval(() => {
    setDisplayTime(formatPostTimestamp(post.createdAt));
  }, 60000); // update every minute

  return () => clearInterval(interval);
}, [post.createdAt]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => !replying && onOpenDetail()}
      className="lg:relative bg-secondary-lm lg:p-8 lg:rounded-2xl border-2 border-stroke-grey hover:bg-hover-lm hover:border-stroke-peach lg:transition cursor-pointer lg:w-full lg:flex lg:flex-col lg:justify-between lg:min-h-56"
    >
      {/* Category */}
      <span className={`absolute top-4 right-4 px-3 py-1 font-semibold rounded-full border ${categoryStyles[post.category]}`}>
        {post.category}
      </span>
      <div className="absolute top-4 right-4 flex gap-2">
  {onEdit && (
    <button
      onClick={(e) => { e.stopPropagation(); onEdit(); }}
      className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
    >
      Edit
    </button>
  )}
  {onDelete && (
    <button
      onClick={(e) => { e.stopPropagation(); onDelete(); }}
      className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
    >
      Delete
    </button>
  )}
</div>

      {/* Author & Title */}
      <div>
        <UserInfo userImg={post.authorAvatar} userName={post.author} userBatch={post.authorCourse} />
         <p className="text-xs text-accent-lm lg:mt-2">{displayTime}</p>

        <h5 className="lg:font-[Poppins] lg:font-semibold text-text-lm lg:mt-2">{post.title}</h5>
      </div>
        <div className="lg:flex lg:gap-2 lg:flex-wrap lg:mt-3">
          {post.tags.map((tag) => (
            <span key={tag} className="lg:font-bold bg-[#C23D00] text-primary-lm lg:px-3 lg:py-1.5 lg:rounded-full text-sm">
              #{tag}
            </span>
          ))}
        </div>
      {/* Content */}
      <div className="lg:grow lg:mt-3">
        <div ref={contentRef} style={collapsed ? { maxHeight: "6rem", overflow: "hidden" } : {}} className="text-text-lighter-lm text-md lg:leading-relaxed">
          {post.content}
        </div>

        {showReadMore && (
            <button
                onClick={(e) => {
                e.stopPropagation();
                setCollapsed((c) => !c);
                if (collapsed) setReplying(true);
                }}
                className="text-accent-lm text-sm lg:font-medium lg:mt-1"
            >
                {collapsed ? "Read more" : "Show less"}
            </button>
            )}


            {post.imageUrl && (
            <div className="lg:mt-3">
                <img
                src={post.imageUrl}
                alt={post.title}
                className="rounded-md w-full object-cover"
                />
            </div>
            )}


       
      
      </div>

      {/* Actions */}
     <div className="lg:flex lg:gap-4 lg:items-center lg:mt-4">
  <button
    onClick={(e) => {
      e.stopPropagation();
      onLike();
    }}
    className={`flex items-center gap-1 ${post.likedByUser ? "text-accent-lm" : ""}`}
  >
    <LikeButton />
    <span className="text-sm text-text-lm">{post.reactions}</span>
  </button>

  <button
    onClick={(e) => {
      e.stopPropagation();
      onOpenDetail();
    }}
    className="flex items-center gap-1"
  >
    <CommentButton />
    <span className="text-sm text-text-lm">{post.comments}</span>
  </button>
</div>

      </div>
    
  );
}
