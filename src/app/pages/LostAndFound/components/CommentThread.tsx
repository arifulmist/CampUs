// src/app/pages/LostAndFound/components/CommentThread.tsx
import React, { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  fetchCommentsByPost,
  buildCommentsTree,
  addComment,
  changeCommentLikeCount,
  getCurrentUserProfile,
  type CommentNode,
} from "../backend/commentsService";

/**
 * Comment shape used by parent UI (simple)
 */
export type Comment = {
  id: string;
  author: string;
  avatar?: string;
  course?: string;
  content: string;
  likes: number;
  replies?: Comment[];
  timestamp?: string | null;
};

export default function CommentThread({
  postId,
  currentUser,
  onCommentsCountChange,
}: {
  postId: string;
  currentUser: { name: string; avatar?: string; course?: string } | null;
  onCommentsCountChange?: (delta: number) => void; // optional: parent can update comment_count
}) {
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState<"best" | "latest">("latest");
  const [comments, setComments] = useState<Comment[]>([]);
  const [topCommentText, setTopCommentText] = useState("");
  const [userProfile, setUserProfile] = useState<{ auth_uid: string; name?: string | null } | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const rows = await fetchCommentsByPost(postId, sort);
        const tree = buildCommentsTree(rows);
        const mapped = tree.map(mapNodeToComment);
        if (mounted) setComments(mapped);
      } catch (err) {
        console.error("Failed to load comments for post:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    (async () => {
      try {
        const profile = await getCurrentUserProfile();
        if (profile) setUserProfile({ auth_uid: profile.auth_uid, name: profile.name ?? undefined });
      } catch {
        // ignore
      }
    })();

    return () => {
      mounted = false;
    };
  }, [postId, sort]);

  function mapNodeToComment(n: CommentNode): Comment {
    return {
      id: n.id,
      author: n.author,
      avatar: n.avatar ?? "/placeholder.svg",
      course: n.course ?? undefined,
      content: n.content,
      likes: n.likes,
      replies: n.replies ? n.replies.map(mapNodeToComment) : [],
      timestamp: n.timestamp,
    };
  }

  function addReplyToTree(list: Comment[], parentId: string, reply: Comment): Comment[] {
    return list.map((c) => {
      if (c.id === parentId) {
        const nextReplies = c.replies ? [reply, ...c.replies] : [reply];
        return { ...c, replies: nextReplies };
      }
      if (c.replies && c.replies.length) {
        return { ...c, replies: addReplyToTree(c.replies, parentId, reply) };
      }
      return c;
    });
  }

  function mapCommentsUpdating(list: Comment[], targetId: string, updater: (c: Comment) => Comment): Comment[] {
    return list.map((c) => {
      if (c.id === targetId) return updater(c);
      if (c.replies && c.replies.length) {
        return { ...c, replies: mapCommentsUpdating(c.replies, targetId, updater) };
      }
      return c;
    });
  }

  async function submitTopLevelComment() {
    const txt = topCommentText.trim();
    if (!txt) return;

    const tempId = `temp_${Date.now().toString(36)}`;
    const authorName = userProfile?.name ?? currentUser?.name ?? "You";

    const temp: Comment = {
      id: tempId,
      author: authorName,
      avatar: currentUser?.avatar ?? "/placeholder.svg",
      course: currentUser?.course,
      content: txt,
      likes: 0,
      replies: [],
      timestamp: "Just now",
    };

    setComments((prev) => [temp, ...prev]);
    setTopCommentText("");

    try {
      const newNode = await addComment({
        postId,
        authorId: userProfile?.auth_uid ?? null,
        content: txt,
        parentCommentId: null,
      });

      const server = mapNodeToComment(newNode);
      setComments((prev) => prev.map((c) => (c.id === tempId ? server : c)));
      if (onCommentsCountChange) onCommentsCountChange(+1);
    } catch (err) {
      console.error("Failed to post comment:", err);
      setComments((prev) => prev.filter((c) => c.id !== tempId));
    }
  }

  async function handleAddReply(parentId: string, text: string) {
    const txt = text.trim();
    if (!txt) return;
    const tempId = `temp_r_${Date.now().toString(36)}`;
    const authorName = userProfile?.name ?? currentUser?.name ?? "You";

    const tempReply: Comment = {
      id: tempId,
      author: authorName,
      avatar: currentUser?.avatar ?? "/placeholder.svg",
      course: currentUser?.course,
      content: txt,
      likes: 0,
      replies: [],
      timestamp: "Just now",
    };

    setComments((prev) => addReplyToTree(prev, parentId, tempReply));

    try {
      const newNode = await addComment({
        postId,
        authorId: userProfile?.auth_uid ?? null,
        content: txt,
        parentCommentId: parentId,
      });
      const serverReply = mapNodeToComment(newNode);

      // replace temp with server reply
      const replacer = (list: Comment[]): Comment[] =>
        list.map((c) => {
          if (c.id === parentId) {
            const newReplies = (c.replies ?? []).map((r) => (r.id === tempId ? serverReply : r));
            return { ...c, replies: newReplies };
          }
          if (c.replies && c.replies.length) {
            return { ...c, replies: replacer(c.replies) };
          }
          return c;
        });

      setComments((prev) => replacer(prev));
      if (onCommentsCountChange) onCommentsCountChange(+1);
    } catch (err) {
      console.error("Failed to add reply:", err);
      // remove temp
      const remover = (list: Comment[]): Comment[] =>
        list.map((c) => {
          if (c.id === parentId) {
            const newReplies = (c.replies ?? []).filter((r) => r.id !== tempId);
            return { ...c, replies: newReplies };
          }
          if (c.replies && c.replies.length) {
            return { ...c, replies: remover(c.replies) };
          }
          return c;
        });
      setComments((prev) => remover(prev));
    }
  }

  async function handleLike(commentId: string) {
    // optimistic increment
    setComments((prev) => mapCommentsUpdating(prev, commentId, (c) => ({ ...c, likes: c.likes + 1 })));

    try {
      const newCount = await changeCommentLikeCount(commentId, +1);
      setComments((prev) => mapCommentsUpdating(prev, commentId, (c) => ({ ...c, likes: newCount })));
    } catch (err) {
      console.error("Failed to like comment:", err);
      // roll back
      setComments((prev) => mapCommentsUpdating(prev, commentId, (c) => ({ ...c, likes: Math.max(0, c.likes - 1) })));
    }
  }

  return (
    <div className="lg:space-y-4">
      <div className="lg:space-y-2">
        <div className="lg:flex lg:gap-2">
          <Textarea
            placeholder="Add a reply..."
            value={topCommentText}
            onChange={(e) => setTopCommentText(e.target.value)}
            className="lg:min-h-24 border-none focus-visible:ring-0 lg:p-0 text-sm bg-primary-lm text-text-lm placeholder:text-text-lighter-lm"
          />
        </div>
        <div className="lg:flex lg:items-center lg:justify-end lg:gap-2">
          <Button size="sm" variant="ghost" onClick={() => setTopCommentText("")}>
            Cancel
          </Button>
          <Button size="sm" className="bg-accent-lm hover:bg-hover-btn-lm text-primary-lm" onClick={submitTopLevelComment}>
            Comment
          </Button>
        </div>
      </div>

      <div className="lg:space-y-6">
        <div className="lg:flex lg:items-center lg:justify-between lg:mb-2">
          <div className="text-sm text-text-lighter-lm">Sort:</div>
          <div className="lg:flex lg:gap-2">
            <button className={`px-2 py-1 rounded ${sort === "latest" ? "bg-accent-lm text-primary-lm" : "bg-secondary-lm text-accent-lm"}`} onClick={() => setSort("latest")}>Latest</button>
            <button className={`px-2 py-1 rounded ${sort === "best" ? "bg-accent-lm text-primary-lm" : "bg-secondary-lm text-accent-lm"}`} onClick={() => setSort("best")}>Best</button>
          </div>
        </div>

        {loading ? (
          <div className="text-sm text-text-lighter-lm">Loading comments...</div>
        ) : comments.length === 0 ? (
          <div className="text-sm text-text-lighter-lm">No comments yet.</div>
        ) : (
          comments.map((c) => (
            <CommentItem key={c.id} comment={c} onReply={handleAddReply} onLike={handleLike} />
          ))
        )}
      </div>
    </div>
  );
}

