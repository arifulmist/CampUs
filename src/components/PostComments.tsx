import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-hot-toast";

import { supabase } from "@/supabase/supabaseClient";
import { ButtonCTA } from "./ButtonCTA";
import { UserInfo } from "./UserInfo";

import heartIcon from "@/assets/icons/heart_icon.svg";
import filledHeartIcon from "@/assets/icons/FILLEDheart_icon.svg";
import messageIcon from "@/assets/icons/message_icon.svg";
import messageEmptyState from "@/assets/images/noMessage.svg";
import crossBtn from "@/assets/icons/cross_btn.svg";
import { LucideX } from "lucide-react";
import { formatRelativeTime as formatRelativeTimeBase } from "@/utils/datetime";

import {
  addComment,
  buildCommentsTree,
  deleteComment,
  fetchCommentsByPost,
  getCurrentUserProfile,
  updateCommentContent,
  type CommentNode,
} from "@/app/pages/Events/backend/commentsService";

function DeleteCommentModal({
  open,
  onClose,
  onConfirm,
  isDeleting,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}) {
  if (!open) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0"
        onClick={() => {
          if (!isDeleting) onClose();
        }}
        style={{ backgroundColor: "rgba(0,0,0,0.4)", zIndex: 1000 }}
      />

      <div className="fixed inset-0 flex items-center justify-center p-6" style={{ zIndex: 1001 }}>
        <div
          className="lg:w-full lg:max-w-2xl bg-primary-lm lg:p-10 lg:border border-stroke-grey rounded-xl max-h-[calc(100vh-96px)] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="lg:flex lg:justify-between lg:items-center lg:mb-6">
            <h2 className="text-xl lg:font-semibold text-text-lm">Delete Comment</h2>
            <button
              onClick={() => {
                if (!isDeleting) onClose();
              }}
              className="text-text-lighter-lm text-2xl cursor-pointer"
              aria-label="Close modal"
            >
              <img src={crossBtn} alt="Close" />
            </button>
          </div>

          <div className="lg:space-y-6">
            <p className="text-text-lm">Are you sure you want to delete this comment? This can’t be undone.</p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={onClose}
                className="bg-secondary-lm text-text-lm border border-stroke-grey px-4 py-2 rounded-lg hover:bg-hover-lm transition duration-150 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={onConfirm}
                className="bg-primary-lm text-danger-lm border border-stroke-grey px-4 py-2 rounded-lg hover:bg-hover-lm transition duration-150 disabled:opacity-60"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

type SortMode = "best" | "latest";
const formatRelativeTime = (iso?: string | null) =>
  formatRelativeTimeBase(iso, { longAfterDays: 7 });

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

export function PostComments({
  postId,
  onInitialLoadDone,
}: {
  postId: string;
  onInitialLoadDone?: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>("best");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [topCommentText, setTopCommentText] = useState("");
  const [postingTop, setPostingTop] = useState(false);

  const [tree, setTree] = useState<CommentNode[]>([]);
  const [likedById, setLikedById] = useState<Record<string, boolean>>({});

  const inputRef = useRef<HTMLInputElement | null>(null);
  const focusAttemptTokenRef = useRef(0);

  const aliveRef = useRef(true);
  const initialLoadNotifiedRef = useRef(false);

  useEffect(() => {
    initialLoadNotifiedRef.current = false;
  }, [postId]);

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

      setCurrentUserId(user?.id ?? null);

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
      if (aliveRef.current) {
        setLoading(false);
        if (!initialLoadNotifiedRef.current) {
          initialLoadNotifiedRef.current = true;
          onInitialLoadDone?.();
        }
      }
    }
  }

  useEffect(() => {
    if (!postId) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  useEffect(() => {
    if (!postId) return;

    function isVisibleForScrollAndFocus(el: HTMLElement): boolean {
      if (!el.isConnected) return false;
      // If a parent uses `display: none` (e.g., Tailwind `hidden`), client rects will be empty.
      if (el.getClientRects().length === 0) return false;
      const style = window.getComputedStyle(el);
      if (style.display === "none") return false;
      if (style.visibility === "hidden") return false;
      return true;
    }

    function focusInputWithRetry({
      consumeMarker,
    }: {
      consumeMarker?: () => void;
    } = {}) {
      const token = ++focusAttemptTokenRef.current;
      const startedAt = Date.now();
      const maxMs = 4000;

      const tick = () => {
        if (!aliveRef.current) return;
        if (focusAttemptTokenRef.current !== token) return;

        const el = inputRef.current;
        if (el && isVisibleForScrollAndFocus(el)) {
          try {
            el.focus();
          } catch {
            // ignore focus failures
          }
          try {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          } catch {
            // ignore scroll failures
          }
          consumeMarker?.();
          return;
        }

        if (Date.now() - startedAt > maxMs) return;
        requestAnimationFrame(tick);
      };

      requestAnimationFrame(tick);
    }

    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ postId?: string }>;
      const targetId = ce?.detail?.postId;
      if (!targetId) return;
      if (targetId !== postId) return;

      // Focus may be requested while the route is still showing a Loading state
      // and this component is inside a `hidden` wrapper (display:none). Retry until visible.
      focusInputWithRetry({
        consumeMarker: () => {
          try {
            type LastFocusCommentMarker = { postId?: string; ts?: number };
            const win = window as unknown as { __campus_last_focus_comment?: LastFocusCommentMarker };
            const last = win.__campus_last_focus_comment;
            if (last?.postId === postId) win.__campus_last_focus_comment = undefined;
          } catch {
            // ignore marker cleanup failures
          }
        },
      });
    };

    window.addEventListener("campus:focus_comment_input", handler as EventListener);
    // Also check a persistent marker set on window in case the event fired before mount
    try {
      type LastFocusCommentMarker = { postId?: string; ts?: number };
      const win = window as unknown as { __campus_last_focus_comment?: LastFocusCommentMarker };
      const last = win.__campus_last_focus_comment;
      if (last?.postId === postId && Date.now() - (last.ts ?? 0) < 5000) {
        focusInputWithRetry({
          consumeMarker: () => {
            try {
              win.__campus_last_focus_comment = undefined;
            } catch {
              // ignore marker cleanup failures
            }
          },
        });
      }
    } catch {
      // ignore marker access failures
    }

    return () => window.removeEventListener("campus:focus_comment_input", handler as EventListener);
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
    if (postingTop) return;

    setPostingTop(true);
    try {
      const me = await getCurrentUserProfile();
      if (!me?.auth_uid) {
        toast.error("You must be signed in to comment");
        return;
      }
      const inserted = await addComment({ postId, authorId: me.auth_uid, content: text, parentCommentId: null });
      setTopCommentText("");
      setTree((prev) => [inserted, ...prev]);

      // Let any post-level UI (e.g. CommentButton) refresh its count.
      window.dispatchEvent(new CustomEvent("campus:comments_changed", { detail: { postId } }));
    } catch (e) {
      console.error(e);
      toast.error("Failed to post comment");
    } finally {
      setPostingTop(false);
    }
  }

  return (
    <div className="lg:mt-6 lg:flex lg:flex-col lg:gap-4 bg-primary-lm lg:p-6 border border-stroke-grey rounded-xl">
      <DeleteCommentModal
        open={deleteOpen}
        isDeleting={deleting}
        onClose={() => {
          if (deleting) return;
          setDeleteOpen(false);
          setDeleteTargetId(null);
        }}
        onConfirm={() => {
          if (deleting) return;
          if (!deleteTargetId) return;
          if (!currentUserId) {
            toast.error("You must be signed in to delete comments");
            return;
          }

          setDeleting(true);
          void (async () => {
            try {
              await deleteComment({ commentId: deleteTargetId, authorId: currentUserId });

              setTree((prev) => removeNodePromoteReplies(prev, deleteTargetId));
              setLikedById((prev) => {
                const next = { ...prev };
                delete next[deleteTargetId];
                return next;
              });

              window.dispatchEvent(new CustomEvent("campus:comments_changed", { detail: { postId } }));
              toast.success("Comment deleted");
              setDeleteOpen(false);
              setDeleteTargetId(null);
            } catch (e) {
              console.error(e);
              const msg = (() => {
                if (e instanceof Error) return e.message;
                if (typeof e === "string") return e;
                return "Failed to delete comment";
              })();
              toast.error(msg);
            } finally {
              setDeleting(false);
            }
          })();
        }}
      />

      <div className="lg:flex lg:gap-3 lg:items-center">
        <input
          ref={inputRef}
          value={topCommentText}
          onChange={(e) => setTopCommentText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submitTopLevelComment();
            }
          }}
          placeholder="Write a comment…"
          className="lg:flex-1 h-full lg:mt-2 bg-secondary-lm border border-stroke-grey rounded-md lg:px-4 py-2 placeholder:text-stroke-peach text-text-lm focus:outline-0 focus:border focus:border-stroke-peach"
        />

        <ButtonCTA
          label={postingTop ? "Posting..." : "Post"}
          loading={postingTop}
          disabled={postingTop || !topCommentText.trim()}
          clickEvent={() => void submitTopLevelComment()}
        />
      </div>

      <div className="flex gap-3 items-center lg:mt-4 lg:mb-6">
        <p className="m-0 p-0 text-text-lm">Sort by:</p>
        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as SortMode)}
          className="bg-primary-lm border border-stroke-grey rounded-md lg:p-2 text-accent-lm cursor-pointer hover:border-stroke-peach focus:outline-0 focus:border-stroke-grey"
        >
          <option value="best">Best</option>
          <option value="latest">Latest</option>
        </select>
      </div>

      {loading ? (
        <p className="text-text-lighter-lm">Loading comments…</p>
      ) : sortedParents.length === 0 ? (
        <div className="flex flex-col lg:gap-2 items-center lg:mt-4">
          <img src={messageEmptyState} />
          <p className="text-text-lighter-lm">No comments yet</p>
        </div>
      ) : (
        <div className="lg:flex lg:flex-col lg:gap-6">
          {sortedParents.map((c) => (
            <CommentItem
              key={c.id}
              postId={postId}
              node={c}
              currentUserId={currentUserId}
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
              onUpdateContent={async (commentId, nextContent) => {
                if (!currentUserId) {
                  toast.error("You must be signed in to edit comments");
                  return;
                }
                const trimmed = nextContent.trim();
                await updateCommentContent({ commentId, authorId: currentUserId, content: trimmed });
                setTree((prev) =>
                  updateNode(prev, commentId, (n) => ({
                    ...n,
                    content: trimmed,
                    raw: n.raw ? { ...n.raw, content: trimmed } : n.raw,
                  }))
                );
                toast.success("Comment updated");
              }}
              onRequestDelete={(commentId) => {
                setDeleteTargetId(commentId);
                setDeleteOpen(true);
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

function removeNodePromoteReplies(list: CommentNode[], targetId: string): CommentNode[] {
  const next: CommentNode[] = [];

  for (const node of list) {
    if (node.id === targetId) {
      if (node.replies && node.replies.length > 0) {
        next.push(...node.replies);
      }
      continue;
    }

    if (node.replies && node.replies.length > 0) {
      next.push({ ...node, replies: removeNodePromoteReplies(node.replies, targetId) });
    } else {
      next.push(node);
    }
  }

  return next;
}

function CommentItem({
  postId,
  node,
  currentUserId,
  getLiked,
  onToggleLike,
  onInsertReply,
  onUpdateContent,
  onRequestDelete,
  isReply = false,
}: {
  postId: string;
  node: CommentNode;
  currentUserId: string | null;
  getLiked: (id: string) => boolean;
  onToggleLike: (commentId: string) => Promise<void>;
  onInsertReply: (parentId: string, reply: CommentNode) => void;
  onUpdateContent: (commentId: string, nextContent: string) => Promise<void>;
  onRequestDelete: (commentId: string) => void;
  isReply?: boolean;
}) {
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [posting, setPosting] = useState(false);

  const replyInputRef = useRef<HTMLInputElement | null>(null);
  const editInputRef = useRef<HTMLInputElement | null>(null);

  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const createdAtIso = node.timestamp;
  const batchLabel = node.course ?? "";
  const isOwner = Boolean(currentUserId && node.raw?.author_id && node.raw.author_id === currentUserId);

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

      window.dispatchEvent(new CustomEvent("campus:comments_changed", { detail: { postId } }));
    } catch (e) {
      console.error(e);
      toast.error("Failed to post reply");
    } finally {
      setPosting(false);
    }
  }

  async function submitEdit() {
    const next = editText.trim();
    if (!next) return;
    if (savingEdit) return;

    setSavingEdit(true);
    try {
      await onUpdateContent(node.id, next);
      setEditing(false);
    } catch (e) {
      console.error(e);
      const msg = (() => {
        if (e instanceof Error) return e.message;
        if (typeof e === "string") return e;
        return "Failed to update comment";
      })();
      toast.error(msg);
    } finally {
      setSavingEdit(false);
    }
  }

  useEffect(() => {
    if (!editing) return;

    // autofocus the edit input when editing opens
    requestAnimationFrame(() => {
      try {
        const el = editInputRef.current;
        if (el) {
          el.focus();
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      } catch {
        // ignore
      }
    });

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setEditing(false);
        setEditText("");
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [editing]);

  useEffect(() => {
    if (!replying) return;

    // autofocus the reply input when replying opens
    requestAnimationFrame(() => {
      try {
        const el = replyInputRef.current;
        if (el) {
          el.focus();
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      } catch {
        // ignore
      }
    });

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setReplying(false);
        setReplyText("");
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [replying]);

  return (
    <div
      className={
        `${isReply && "lg:ml-6 lg:pl-6 border-l-2 border-stroke-grey"}`}
    >
      <UserInfo
        userName={node.author}
        userBatch={batchLabel}
        postDate={formatRelativeTime(createdAtIso)}
        userId={node.raw?.author_id ?? undefined}
        studentId={node.raw?.user_info?.student_id ?? undefined}
      />

      <p className="m-0 mt-2 p-0 text-text-lm whitespace-pre-wrap">{node.content}</p>

      <div className="flex gap-4 mt-3">
        <button
          className="flex gap-1 items-center cursor-pointer"
          onClick={() => void onToggleLike(node.id)}
        >
          <img src={getLiked(node.id) ? filledHeartIcon : heartIcon} className="lg:size-4" />
          <p className="m-0 p-0 text-accent-lm text-sm">{node.likes ?? 0}</p>
        </button>

        <button
          className="flex gap-1 items-center cursor-pointer"
          onClick={() => {
            setEditing(false);
            setEditText("");
            setReplying((p) => !p);
          }}
        >
          <img src={messageIcon} className="lg:size-4" />
          <p className="m-0 p-0 text-accent-lm text-sm">Reply</p>
        </button>

        {isOwner ? (
          <>
            <button
              className="cursor-pointer"
              onClick={() => {
                setReplying(false);
                setReplyText("");
                setEditing(true);
                setEditText(node.content);
              }}
            >
              <p className="m-0 p-0 text-accent-lm text-sm">Edit</p>
            </button>

            <button className="cursor-pointer" onClick={() => onRequestDelete(node.id)}>
              <p className="m-0 p-0 text-text-lighter-lm/80 text-sm">Delete</p>
            </button>
          </>
        ) : null}
      </div>

      {replying && (
        <div className="mt-3 flex gap-3 items-center relative">
          <button
            type="button"
            onClick={() => {
              setReplying(false);
              setReplyText("");
            }}
            aria-label="Cancel reply"
            className="absolute left-2 top-1/2 -translate-y-1/2 text-text-lighter-lm cursor-pointer"
          >
            <LucideX className="size-5 text-accent-lm" />
          </button>
          <input
            ref={replyInputRef}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write a reply…"
            className="flex-1 bg-primary-lm border border-stroke-grey rounded-md px-3 py-2 pl-10 text-text-lm focus:outline-0 focus:border-stroke-peach"
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

      {editing && (
        <div className="mt-3 flex gap-3 items-center relative">
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setEditText("");
            }}
            aria-label="Cancel edit"
            className="absolute left-2 top-1/2 -translate-y-1/2 text-text-lighter-lm cursor-pointer"
          >
            <LucideX className="size-5 text-accent-lm"/>
          </button>
          <input
            ref={editInputRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            placeholder="Edit your comment…"
            className="flex-1 bg-primary-lm border border-stroke-grey rounded-md px-3 py-2 pl-10 text-text-lm focus:outline-0 focus:border-stroke-peach"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submitEdit();
              }
            }}
          />
          <ButtonCTA
            label={savingEdit ? "Saving..." : "Save"}
            loading={savingEdit}
            disabled={!editText.trim()}
            clickEvent={() => void submitEdit()}
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
              currentUserId={currentUserId}
              getLiked={getLiked}
              onToggleLike={onToggleLike}
              onInsertReply={onInsertReply}
              onUpdateContent={onUpdateContent}
              onRequestDelete={onRequestDelete}
              isReply
            />
          ))}
        </div>
      )}
    </div>
  );
}
