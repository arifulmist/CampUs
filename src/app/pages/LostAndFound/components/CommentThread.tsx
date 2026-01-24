// src/components/CommentThread.tsx
import React, { useState } from "react";
import { Heart } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export type Comment = {
  id: string;
  author: string;
  avatar?: string;
  course?: string;
  content: string;
  likes: number;
  replies?: Comment[];
  timestamp: string;
};

function generateId(prefix = "") {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2);
}

interface Props {
  initialComments?: Comment[];
  currentUser?: { name: string; avatar?: string; course?: string };
  // optional callback when comments change
  onChange?: (comments: Comment[]) => void;
}

export default function CommentThread({
  initialComments = [],
  currentUser = { name: "Alvi Binte Zamil", avatar: "/placeholder.svg", course: "CSE-23" },
  onChange,
}: Props) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [isReplying, setIsReplying] = useState(false);
  const [topCommentText, setTopCommentText] = useState("");

  function pushComments(next: Comment[]) {
    setComments(next);
    onChange?.(next);
  }

  // add a top-level comment
  function addTopLevelComment() {
    const text = topCommentText.trim();
    if (!text) return;
    const c: Comment = {
      id: generateId("c_"),
      author: currentUser.name,
      avatar: currentUser.avatar,
      course: currentUser.course,
      content: text,
      likes: 0,
      replies: [],
      timestamp: "Just now",
    };
    // add to top (newest first)
    pushComments([c, ...comments]);
    setTopCommentText("");
    setIsReplying(false);
  }

  // add reply to comment with given id (recursive)
  function addReply(parentId: string, replyText: string) {
    const text = replyText.trim();
    if (!text) return;

    const reply: Comment = {
      id: generateId("r_"),
      author: currentUser.name,
      avatar: currentUser.avatar,
      course: currentUser.course,
      content: text,
      likes: 0,
      replies: [],
      timestamp: "Just now",
    };

    function addReplyToTree(list: Comment[]): Comment[] {
      return list.map((c) => {
        if (c.id === parentId) {
          const nextReplies = c.replies ? [...c.replies, reply] : [reply];
          return { ...c, replies: nextReplies };
        }
        if (c.replies && c.replies.length > 0) {
          return { ...c, replies: addReplyToTree(c.replies) };
        }
        return c;
      });
    }

    pushComments(addReplyToTree(comments));
  }

  return (
    <div className="lg:space-y-6">
      {/* Add Reply Section (top-level) */}
      <div className="bg-primary-lm lg:rounded-xl lg:p-4 lg:shadow-sm lg:border border-stroke-grey">
        {!isReplying ? (
          <button
            onClick={() => setIsReplying(true)}
            className="lg:w-full text-left lg:px-4 lg:py-3 text-text-lighter-lm text-sm hover:bg-hover-lm lg:rounded-lg lg:transition-colors"
          >
            Add a reply
          </button>
        ) : (
          <div className="lg:space-y-4">
            <Textarea
              placeholder="Add a reply..."
              value={topCommentText}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setTopCommentText(e.target.value)
              }
              className="lg:min-h-25 border-none focus-visible:ring-0 lg:p-0 text-sm bg-primary-lm text-text-lm placeholder:text-text-lighter-lm"
            />
            <div className="lg:flex lg:items-center lg:justify-between lg:pt-2 border-t border-stroke-grey">
              <span className="text-xs text-text-lighter-lm lg:italic">
                Replying as {currentUser.name}
              </span>
              <div className="lg:flex lg:gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsReplying(false);
                    setTopCommentText("");
                  }}
                  className="text-text-lm"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-accent-lm hover:bg-hover-btn-lm text-primary-lm lg:px-4"
                  onClick={addTopLevelComment}
                >
                  Comment
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Comments List */}
      <div className="bg-primary-lm lg:rounded-xl lg:p-6 lg:shadow-sm lg:border border-stroke-grey">
        <div className="lg:flex lg:items-center lg:justify-between lg:mb-6">
          <div className="lg:flex lg:items-center lg:gap-2 text-sm lg:font-medium text-text-lighter-lm">
            Sort by:
            <button className="text-accent-lm lg:flex lg:items-center lg:gap-1">
              Best <span className="text-[10px]">▼</span>
            </button>
          </div>
        </div>

        <div className="lg:space-y-8">
          {comments.map((c) => (
            <CommentNode key={c.id} comment={c} onReply={addReply} />
          ))}
        </div>
      </div>
    </div>
  );
}

function CommentNode({
  comment,
  onReply,
  isReply = false,
}: {
  comment: Comment;
  onReply: (parentId: string, text: string) => void;
  isReply?: boolean;
}) {
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");

  function submitReply() {
    const txt = replyText.trim();
    if (!txt) return;
    onReply(comment.id, txt);
    setReplyText("");
    setReplying(false);
  }

  return (
    <div className="lg:relative lg:animate-slide-in">
      <div className="lg:flex lg:gap-3">
        <div className="lg:relative lg:flex lg:flex-col lg:items-center">
          <Avatar className="lg:h-8 lg:w-8 lg:z-10 border-2 border-primary-lm">
            <AvatarImage src={comment.avatar || "/placeholder.svg"} />
            <AvatarFallback>{comment.author[0]}</AvatarFallback>
          </Avatar>
          {!isReply && comment.replies && comment.replies.length > 0 && (
            <div className="lg:absolute lg:top-8 lg:bottom-0 lg:w-0.5 bg-stroke-grey lg:left-1/2 lg:-translate-x-1/2" />
          )}
        </div>

        <div className="lg:flex-1 lg:pb-2">
          <div className="lg:flex lg:items-center lg:gap-2 lg:mb-1">
            <span className="text-sm lg:font-bold text-text-lm">{comment.author}</span>
            <span className="text-[10px] text-text-lighter-lm lg:font-medium lg:px-1.5 lg:py-0.5 bg-secondary-lm lg:rounded">
              {comment.course}
            </span>
          </div>

          <p className="text-sm text-text-lm lg:mb-2 lg:leading-snug">{comment.content}</p>

          <div className="lg:flex lg:items-center lg:gap-4">
            <button className="lg:flex lg:items-center lg:gap-1 text-[11px] lg:font-bold text-text-lighter-lm hover:text-accent-lm">
              <Heart className="lg:h-3 lg:w-3" />
              {comment.likes}
            </button>

            <button
              className="text-[11px] lg:font-bold text-accent-lm hover:underline"
              onClick={() => setReplying((r) => !r)}
            >
              Reply
            </button>
          </div>
        </div>
      </div>

      {/* Reply form for this comment */}
      {replying && (
        <div className="lg:ml-4 lg:mt-4 lg:space-y-3">
          <Textarea
            placeholder={`Reply to ${comment.author}...`}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            className="lg:min-h-20 border-none focus-visible:ring-0 lg:p-0 text-sm bg-primary-lm text-text-lm placeholder:text-text-lighter-lm"
          />
          <div className="lg:flex lg:items-center lg:justify-end lg:gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setReplying(false);
                setReplyText("");
              }}
            >
              Cancel
            </Button>
            <Button size="sm" className="bg-accent-lm hover:bg-hover-btn-lm text-primary-lm lg:px-4" onClick={submitReply}>
              Comment
            </Button>
          </div>
        </div>
      )}

      {/* Nested Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="lg:ml-4 lg:mt-4 lg:space-y-4 border-l-2 border-stroke-grey lg:pl-6">
          {comment.replies.map((r) => (
            <CommentNode key={r.id} comment={r} onReply={onReply} isReply />
          ))}
        </div>
      )}
    </div>
  );
}
