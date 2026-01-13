import { useState } from "react";
import type { ChangeEvent } from "react";
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Share2,
  MoreVertical,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type Comment = {
  id: string;
  author: string;
  avatar: string;
  course: string;
  content: string;
  likes: number;
  replies?: Comment[];
  timestamp: string;
};

type Post = {
  id: string;
  title: string;
  author: string;
  authorAvatar: string;
  authorCourse: string;
  content: string;
  category: string;
  reactions: number;
  commentsCount: number;
  shares: number;
};

interface PostDetailProps {
  post: Post;
  onBack: () => void;
}

function generateId(prefix = "") {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function PostDetail({ post, onBack }: PostDetailProps) {
  const [commentText, setCommentText] = useState("");
  const [isReplying, setIsReplying] = useState(false);

  const [comments, setComments] = useState<Comment[]>([
    {
      id: "c1",
      author: "Hasan Mahmud",
      avatar: "/placeholder.svg?key=h1",
      course: "CSE-22",
      content: "Hi ! thank you for your post",
      likes: 5,
      timestamp: "1h ago",
      replies: [
        {
          id: "c2",
          author: "Dulal Mia",
          avatar: "/placeholder.svg?key=d1",
          course: "NSE-18",
          content: "Wow!",
          likes: 3,
          timestamp: "30m ago",
        },
      ],
    },
    {
      id: "c3",
      author: "Thon Thon Thuy",
      avatar: "/placeholder.svg?key=t1",
      course: "CSE-22",
      content: "Cool Post!",
      likes: 8,
      timestamp: "15m ago",
    },
  ]);

  // add top-level comment
  function addTopLevelComment() {
    const txt = commentText.trim();
    if (!txt) return;

    const newComment: Comment = {
      id: generateId("c_"),
      author: "Alvi Binte Zamil",
      avatar: "/placeholder.svg?key=h1",
      course: "CSE-23",
      content: txt,
      likes: 0,
      replies: [],
      timestamp: "Just now",
    };

    setComments((prev) => [newComment, ...prev]);
    setCommentText("");
    setIsReplying(false);
  }

  // recursive helper to add reply to tree
  function addReplyToTree(list: Comment[], parentId: string, reply: Comment): Comment[] {
    return list.map((c) => {
      if (c.id === parentId) {
        const nextReplies = c.replies ? [...c.replies, reply] : [reply];
        return { ...c, replies: nextReplies };
      }
      if (c.replies && c.replies.length > 0) {
        return { ...c, replies: addReplyToTree(c.replies, parentId, reply) };
      }
      return c;
    });
  }

  function handleAddReply(parentId: string, text: string) {
    const txt = text.trim();
    if (!txt) return;
    const reply: Comment = {
      id: generateId("r_"),
      author: "Alvi Binte Zamil",
      avatar: "/placeholder.svg?key=h1",
      course: "CSE-23",
      content: txt,
      likes: 0,
      replies: [],
      timestamp: "Just now",
    };
    setComments((prev) => addReplyToTree(prev, parentId, reply));
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-accent-lm hover:opacity-80 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="text-sm font-medium">Go Back</span>
      </button>

      {/* Main Post Card */}
      <div className="bg-primary-lm rounded-xl p-6 shadow-sm border border-stroke-grey animate-slide-in">
        <div className="flex items-start justify-between mb-4">
          <Badge
            variant="secondary"
            className="bg-secondary-lm text-accent-lm border-stroke-peach px-3 py-1"
          >
            {post.category}
          </Badge>
          <button className="text-accent-lm hover:opacity-80">
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>

        <h1 className="text-2xl font-bold text-text-lm mb-4">{post.title}</h1>

        <div className="flex items-center gap-3 mb-4">
          <Avatar className="h-10 w-10 border border-stroke-grey">
            <AvatarImage src={post.authorAvatar || "/placeholder.svg"} />
            <AvatarFallback>{post.author[0]}</AvatarFallback>
          </Avatar>
          <div>
            <div className="text-sm font-bold text-accent-lm">
              {post.author}
            </div>
            <div className="text-xs text-text-lighter-lm font-medium">
              {post.authorCourse}
            </div>
          </div>
        </div>

        <p className="text-text-lm leading-relaxed mb-6">{post.content}</p>

        <div className="flex items-center gap-4 pt-4 border-t border-stroke-grey">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary-lm text-accent-lm hover:bg-hover-lm transition-colors">
            <Heart className="h-4 w-4" />
            <span className="text-sm font-bold">{post.reactions}</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary-lm text-accent-lm hover:bg-hover-lm transition-colors">
            <MessageCircle className="h-4 w-4" />
            <span className="text-sm font-bold">{post.commentsCount}</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary-lm text-accent-lm hover:bg-hover-lm transition-colors">
            <Share2 className="h-4 w-4" />
            <span className="text-sm font-bold">{post.shares}</span>
          </button>
        </div>
      </div>

      {/* Add Reply Section */}
      <div className="bg-primary-lm rounded-xl p-4 shadow-sm border border-stroke-grey">
        {!isReplying ? (
          <button
            onClick={() => setIsReplying(true)}
            className="w-full text-left px-4 py-3 text-text-lighter-lm text-sm hover:bg-hover-lm rounded-lg transition-colors"
          >
            Add a reply
          </button>
        ) : (
          <div className="space-y-4">
            <Textarea
              placeholder="Add a reply..."
              value={commentText}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                setCommentText(e.target.value)
              }
              className="min-h-25 border-none focus-visible:ring-0 p-0 text-sm bg-primary-lm text-text-lm placeholder:text-text-lighter-lm"
            />
            <div className="flex items-center justify-between pt-2 border-t border-stroke-grey">
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsReplying(false)}
                  className="text-text-lm"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-accent-lm hover:bg-hover-btn-lm text-primary-lm px-4"
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
      <div className="bg-primary-lm rounded-xl p-6 shadow-sm border border-stroke-grey">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-sm font-medium text-text-lighter-lm">
            Sort by:
            <button className="text-accent-lm flex items-center gap-1">
              Best <span className="text-[10px]">▼</span>
            </button>
          </div>
        </div>

        <div className="space-y-8">
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} onAddReply={handleAddReply} />
          ))}
        </div>
      </div>
    </div>
  );
}

