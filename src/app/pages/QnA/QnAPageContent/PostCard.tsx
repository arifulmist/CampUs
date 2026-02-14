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
}: {
  post: Post;
  onOpenDetail: () => void;
  onLike: () => void;
  onAddInlineComment: (text: string) => void;
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
      <div>
        <div className="lg:flex lg:gap-4 lg:items-center lg:mt-4">
          <button onClick={(e) => { e.stopPropagation(); onLike(); }}><LikeButton /></button>
          <button onClick={(e) => { e.stopPropagation(); onOpenDetail(); }}><CommentButton /></button>
          <button onClick={(e) => { e.stopPropagation(); alert("Share clicked"); }}><ShareButton /></button>
        </div>

       

        {!collapsed && (
          <div className="lg:mt-4 bg-secondary-lm lg:rounded-2xl lg:p-6 border-2 border-stroke-grey">
            {!replying ? (
              <button onClick={(e) => { e.stopPropagation(); setReplying(true); }} className="lg:w-full text-left lg:px-4 lg:py-3 text-text-lighter-lm text-sm hover:bg-hover-lm lg:rounded-lg lg:transition">Add a reply</button>
            ) : (
              <div className="lg:space-y-4">
                <Textarea placeholder="Add a reply..." value={replyText} onChange={(e) => setReplyText(e.target.value)} className="border-none bg-secondary-lm text-text-lm focus-visible:ring-0" />
                <div className="lg:flex lg:justify-end lg:gap-2">
                  <Button variant="ghost" onClick={() => { setReplying(false); setReplyText(""); }}>Cancel</Button>
                  <Button className="bg-accent-lm text-primary-lm" onClick={() => { onAddInlineComment(replyText); setReplyText(""); setReplying(false); }}>Comment</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
