import { useEffect, useState, type MouseEventHandler } from "react"
import { toast } from "react-hot-toast";

import heartIcon from "@/assets/icons/heart_icon.svg";
import filledHeartIcon from "@/assets/icons/FILLEDheart_icon.svg";
import commentIcon from "@/assets/icons/comment_icon.svg";
import shareIcon from "@/assets/icons/share_icon.svg";

// import { ShareModal } from "./ShareModal";

import { supabase } from "../../supabase/supabaseClient";


interface ButtonProps
{
  icon: string,
  label: string | number,
  clickEvent?: MouseEventHandler<HTMLButtonElement>
}

function ButtonBase({icon, label, clickEvent}:ButtonProps)
{
  return (
    <button onClick={clickEvent} className="lg:flex lg:gap-2 items-center lg:px-3.5 lg:py-1.5 lg:font-semibold lg:text-[15px] text-accent-lm bg-primary-lm hover:bg-accent-lm/10 transition duration-200 border-2 border-stroke-peach lg:rounded-full cursor-pointer">
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
    ></ButtonBase>
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