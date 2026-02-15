// src/app/pages/Events/components/EventPostDetail.tsx
import React, { useEffect, useState } from "react";
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

import {
  fetchCommentsByPost,
  buildCommentsTree,
  addComment,
  changeCommentLikeCount,
  getCurrentUserProfile,
} from "@/app/pages/Events/backend/commentsService";

import type { CommentNode } from "@/app/pages/Events/backend/commentsService";


type Segment = {
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
  tags: { skill_id: number; name: string }[];
  likes?: number;
  comments?: number;
  shares?: number;
};

interface Props {
  post: EventPostType;
  onBack: () => void;
}

function generateId(prefix = "") {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2);
}

type LocalComment = {
  id: string;
  author: string;
  avatar: string | null;
  course: string | null;
  content: string;
  likes: number;
  replies?: LocalComment[];
  timestamp: string | null;
};

export default function EventPostDetail({ post, onBack }: Props) {
  const [commentText, setCommentText] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [comments, setComments] = useState<LocalComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ auth_uid: string; name?: string | null } | null>(null);

  const catClassMap: Record<string, string> = {
    workshop: "bg-red-100 text-red-700 border border-red-200",
    seminar: "bg-green-100 text-green-700 border border-green-200",
    course: "bg-blue-100 text-blue-700 border border-blue-200",
    competition: "bg-purple-100 text-purple-700 border border-purple-200",
  };

  const normalizedCategory = (post.category || "").toString().toLowerCase();
  const catLabel = post.category
    ? post.category.charAt(0).toUpperCase() + post.category.slice(1)
    : "";

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const rows = await fetchCommentsByPost(post.id);
        const tree = buildCommentsTree(rows);
        const mapped = tree.map(mapNodeToLocal);
        if (mounted) setComments(mapped);
      } catch (err) {
        console.error("Failed to load comments", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();

    (async () => {
      try {
        const profile = await getCurrentUserProfile();
        if (profile) setCurrentUser({ auth_uid: profile.auth_uid, name: profile.name ?? undefined });
      } catch (err) {
        // ignore
      }
    })();

    return () => {
      mounted = false;
    };
  }, [post.id]);

  function mapNodeToLocal(n: CommentNode): LocalComment {
    return {
      id: n.id,
      author: n.author,
      avatar: n.avatar ?? "/placeholder.svg",
      course: n.course ?? "",
      content: n.content,
      likes: n.likes,
      replies: n.replies ? n.replies.map(mapNodeToLocal) : [],
      timestamp: n.timestamp,
    };
  }

  async function addTopLevelComment() {
    const txt = commentText.trim();
    if (!txt) return;

    const tempId = generateId("c_local_");
    const userName = currentUser?.name ?? "Alvi Binte Zamil";
    const temp: LocalComment = {
      id: tempId,
      author: userName,
      avatar: "/placeholder.svg",
      course: "",
      content: txt,
      likes: 0,
      replies: [],
      timestamp: "Just now",
    };

    setComments((prev) => [temp, ...prev]);
    setCommentText("");
    setIsReplying(false);

    try {
      const authorId = currentUser?.auth_uid;
      if (!authorId) {
        console.warn("No signed-in user found; inserting comment with null author will occur unless DB constraint prevents it.");
      }
      const newNode = await addComment({
        postId: post.id,
        authorId: authorId ?? "",
        content: txt,
        parentCommentId: null,
      });

      const serverLocal = mapNodeToLocal(newNode as CommentNode);
      setComments((prev) => prev.map((c) => (c.id === tempId ? serverLocal : c)));
    } catch (err) {
      console.error("Failed to add top-level comment", err);
      setComments((prev) => prev.filter((c) => c.id !== tempId));
    }
  }

  function addReplyToTree(list: LocalComment[], parentId: string, reply: LocalComment): LocalComment[] {
    return list.map((c) => {
      if (c.id === parentId) {
        const nextReplies = c.replies ? [reply, ...c.replies] : [reply];
        return { ...c, replies: nextReplies };
      }
      if (c.replies && c.replies.length > 0) {
        return { ...c, replies: addReplyToTree(c.replies, parentId, reply) };
      }
      return c;
    });
  }

  async function handleAddReply(parentId: string, text: string) {
    const txt = text.trim();
    if (!txt) return;

    const tempId = generateId("r_local_");
    const userName = currentUser?.name ?? "Alvi Binte Zamil";
    const tempReply: LocalComment = {
      id: tempId,
      author: userName,
      avatar: "/placeholder.svg",
      course: "",
      content: txt,
      likes: 0,
      replies: [],
      timestamp: "Just now",
    };

    setComments((prev) => addReplyToTree(prev, parentId, tempReply));

    try {
      const authorId = currentUser?.auth_uid;
      const newNode = await addComment({
        postId: post.id,
        authorId: authorId ?? "",
        content: txt,
        parentCommentId: parentId,
      });
      const serverLocal = mapNodeToLocal(newNode);

      setComments((prev) => {
        const replacer = (list: LocalComment[]): LocalComment[] =>
          list.map((c) => {
            if (c.id === parentId) {
              const newReplies = c.replies?.map((r) => (r.id === tempId ? serverLocal : r)) ?? [];
              return { ...c, replies: newReplies };
            }
            if (c.replies && c.replies.length > 0) {
              return { ...c, replies: replacer(c.replies) };
            }
            return c;
          });
        return replacer(prev);
      });
    } catch (err) {
      console.error("Failed to add reply", err);
      const remover = (list: LocalComment[]): LocalComment[] =>
        list.map((c) => {
          if (c.id === parentId) {
            const newReplies = c.replies?.filter((r) => r.id !== tempId) ?? [];
            return { ...c, replies: newReplies };
          }
          if (c.replies && c.replies.length > 0) {
            return { ...c, replies: remover(c.replies) };
          }
          return c;
        });
      setComments((prev) => remover(prev));
    }
  }

  async function handleLikeComment(commentId: string) {
    setComments((prev) =>
      mapCommentsUpdating(prev, commentId, (c) => ({ ...c, likes: c.likes + 1 }))
    );

    try {
      const newCount = await changeCommentLikeCount(commentId, +1);
      setComments((prev) => mapCommentsUpdating(prev, commentId, (c) => ({ ...c, likes: newCount })));
    } catch (err) {
      console.error("Failed to like comment", err);
      setComments((prev) =>
        mapCommentsUpdating(prev, commentId, (c) => ({ ...c, likes: Math.max(0, c.likes - 1) }))
      );
    }
  }

  function mapCommentsUpdating(list: LocalComment[], targetId: string, updater: (c: LocalComment) => LocalComment): LocalComment[] {
    return list.map((c) => {
      if (c.id === targetId) return updater(c);
      if (c.replies && c.replies.length > 0) {
        return { ...c, replies: mapCommentsUpdating(c.replies, targetId, updater) };
      }
      return c;
    });
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
            className={`bg-secondary-lm text-accent-lm px-3 py-1 ${catClassMap[normalizedCategory] ?? ""}`}
          >
            {catLabel}
          </Badge>
          <button className="text-accent-lm hover:opacity-80">
            <MoreVertical className="lg:h-5 lg:w-5" />
          </button>
        </div>

        <h1 className="text-2xl lg:font-bold text-text-lm lg:mb-4">{post.title}</h1>

        {post.tags && post.tags.length > 0 && (
          <div className="lg:flex lg:gap-2 lg:flex-wrap lg:mb-4">
            {post.tags.map((t) => (
              <span
                key={t.skill_id}
                className="lg:border border-accent-lm text-accent-lm lg:rounded-full lg:px-3 lg:py-1 text-sm"
              >
                #{t.name}
              </span>
            ))}
          </div>
        )}

        <div className="lg:flex lg:items-center lg:gap-3 lg:mb-4">
          <Avatar className="lg:h-10 lg:w-10 lg:border border-stroke-grey">
            <AvatarImage src={undefined} />
            <AvatarFallback>{post.author?.[0] ?? "U"}</AvatarFallback>
          </Avatar>
          <div>
            <div className="text-sm lg:font-bold text-accent-lm">
              {post.author}
            </div>
            <div className="text-xs text-text-lighter-lm lg:font-medium">
              {post.dept ?? ""}
            </div>
          </div>
        </div>

        <p className="text-text-lm lg:leading-relaxed lg:mb-6">
          {post.body ?? post.excerpt ?? ""}
        </p>

        {post.segments && post.segments.length > 0 && (
          <div className="lg:space-y-4 lg:mb-6">
            {post.segments.map((seg) => (
              <div
                key={seg.id}
                className="lg:rounded-lg lg:border border-stroke-grey bg-secondary-lm lg:p-4"
              >
                <h4 className="lg:font-semibold text-text-lm">{seg.name}</h4>
                {seg.description && (
                  <p className="text-sm text-text-lm lg:mt-2">{seg.description}</p>
                )}
                <div className="text-xs text-text-lighter-lm lg:mt-3">
                  {seg.date && (
                    <span className="lg:mr-4">
                      {new Date(seg.date).toLocaleDateString(undefined, {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  )}
                  {seg.time && <span>{seg.time}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {post.image && (
          <div className="lg:mb-6 lg:w-full lg:h-72 lg:overflow-hidden lg:rounded-md">
            <img
              src={post.image}
              className="lg:object-cover lg:object-center lg:w-full lg:h-full"
              alt={post.title}
            />
          </div>
        )}

        <div className="lg:flex lg:items-center lg:gap-4 lg:pt-4 border-t border-stroke-grey">
          <button className="lg:flex lg:items-center lg:gap-2 lg:px-4 lg:py-2 lg:rounded-lg bg-secondary-lm text-accent-lm hover:bg-hover-lm lg:transition-colors">
            <Heart className="lg:h-4 lg:w-4" />
            <span className="text-sm lg:font-bold">{post.likes ?? 0}</span>
          </button>
          <button className="lg:flex lg:items-center lg:gap-2 lg:px-4 lg:py-2 lg:rounded-lg bg-secondary-lm text-accent-lm hover:bg-hover-lm lg:transition-colors">
            <MessageCircle className="lg:h-4 lg:w-4" />
            <span className="text-sm lg:font-bold">{post.comments ?? 0}</span>
          </button>
          <button className="lg:flex lg:items-center lg:gap-2 lg:px-4 lg:py-2 lg:rounded-lg bg-secondary-lm text-accent-lm hover:bg-hover-lm lg:transition-colors">
            <Share2 className="lg:h-4 lg:w-4" />
            <span className="text-sm lg:font-bold">{post.shares ?? 0}</span>
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
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
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
            <button className="text-accent-lm lg:flex lg:items-center lg:gap-1">Best <span className="text-[10px]">▼</span></button>
          </div>
        </div>

        <div className="lg:space-y-8">
          {loading ? (
            <div className="text-sm text-text-lighter-lm">Loading comments...</div>
          ) : comments.length === 0 ? (
            <div className="text-sm text-text-lighter-lm">No comments yet. Be the first to comment.</div>
          ) : (
            comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                onAddReply={handleAddReply}
                onLike={handleLikeComment}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function CommentItem({
  comment,
  isReply = false,
  onAddReply,
  onLike,
}: {
  comment: LocalComment;
  isReply?: boolean;
  onAddReply: (parentId: string, text: string) => void;
  onLike: (commentId: string) => void;
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
            <AvatarFallback>{comment.author?.[0] ?? "U"}</AvatarFallback>
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
            <button
              onClick={() => onLike(comment.id)}
              className="lg:flex lg:items-center lg:gap-1 text-[11px] lg:font-bold text-text-lighter-lm hover:text-accent-lm"
            >
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

      {comment.replies && comment.replies.length > 0 && (
        <div className="lg:ml-4 lg:mt-4 lg:space-y-4 border-l-2 border-stroke-grey lg:pl-6">
          {comment.replies.map((reply) => (
            <CommentItem key={reply.id} comment={reply} isReply onAddReply={onAddReply} onLike={onLike} />
          ))}
        </div>
      )}
    </div>
  );
}
