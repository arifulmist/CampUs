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
    <div className="lg:space-y-6 lg:animate-fade-in">
      <button
        onClick={onBack}
        className="lg:flex lg:items-center lg:gap-2 text-accent-lm hover:opacity-80 lg:transition-colors"
      >
        <ArrowLeft className="lg:h-4 lg:w-4" />
        <span className="text-sm lg:font-medium">Go Back</span>
      </button>

      {/* Main Post Card */}
      <div className="bg-primary-lm lg:rounded-xl lg:p-6 lg:shadow-sm lg:border border-stroke-grey lg:animate-slide-in">
        <div className="lg:flex lg:items-start lg:justify-between lg:mb-4">
          <Badge
            variant="secondary"
            className="bg-secondary-lm text-accent-lm border-stroke-peach lg:px-3 lg:py-1"
          >
            {post.category}
          </Badge>
          <button className="text-accent-lm hover:opacity-80">
            <MoreVertical className="lg:h-5 lg:w-5" />
          </button>
        </div>

        <h1 className="text-2xl lg:font-bold text-text-lm lg:mb-4">{post.title}</h1>

        <div className="lg:flex lg:items-center lg:gap-3 lg:mb-4">
          <Avatar className="lg:h-10 lg:w-10 lg:border border-stroke-grey">
            <AvatarImage src={post.authorAvatar || "/placeholder.svg"} />
            <AvatarFallback>{post.author[0]}</AvatarFallback>
          </Avatar>
          <div>
            <div className="text-sm lg:font-bold text-accent-lm">
              {post.author}
            </div>
            <div className="text-xs text-text-lighter-lm lg:font-medium">
              {post.authorCourse}
            </div>
          </div>
        </div>

        <p className="text-text-lm lg:leading-relaxed lg:mb-6">{post.content}</p>

        <div className="lg:flex lg:items-center lg:gap-4 lg:pt-4 border-t border-stroke-grey">
          <button className="lg:flex lg:items-center lg:gap-2 lg:px-4 lg:py-2 lg:rounded-lg bg-secondary-lm text-accent-lm hover:bg-hover-lm lg:transition-colors">
            <Heart className="lg:h-4 lg:w-4" />
            <span className="text-sm lg:font-bold">{post.reactions}</span>
          </button>
          <button className="lg:flex lg:items-center lg:gap-2 lg:px-4 lg:py-2 lg:rounded-lg bg-secondary-lm text-accent-lm hover:bg-hover-lm lg:transition-colors">
            <MessageCircle className="lg:h-4 lg:w-4" />
            <span className="text-sm lg:font-bold">{post.commentsCount}</span>
          </button>
          <button className="lg:flex lg:items-center lg:gap-2 lg:px-4 lg:py-2 lg:rounded-lg bg-secondary-lm text-accent-lm hover:bg-hover-lm lg:transition-colors">
            <Share2 className="lg:h-4 lg:w-4" />
            <span className="text-sm lg:font-bold">{post.shares}</span>
          </button>
        </div>
      </div>

      {/* Add Reply Section */}
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
              value={commentText}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                setCommentText(e.target.value)
              }
              className="lg:min-h-25 border-none focus-visible:ring-0 lg:p-0 text-sm bg-primary-lm text-text-lm placeholder:text-text-lighter-lm"
            />
            <div className="lg:flex lg:items-center lg:justify-between lg:pt-2 border-t border-stroke-grey">
              <div className="lg:flex lg:gap-2">
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
            <span className="text-sm lg:font-bold text-text-lm">
              {comment.author}
            </span>
            <span className="text-[10px] text-text-lighter-lm lg:font-medium lg:px-1.5 lg:py-0.5 bg-secondary-lm lg:rounded">
              {comment.course}
            </span>
          </div>
          <p className="text-sm text-text-lm lg:mb-2 lg:leading-snug">
            {comment.content}
          </p>
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
          {comment.replies.map((reply) => (
            <CommentItem key={reply.id} comment={reply} isReply onAddReply={onAddReply} />
          ))}
        </div>
      )}
    </div>
  );
}

export default PostDetail;
