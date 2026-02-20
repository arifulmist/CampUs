import { useEffect, useState, type MouseEventHandler } from "react"
import { toast } from "react-hot-toast";

import heartIcon from "@/assets/icons/heart_icon.svg";
import filledHeartIcon from "@/assets/icons/FILLEDheart_icon.svg";
import commentIcon from "@/assets/icons/comment_icon.svg";
import shareIcon from "@/assets/icons/share_icon.svg";
import bellIcon from "@/assets/icons/bell_icon.svg";
import filledBellIcon from "@/assets/icons/FILLEDbell_icon.svg";

// import { ShareModal } from "./ShareModal";

import { supabase } from "@/supabase/supabaseClient";


interface ButtonProps
{
  icon: string,
  label: string | number,
  clickEvent?: MouseEventHandler<HTMLButtonElement>
}

function ButtonBase({icon, label, clickEvent}:ButtonProps)
{
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
}: {
  postId?: string;
  initialLikeCount?: number;
}) {
  const [likeState, setLikeState] = useState({
    isLiked: false,
    likeCount: typeof initialLikeCount === "number" ? initialLikeCount : 0,
  });

  useEffect(() => {
    let alive = true;
    if (!postId) return;

    (async () => {
      const [{ data, error }, authRes] = await Promise.all([
        supabase
          .from("all_posts")
          .select("like_count")
          .eq("post_id", postId)
          .maybeSingle(),
        supabase.auth.getUser(),
      ]);

      if (!alive) return;
      if (error) return;

      const countRaw = (data as unknown as { like_count?: unknown } | null)?.like_count;
      const likeCount = typeof countRaw === "number" ? countRaw : Number(countRaw ?? 0);

      const userId = authRes.data.user?.id ?? null;
      let liked = false;
      if (userId) {
        const { data: likedRow } = await supabase
          .from("post_likes")
          .select("post_id")
          .eq("post_id", postId)
          .eq("user_id", userId)
          .maybeSingle();
        liked = Boolean(likedRow);
      }

      setLikeState({ likeCount: Math.max(0, likeCount), isLiked: liked });
    })();

    return () => {
      alive = false;
    };
  }, [postId]);

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
    const likeCount = typeof row.like_count === "number" ? row.like_count : Number(row.like_count ?? 0);
    setLikeState({ likeCount: Math.max(0, likeCount), isLiked: Boolean(row.liked) });
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
}: {
  postId?: string;
  initialCommentCount?: number;
}) {
  const [commentCount, setCommentCount] = useState(
    typeof initialCommentCount === "number" ? initialCommentCount : 0
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
    void refreshCount(postId);
  }, [postId]);

  useEffect(() => {
    if (!postId) return;

    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ postId?: string }>;
      if (!ce?.detail?.postId) return;
      if (ce.detail.postId !== postId) return;
      void refreshCount(postId);
    };

    window.addEventListener("campus:comments_changed", handler as EventListener);
    return () => window.removeEventListener("campus:comments_changed", handler as EventListener);
  }, [postId]);

  return (
    <ButtonBase
      icon={commentIcon}
      label={commentCount === 0 ? "Comment" : commentCount}
      clickEvent={() => {
        if (postId) {
          // persistent marker in case PostComments mounts after this event
          try {
            (window as any).__campus_last_focus_comment = { postId, ts: Date.now() };
          } catch {}
          window.dispatchEvent(new CustomEvent("campus:focus_comment_input", { detail: { postId } }));
        }
      }}
    />
  );
}

export function ShareButton()
{
  // const [isClicked, setIsClicked]=useState(false);

  return (
    <>
      <ButtonBase icon={shareIcon} label={"Share"}></ButtonBase>
      {/* {isClicked && <ShareModal/>} */}
    </>
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

    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!alive) return;

        if (!user) {
          setState({ isInterested: false, loading: false });
          return;
        }

        const { data, error } = await supabase
          .from("user_interested_posts")
          .select("id")
          .eq("post_id", postId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (!alive) return;
        if (error) {
          console.error(error);
          setState({ isInterested: false, loading: false });
          return;
        }

        setState({ isInterested: Boolean(data), loading: false });
      } catch (e) {
        console.error(e);
        if (alive) setState({ isInterested: false, loading: false });
      }
    })();

    return () => {
      alive = false;
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