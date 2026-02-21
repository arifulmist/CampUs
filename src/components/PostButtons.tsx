import { useEffect, useState, type MouseEventHandler } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

import heartIcon from "@/assets/icons/heart_icon.svg";
import filledHeartIcon from "@/assets/icons/FILLEDheart_icon.svg";
import commentIcon from "@/assets/icons/comment_icon.svg";
import shareIcon from "@/assets/icons/share_icon.svg";
import bellIcon from "@/assets/icons/bell_icon.svg";
import filledBellIcon from "@/assets/icons/FILLEDbell_icon.svg";

// import { ShareModal } from "./ShareModal";

import { supabase } from "@/supabase/supabaseClient";

const LIKES_CACHE_EVENT = "campus:likes_cache_changed";
const INTEREST_CACHE_EVENT = "campus:interest_cache_changed";

let cachedUserId: string | null | undefined = undefined;
let cachedUserIdPromise: Promise<string | null> | null = null;

async function getCachedUserId(): Promise<string | null> {
  if (cachedUserId !== undefined) return cachedUserId;
  if (cachedUserIdPromise) return cachedUserIdPromise;

  cachedUserIdPromise = supabase.auth
    .getUser()
    .then((res) => {
      cachedUserId = res.data.user?.id ?? null;
      return cachedUserId;
    })
    .catch(() => {
      cachedUserId = null;
      return null;
    })
    .finally(() => {
      cachedUserIdPromise = null;
    });

  return cachedUserIdPromise;
}

const likedByPostId = new Map<string, boolean>();
const pendingLikePostIds = new Set<string>();
let likeBatchTimer: number | null = null;

function scheduleLikeBatchFetch() {
  if (likeBatchTimer !== null) return;
  likeBatchTimer = window.setTimeout(async () => {
    likeBatchTimer = null;
    const ids = Array.from(pendingLikePostIds);
    pendingLikePostIds.clear();
    if (!ids.length) return;

    const userId = await getCachedUserId();
    if (!userId) {
      for (const id of ids) likedByPostId.set(id, false);
      window.dispatchEvent(
        new CustomEvent(LIKES_CACHE_EVENT, { detail: { postIds: ids } }),
      );
      return;
    }

    const { data } = await supabase
      .from("post_likes")
      .select("post_id")
      .eq("user_id", userId)
      .in("post_id", ids);

    const likedIds = new Set((data ?? []).map((r: any) => String(r.post_id)));
    for (const id of ids) likedByPostId.set(id, likedIds.has(id));
    window.dispatchEvent(
      new CustomEvent(LIKES_CACHE_EVENT, { detail: { postIds: ids } }),
    );
  }, 0);
}

function ensureLikeCached(postId: string) {
  if (likedByPostId.has(postId)) return;
  pendingLikePostIds.add(postId);
  scheduleLikeBatchFetch();
}

const interestedByPostId = new Map<string, boolean>();
const pendingInterestedPostIds = new Set<string>();
let interestBatchTimer: number | null = null;

function scheduleInterestedBatchFetch() {
  if (interestBatchTimer !== null) return;
  interestBatchTimer = window.setTimeout(async () => {
    interestBatchTimer = null;
    const ids = Array.from(pendingInterestedPostIds);
    pendingInterestedPostIds.clear();
    if (!ids.length) return;

    const userId = await getCachedUserId();
    if (!userId) {
      for (const id of ids) interestedByPostId.set(id, false);
      window.dispatchEvent(
        new CustomEvent(INTEREST_CACHE_EVENT, { detail: { postIds: ids } }),
      );
      return;
    }

    const { data } = await supabase
      .from("user_interested_posts")
      .select("post_id")
      .eq("user_id", userId)
      .in("post_id", ids);

    const interestedIds = new Set(
      (data ?? []).map((r: any) => String(r.post_id)),
    );
    for (const id of ids) interestedByPostId.set(id, interestedIds.has(id));
    window.dispatchEvent(
      new CustomEvent(INTEREST_CACHE_EVENT, { detail: { postIds: ids } }),
    );
  }, 0);
}

function ensureInterestedCached(postId: string) {
  if (interestedByPostId.has(postId)) return;
  pendingInterestedPostIds.add(postId);
  scheduleInterestedBatchFetch();
}

interface ButtonProps {
  icon: string;
  label: string | number;
  clickEvent?: MouseEventHandler<HTMLButtonElement>;
}

function ButtonBase({ icon, label, clickEvent }: ButtonProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        clickEvent?.(e);
      }}
      className="lg:flex lg:gap-2 items-center lg:px-3.5 lg:py-1.5 lg:font-semibold lg:text-[15px] text-accent-lm bg-primary-lm hover:bg-accent-lm/10 transition duration-200 border-[1.5px] border-stroke-peach lg:rounded-full cursor-pointer"
    >
      <img src={icon} className="lg:size-5"></img>
      {label}
    </button>
  );
}

