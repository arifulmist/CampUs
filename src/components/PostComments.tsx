import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";

import { supabase } from "../../supabase/supabaseClient";
import { ButtonCTA } from "./ButtonCTA";
import { UserInfo } from "./UserInfo";

import heartIcon from "@/assets/icons/heart_icon.svg";
import filledHeartIcon from "@/assets/icons/FILLEDheart_icon.svg";
import messageIcon from "@/assets/icons/message_icon.svg";

import {
  addComment,
  buildCommentsTree,
  fetchCommentsByPost,
  getCurrentUserProfile,
  type CommentNode,
} from "@/app/pages/Events/backend/commentsService";

type SortMode = "best" | "latest";

function formatRelativeTime(iso?: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 3) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

async function toggleCommentLike(commentId: string) {
  const { data, error } = await supabase
    .rpc("toggle_comment_like", {
      p_comment_id: commentId,
    })
    .single();

  if (error) throw error;

  const row = data as unknown as { like_count?: unknown; liked?: unknown };
  return {
    likeCount: typeof row.like_count === "number" ? row.like_count : Number(row.like_count ?? 0),
    liked: Boolean(row.liked),
  };
}

export function PostComments({ postId }: { postId: string }) {
  const [loading, setLoading] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>("best");

  const [topCommentText, setTopCommentText] = useState("");

  const [tree, setTree] = useState<CommentNode[]>([]);
  const [likedById, setLikedById] = useState<Record<string, boolean>>({});

  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  async function load() {
    setLoading(true);
    try {
      const rows = await fetchCommentsByPost(postId);
      if (!aliveRef.current) return;
      const built = buildCommentsTree(rows);
      setTree(built);

      // Initialize liked state (if authenticated)
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const ids = rows.map((r) => r.comment_id).filter((x) => typeof x === "string" && x);
        if (ids.length) {
          const { data: likes, error: likesError } = await supabase
            .from("comment_likes")
            .select("comment_id")
            .eq("user_id", user.id)
            .in("comment_id", ids);

          if (!likesError && likes) {
            const next: Record<string, boolean> = {};
            for (const row of likes as unknown as Array<{ comment_id?: unknown }>) {
              const cid = row.comment_id;
              if (typeof cid === "string" && cid) next[cid] = true;
            }
            setLikedById(next);
          }
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load comments");
      setTree([]);
    } finally {
      if (aliveRef.current) setLoading(false);
    }
  }

  useEffect(() => {
    if (!postId) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const sortedParents = useMemo(() => {
    const parents = [...tree];

    if (sortMode === "best") {
      parents.sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0));
      return parents;
    }

    // latest
    parents.sort((a, b) => {
      const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return tb - ta;
    });
    return parents;
  }, [tree, sortMode]);

  async function submitTopLevelComment() {
    const text = topCommentText.trim();
    if (!text) return;

    try {
      const me = await getCurrentUserProfile();
      if (!me?.auth_uid) {
        toast.error("You must be signed in to comment");
        return;
      }
      const inserted = await addComment({ postId, authorId: me.auth_uid, content: text, parentCommentId: null });
      setTopCommentText("");
      setTree((prev) => [inserted, ...prev]);
    } catch (e) {
      console.error(e);
      toast.error("Failed to post comment");
    }
  }

  return (
    <div className="lg:mt-6 lg:flex lg:flex-col lg:gap-4">
      <div className="lg:flex lg:gap-3 lg:items-center">
        <input
          value={topCommentText}
          onChange={(e) => setTopCommentText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submitTopLevelComment();
            }
          }}
          placeholder="Write a comment…"
          className="lg:flex-1 h-full lg:mt-2 bg-primary-lm border border-stroke-grey rounded-md lg:px-4 py-2 placeholder:text-stroke-peach-lm text-text-lm"
        />
      </div>

      <div className="flex gap-3 items-center">
        <p className="m-0 p-0 text-text-lm">Sort by:</p>
        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as SortMode)}
          className="bg-primary-lm border border-stroke-grey rounded-md px-3 py-2 text-accent-lm cursor-pointer hover:border-stroke-peach"
        >
          <option value="best">Best</option>
          <option value="latest">Latest</option>
        </select>
      </div>

      {loading ? (
        <p className="text-text-lighter-lm">Loading comments…</p>
      ) : sortedParents.length === 0 ? (
        <p className="text-text-lighter-lm">No comments yet.</p>
      ) : (
        <div className="lg:flex lg:flex-col lg:gap-6">
          {sortedParents.map((c) => (
            <CommentItem
              key={c.id}
              postId={postId}
              node={c}
              getLiked={(id) => Boolean(likedById[id])}
              onToggleLike={async (commentId) => {
                try {
                  const res = await toggleCommentLike(commentId);
                  setLikedById((prev) => ({ ...prev, [commentId]: res.liked }));
                  setTree((prev) =>
                    updateNode(prev, commentId, (n) => ({ ...n, likes: res.likeCount }))
                  );
                } catch (e) {
                  console.error(e);
                  const msg = (() => {
                    if (e instanceof Error) return e.message;
                    if (typeof e === "string") return e;
                    return "Failed to update like";
                  })();
                  toast.error(msg);
                }
              }}
              onInsertReply={(parentId, replyNode) => {
                setTree((prev) => insertReply(prev, parentId, replyNode));
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function insertReply(list: CommentNode[], parentId: string, reply: CommentNode): CommentNode[] {
  return list.map((n) => {
    if (n.id === parentId) {
      const nextReplies = n.replies ? [...n.replies, reply] : [reply];
      return { ...n, replies: nextReplies };
    }
    if (n.replies && n.replies.length) {
      return { ...n, replies: insertReply(n.replies, parentId, reply) };
    }
    return n;
  });
}

function updateNode(
  list: CommentNode[],
  targetId: string,
  mutate: (n: CommentNode) => CommentNode
): CommentNode[] {
  return list.map((n) => {
    if (n.id === targetId) return mutate(n);
    if (n.replies && n.replies.length) {
      return { ...n, replies: updateNode(n.replies, targetId, mutate) };
    }
    return n;
  });
}

function CommentItem({
  postId,
  node,
  getLiked,
  onToggleLike,
  onInsertReply,
  isReply = false,
}: {
  postId: string;
  node: CommentNode;
  getLiked: (id: string) => boolean;
  onToggleLike: (commentId: string) => Promise<void>;
  onInsertReply: (parentId: string, reply: CommentNode) => void;
  isReply?: boolean;
}) {
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [posting, setPosting] = useState(false);

  const createdAtIso = node.timestamp;
  const batchLabel = node.course ?? "";

  async function submitReply() {
    const text = replyText.trim();
    if (!text) return;
    setPosting(true);
    try {
      const me = await getCurrentUserProfile();
      if (!me?.auth_uid) {
        toast.error("You must be signed in to reply");
        return;
      }
      const inserted = await addComment({ postId, authorId: me.auth_uid, content: text, parentCommentId: node.id });
      setReplyText("");
      setReplying(false);
      onInsertReply(node.id, inserted);
    } catch (e) {
      console.error(e);
      toast.error("Failed to post reply");
    } finally {
      setPosting(false);
    }
  }

  return (
    <div
      className={
        isReply
          ? "lg:ml-6 lg:pl-6 border-l-2 border-stroke-grey"
          : "lg:p-6 bg-primary-lm border border-stroke-grey lg:rounded-xl"
      }
    >
      <UserInfo
        userName={node.author}
        userBatch={batchLabel}
        postDate={formatRelativeTime(createdAtIso)}
        userId={node.raw?.author_id ?? undefined}
      />

      <p className="m-0 mt-2 p-0 text-text-lm whitespace-pre-wrap">{node.content}</p>

      <div className="flex gap-4 mt-3">
        <button
          className="flex gap-1 items-center"
          onClick={() => void onToggleLike(node.id)}
        >
          <img src={getLiked(node.id) ? filledHeartIcon : heartIcon} className="lg:size-4" />
          <p className="m-0 p-0 text-accent-lm text-sm">{node.likes ?? 0}</p>
        </button>

        <button className="flex gap-1 items-center" onClick={() => setReplying((p) => !p)}>
          <img src={messageIcon} className="lg:size-4" />
          <p className="m-0 p-0 text-accent-lm text-sm">Reply</p>
        </button>
      </div>

      {replying && (
        <div className="mt-3 flex gap-3 items-center">
          <input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write a reply…"
            className="flex-1 bg-primary-lm border border-stroke-grey rounded-md px-3 py-2 text-text-lm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submitReply();
              }
            }}
          />
          <ButtonCTA
            label={posting ? "Replying..." : "Reply"}
            loading={posting}
            disabled={!replyText.trim()}
            clickEvent={() => void submitReply()}
          />
        </div>
      )}

      {node.replies && node.replies.length > 0 && (
        <div className="mt-4 flex flex-col gap-4">
          {node.replies.map((r) => (
            <CommentItem
              key={r.id}
              postId={postId}
              node={r}
              getLiked={getLiked}
              onToggleLike={onToggleLike}
              onInsertReply={onInsertReply}
              isReply
            />
          ))}
        </div>
      )}
    </div>
  );
}