function CommentItem({
  comment,
  isReply = false,
  onAddReply,
}: {
  comment: Comment;
  isReply?: boolean;
  onAddReply: (parentId: string, text: string) => void;
}) {
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");

  function submitReply() {
    const txt = replyText.trim();
    if (!txt) return;
    onAddReply(comment.id, txt);
    setReplyText("");
    setReplying(false);
  }

  return (
    <div className="relative animate-slide-in">
      <div className="flex gap-3">
        <div className="relative flex flex-col items-center">
          <Avatar className="h-8 w-8 z-10 border-2 border-primary-lm">
            <AvatarImage src={comment.avatar || "/placeholder.svg"} />
            <AvatarFallback>{comment.author[0]}</AvatarFallback>
          </Avatar>
          {!isReply && comment.replies && comment.replies.length > 0 && (
            <div className="absolute top-8 bottom-0 w-0.5 bg-stroke-grey left-1/2 -translate-x-1/2" />
          )}
        </div>
        <div className="flex-1 pb-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-bold text-text-lm">
              {comment.author}
            </span>
            <span className="text-[10px] text-text-lighter-lm font-medium px-1.5 py-0.5 bg-secondary-lm rounded">
              {comment.course}
            </span>
          </div>
          <p className="text-sm text-text-lm mb-2 leading-snug">
            {comment.content}
          </p>
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-1 text-[11px] font-bold text-text-lighter-lm hover:text-accent-lm">
              <Heart className="h-3 w-3" />
              {comment.likes}
            </button>
            <button
              className="text-[11px] font-bold text-accent-lm hover:underline"
              onClick={() => setReplying((r) => !r)}
            >
              Reply
            </button>
          </div>
        </div>
      </div>

      {/* Reply form for this comment */}
      {replying && (
        <div className="ml-4 mt-4 space-y-3">
          <Textarea
            placeholder={`Reply to ${comment.author}...`}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            className="min-h-20 border-none focus-visible:ring-0 p-0 text-sm bg-primary-lm text-text-lm placeholder:text-text-lighter-lm"
          />
          <div className="flex items-center justify-end gap-2">
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
            <Button size="sm" className="bg-accent-lm hover:bg-hover-btn-lm text-primary-lm px-4" onClick={submitReply}>
              Comment
            </Button>
          </div>
        </div>
      )}

      {/* Nested Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-4 mt-4 space-y-4 border-l-2 border-stroke-grey pl-6">
          {comment.replies.map((reply) => (
            <CommentItem key={reply.id} comment={reply} isReply onAddReply={onAddReply} />
          ))}
        </div>
      )}
    </div>
  );
}

export default PostDetail;