export function LikeButton({
  postId,
  initialLikeCount,
  onLikeCountChange,
}: {
  postId?: string;
  initialLikeCount?: number;
  onLikeCountChange?: (count: number) => void;
}) {
  const [likeState, setLikeState] = useState({
    isLiked: false,
    likeCount: typeof initialLikeCount === "number" ? initialLikeCount : 0,
  });

  useEffect(() => {
    let alive = true;
    if (!postId) return;

    // 1) Get liked state from cache (batched), avoid one-query-per-post.
    ensureLikeCached(postId);
    const cachedLiked = likedByPostId.get(postId);
    if (typeof cachedLiked === "boolean") {
      setLikeState((prev) => ({ ...prev, isLiked: cachedLiked }));
    }

    // 2) Only fetch like_count if we weren't given an initial count.
    if (typeof initialLikeCount !== "number") {
      void (async () => {
        const { data, error } = await supabase
          .from("all_posts")
          .select("like_count")
          .eq("post_id", postId)
          .maybeSingle();

        if (!alive) return;
        if (error) return;

        const countRaw = (data as unknown as { like_count?: unknown } | null)
          ?.like_count;
        const likeCount =
          typeof countRaw === "number" ? countRaw : Number(countRaw ?? 0);
        setLikeState((prev) => ({
          ...prev,
          likeCount: Math.max(0, likeCount),
        }));
      })();
    }

    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ postIds?: string[] }>;
      if (!ce?.detail?.postIds?.includes(postId)) return;
      const v = likedByPostId.get(postId);
      if (typeof v !== "boolean") return;
      setLikeState((prev) => ({ ...prev, isLiked: v }));
    };
    window.addEventListener(LIKES_CACHE_EVENT, handler as EventListener);

    return () => {
      alive = false;
      window.removeEventListener(LIKES_CACHE_EVENT, handler as EventListener);
    };
  }, [postId, initialLikeCount]);

  async function handleLikeState() {
    if (!postId) {
      setLikeState((prev) => ({
        isLiked: !prev.isLiked,
        likeCount: prev.isLiked ? prev.likeCount - 1 : prev.likeCount + 1,
      }));
      return;
    }

    const prev = likeState;
    // optimistic toggle
    setLikeState((p) => ({
      ...p,
      isLiked: !p.isLiked,
      likeCount: Math.max(0, p.likeCount + (!p.isLiked ? 1 : -1)),
    }));

    const { data, error } = await supabase
      .rpc("toggle_post_like", { p_post_id: postId })
      .single();

    if (error) {
      setLikeState(prev);
      console.error(error);
      toast.error("Failed to register like");
      return;
    }

    const row = data as unknown as { like_count?: unknown; liked?: unknown };
    const likeCount =
      typeof row.like_count === "number"
        ? row.like_count
        : Number(row.like_count ?? 0);
    const liked = Boolean(row.liked);
    likedByPostId.set(postId, liked);
    window.dispatchEvent(
      new CustomEvent(LIKES_CACHE_EVENT, { detail: { postIds: [postId] } }),
    );
    const finalCount = Math.max(0, likeCount);
    setLikeState({ likeCount: finalCount, isLiked: liked });
    onLikeCountChange?.(finalCount);
  }

  return (
    <ButtonBase
      icon={likeState.isLiked ? filledHeartIcon : heartIcon}
      label={likeState.likeCount === 0 ? "Like" : likeState.likeCount}
      clickEvent={() => void handleLikeState()}
    ></ButtonBase>
  );
}

export function CommentButton({
  postId,
  initialCommentCount,
  navigateTo,
}: {
  postId?: string;
  initialCommentCount?: number;
  navigateTo?: string;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [commentCount, setCommentCount] = useState(
    typeof initialCommentCount === "number" ? initialCommentCount : 0,
  );

  async function refreshCount(targetPostId: string) {
    const { count, error } = await supabase
      .from("comments")
      .select("comment_id", { count: "exact", head: true })
      .eq("post_id", targetPostId);

    if (error) {
      console.error(error);
      return;
    }

    const next = Math.max(0, Number(count ?? 0));
    setCommentCount(next);
  }

  useEffect(() => {
    if (!postId) return;
    // Avoid one COUNT(*) per post when we already got the count from the feed query.
    if (typeof initialCommentCount !== "number") {
      void refreshCount(postId);
    }
  }, [postId, initialCommentCount]);

  useEffect(() => {
    if (!postId) return;

    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ postId?: string }>;
      if (!ce?.detail?.postId) return;
      if (ce.detail.postId !== postId) return;
      void refreshCount(postId);
    };

    window.addEventListener(
      "campus:comments_changed",
      handler as EventListener,
    );
    return () =>
      window.removeEventListener(
        "campus:comments_changed",
        handler as EventListener,
      );
  }, [postId]);

  return (
    <ButtonBase
      icon={commentIcon}
      label={commentCount === 0 ? "Comment" : commentCount}
      clickEvent={() => {
        if (postId) {
          // persistent marker in case PostComments mounts after this event
          try {
            (window as any).__campus_last_focus_comment = {
              postId,
              ts: Date.now(),
            };
          } catch {}
          window.dispatchEvent(
            new CustomEvent("campus:focus_comment_input", {
              detail: { postId },
            }),
          );

          if (navigateTo && location.pathname !== navigateTo) {
            navigate(navigateTo);
          }
        }
      }}
    />
  );
}