function CommentItem({
  comment,
  onReply,
  onLike,
  isReply = false,
}: {
  comment: Comment;
  isReply?: boolean;
  onReply: (parentId: string, text: string) => void;
  onLike: (commentId: string) => void;
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
            <AvatarFallback>{comment.author?.[0] ?? "U"}</AvatarFallback>
          </Avatar>
        </div>
        <div className="lg:flex-1 lg:pb-2">
          <div className="lg:flex lg:items-center lg:gap-2 lg:mb-1">
            <span className="text-sm lg:font-bold text-text-lm">{comment.author}</span>
            <span className="text-[10px] text-text-lighter-lm lg:font-medium lg:px-1.5 lg:py-0.5 bg-secondary-lm lg:rounded">{comment.course}</span>
          </div>
          <p className="text-sm text-text-lm lg:mb-2 lg:leading-snug">{comment.content}</p>
          <div className="lg:flex lg:items-center lg:gap-4">
            <button onClick={() => onLike(comment.id)} className="lg:flex lg:items-center lg:gap-1 text-[11px] lg:font-bold text-text-lighter-lm hover:text-accent-lm">
              <Heart className="lg:h-3 lg:w-3" />
              {comment.likes}
            </button>
            <button className="text-[11px] lg:font-bold text-accent-lm hover:underline" onClick={() => setReplying((r) => !r)}>Reply</button>
          </div>
        </div>
      </div>

      {replying && (
        <div className="lg:ml-4 lg:mt-4 lg:space-y-3">
          <Textarea placeholder={`Reply to ${comment.author}...`} value={replyText} onChange={(e) => setReplyText(e.target.value)} className="lg:min-h-20 border-none focus-visible:ring-0 lg:p-0 text-sm bg-primary-lm text-text-lm placeholder:text-text-lighter-lm" />
          <div className="lg:flex lg:items-center lg:justify-end lg:gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setReplying(false); setReplyText(""); }}>Cancel</Button>
            <Button size="sm" className="bg-accent-lm hover:bg-hover-btn-lm text-primary-lm lg:px-4" onClick={submitReply}>Comment</Button>
          </div>
        </div>
      )}

      {comment.replies && comment.replies.length > 0 && (
        <div className="lg:ml-4 lg:mt-4 lg:space-y-4 border-l-2 border-stroke-grey lg:pl-6">
          {comment.replies.map((r) => (
            <CommentItem key={r.id} comment={r} isReply onReply={onReply} onLike={onLike} />
          ))}
        </div>
      )}
    </div>
  );
}
