import { useEffect, useRef, useState } from "react";
import { UserInfo } from "@/components/UserInfo";
import { LikeButton, CommentButton, ShareButton } from "@/components/PostButtons";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export type QnaFeedPost = {
  id: string;
  title: string;
  author: string;
  authorAvatar?: string | null;
  authorAuthUid?: string;
  authorCourse: string;
  content: string;
  category: "Question" | "Advice" | "Resource";
  tags: string[];
  reactions: number;
  comments: number;
  shares: number;
  timestamp: string;
  imageUrl?: string | null; // ✅ support image
};

const categoryStyles = {
  Question: "bg-secondary-lm text-accent-lm border-stroke-peach",
  Advice: "bg-secondary-lm text-accent-lm border-stroke-peach",
  Resource: "bg-secondary-lm text-accent-lm border-stroke-peach",
} as const;

export function QnaPostCard({
  post,
  onOpenDetail,
  onLike,
  onAddInlineComment,
}: {
  post: QnaFeedPost;
  onOpenDetail: () => void;
  onLike: () => void;
  onAddInlineComment: (text: string) => void;
}) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [collapsed, setCollapsed] = useState(true);
  const [showReadMore, setShowReadMore] = useState(false);
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    setShowReadMore(el.scrollHeight > el.clientHeight + 1);
  }, [post.content]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        if (!replying) onOpenDetail();
      }}
      className="lg:relative bg-secondary-lm lg:p-8 lg:rounded-2xl border-2 border-stroke-grey hover:bg-hover-lm hover:border-stroke-peach lg:transition cursor-pointer lg:w-full lg:box-border lg:min-h-56 lg:flex lg:flex-col lg:justify-between"
    >
      {/* Category badge */}
      <span
        className={
          "absolute top-4 right-4 px-3 py-1 font-semibold rounded-full border " +
          categoryStyles[post.category]
        }
      >
        {post.category}
      </span>

      <div>
        {/* Author info */}
        <UserInfo
          userImg={post.authorAvatar ?? null}
          userName={post.author}
          userBatch={post.authorCourse}
          userId={post.authorAuthUid}
        />

        <h5 className="lg:font-[Poppins] lg:font-semibold text-text-lm lg:mt-2">
          {post.title}
        </h5>
      </div>

      {/* Image */}
      {post.imageUrl && (
        <img
          src={post.imageUrl + "?t=" + new Date().getTime()} // ✅ cache-busting
          alt="Post"
          className="lg:w-full lg:max-h-60 lg:object-cover lg:rounded-lg lg:my-4"
        />
      )}

      {/* Content */}
      <div className="lg:grow lg:mt-3">
        <div
          ref={contentRef}
          className="text-text-lighter-lm text-md lg:leading-relaxed"
          style={collapsed ? { maxHeight: "6rem", overflow: "hidden" } : {}}
        >
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

        {/* Tags */}
        <div className="lg:flex lg:gap-2 lg:flex-wrap lg:mt-3">
          <span className="lg:font-bold bg-[#C23D00] text-primary-lm lg:px-3 lg:py-1.5 lg:rounded-full text-sm">
            #{post.category}
          </span>
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="lg:font-bold bg-[#C23D00] text-primary-lm lg:px-3 lg:py-1.5 lg:rounded-full text-sm"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div>
        <div className="lg:flex lg:gap-4 lg:items-center lg:mt-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLike();
            }}
          >
            <LikeButton />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetail();
            }}
          >
            <CommentButton />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              alert("Share clicked");
            }}
          >
            <ShareButton />
          </button>
        </div>

        <p className="text-xs text-text-lighter-lm lg:mt-2">{post.timestamp}</p>

        {/* Inline comment box */}
        {!collapsed && (
          <div className="lg:mt-4 bg-secondary-lm lg:rounded-2xl lg:p-6 border-2 border-stroke-grey">
            {!replying ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setReplying(true);
                }}
                className="lg:w-full text-left lg:px-4 lg:py-3 text-text-lighter-lm text-sm hover:bg-hover-lm lg:rounded-lg lg:transition"
              >
                Add a reply
              </button>
            ) : (
              <div className="lg:space-y-4">
                <Textarea
                  placeholder="Add a reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="border-none bg-secondary-lm text-text-lm focus-visible:ring-0"
                />
                <div className="lg:flex lg:justify-end lg:gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setReplying(false);
                      setReplyText("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="bg-accent-lm text-primary-lm"
                    onClick={() => {
                      onAddInlineComment(replyText);
                      setReplyText("");
                      setReplying(false);
                    }}
                  >
                    Comment
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