export function ShareButton({
  postId,
  categorySet,
}: {
  postId?: string;
  categorySet?: string;
}) {
  async function handleShare() {
    const base = window.location.origin;
    const url = postId
      ? categorySet === "events"
        ? `${base}/events/${postId}`
        : categorySet === "collab"
          ? `${base}/collab/${postId}`
          : categorySet === "lostfound"
            ? `${base}/lost-and-found/${postId}`
            : categorySet === "qna"
              ? `${base}/qna/${postId}`
              : `${base}/post/${postId}`
      : window.location.href;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        toast.success("Linked copied!");
        return;
      }

      // Fallback for older browsers
      const el = document.createElement("textarea");
      el.value = url;
      el.setAttribute("readonly", "");
      el.style.position = "absolute";
      el.style.left = "-9999px";
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(el);
      if (ok) {
        toast.success("Linked copied!");
      } else {
        throw new Error("copy-failed");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to copy link");
    }
  }

  return (
    <ButtonBase
      icon={shareIcon}
      label={"Share"}
      clickEvent={() => void handleShare()}
    ></ButtonBase>
  );
}

const INTERESTED_EVENT_NAME = "campus:interested_changed";
const UPCOMING_EVENT_NAME = "campus:upcoming_events_changed";

export function InterestedButton({ postId }: { postId?: string }) {
  const [state, setState] = useState({ isInterested: false, loading: true });

  useEffect(() => {
    let alive = true;
    if (!postId) {
      setState({ isInterested: false, loading: false });
      return;
    }

    ensureInterestedCached(postId);
    const cached = interestedByPostId.get(postId);
    if (typeof cached === "boolean") {
      setState({ isInterested: cached, loading: false });
    } else {
      // Wait for batch to populate
      setState((s) => ({ ...s, loading: true }));
    }

    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ postIds?: string[] }>;
      if (!ce?.detail?.postIds?.includes(postId)) return;
      const v = interestedByPostId.get(postId);
      if (typeof v !== "boolean") return;
      if (!alive) return;
      setState({ isInterested: v, loading: false });
    };
    window.addEventListener(INTEREST_CACHE_EVENT, handler as EventListener);

    return () => {
      alive = false;
      window.removeEventListener(
        INTEREST_CACHE_EVENT,
        handler as EventListener,
      );
    };
  }, [postId]);

  async function toggleInterested() {
    if (!postId) return;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error(authError);
      toast.error("Failed to check login state");
      return;
    }

    if (!user) {
      toast.error("You must be logged in to mark interested");
      return;
    }

    const prev = state;
    setState((s) => ({ ...s, isInterested: !s.isInterested }));

    if (!prev.isInterested) {
      const { error } = await supabase.from("user_interested_posts").insert({
        post_id: postId,
        user_id: user.id,
      });

      if (error) {
        console.error(error);
        setState(prev);
        toast.error("Failed to mark interested");
        return;
      }
    } else {
      const { error } = await supabase
        .from("user_interested_posts")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id);

      if (error) {
        console.error(error);
        setState(prev);
        toast.error("Failed to remove interested");
        return;
      }
    }

    interestedByPostId.set(postId, !prev.isInterested);
    window.dispatchEvent(
      new CustomEvent(INTEREST_CACHE_EVENT, { detail: { postIds: [postId] } }),
    );

    window.dispatchEvent(new CustomEvent(INTERESTED_EVENT_NAME));
    window.dispatchEvent(new CustomEvent(UPCOMING_EVENT_NAME));
  }

  return (
    <ButtonBase
      icon={state.isInterested ? filledBellIcon : bellIcon}
      label={state.isInterested ? "Interested" : "Interested"}
      clickEvent={state.loading ? undefined : () => void toggleInterested()}
    />
  );
}
