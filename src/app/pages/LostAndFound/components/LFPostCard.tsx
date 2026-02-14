import { useEffect, useRef, useState } from "react";
import { Heart, MessageCircle, MoreVertical, Share2 } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { supabase } from "../../../../supabase/supabaseClient";

const lfAvatarCacheByAuthUid = new Map<string, string | null>();
const lfAvatarFetchInFlight = new Map<string, Promise<string | null>>();

export type LFPost = {
  id: string;
  title: string;
  author: string;
  authorCourse: string;
  authorAvatar?: string;
  authorAuthUid?: string;
  description: string;
  imageUrl?: string;
  reactions: number;
  comments: number;
  shares: number;
  timestamp: string;
};

/**
 * Lost & Found feed card.
 * (Moved out of LostFound.tsx so UserProfile can reuse it.)
 */
export function LFPostCard({
  post,
  onOpenComments,
  onEdit,
  onRemove,
  isLiked,
  onToggleLike,
}: {
  post: LFPost;
  onOpenComments: () => void;
  onEdit: () => void;
  onRemove: () => void;
  isLiked: boolean;
  onToggleLike: () => void;
}) {
  const descRef = useRef<HTMLDivElement | null>(null);
  const [collapsed, setCollapsed] = useState(true);
  const [showReadMore, setShowReadMore] = useState(false);
  const [resolvedAvatar, setResolvedAvatar] = useState<
    { authUid: string; url: string | null } | null
  >(null);

  const avatarSrc = (() => {
    const authUid = post.authorAuthUid;
    if (authUid) {
      const cached = lfAvatarCacheByAuthUid.get(authUid);
      if (cached !== undefined) return cached || "/placeholder.svg";
      if (resolvedAvatar?.authUid === authUid && resolvedAvatar.url) return resolvedAvatar.url;
    }
    return post.authorAvatar || "/placeholder.svg";
  })();

  useEffect(() => {
    let mounted = true;
    const authUid = post.authorAuthUid;
    if (!authUid) {
      return () => {
        mounted = false;
      };
    }

    const cached = lfAvatarCacheByAuthUid.get(authUid);
    if (cached !== undefined) {
      return () => {
        mounted = false;
      };
    }

    const existing = lfAvatarFetchInFlight.get(authUid);
    const promise =
      existing ??
      (async () => {
        const { data, error } = await supabase
          .from("user_profile")
          .select("profile_picture_url")
          .eq("auth_uid", authUid)
          .maybeSingle();
        if (error) throw error;
        const url = (data as unknown as { profile_picture_url?: unknown } | null)
          ?.profile_picture_url;
        return typeof url === "string" && url.trim() ? url : null;
      })();

    if (!existing) lfAvatarFetchInFlight.set(authUid, promise);

    promise
      .then((url) => {
        lfAvatarCacheByAuthUid.set(authUid, url);
        lfAvatarFetchInFlight.delete(authUid);
        if (mounted) setResolvedAvatar({ authUid, url });
      })
      .catch((e) => {
        lfAvatarCacheByAuthUid.set(authUid, null);
        lfAvatarFetchInFlight.delete(authUid);
        if (mounted) setResolvedAvatar({ authUid, url: null });
        console.error("Failed to load Lost&Found avatar:", e);
      });

    return () => {
      mounted = false;
    };
  }, [post.authorAuthUid]);

  useEffect(() => {
    const el = descRef.current;
    if (!el) return;

    const t = setTimeout(() => {
      setShowReadMore(el.scrollHeight > el.clientHeight + 1);
    }, 0);

    const onResize = () => {
      if (!el) return;
      setShowReadMore(el.scrollHeight > el.clientHeight + 1);
    };
    window.addEventListener("resize", onResize);

    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", onResize);
    };
  }, [post.description]);

  return (
    <div className="bg-secondary-lm lg:p-6 lg:rounded-xl lg:border border-stroke-grey hover:border-stroke-peach hover:bg-hover-lm lg:transition lg:animate-slide-in">
      <div className="lg:flex lg:items-start lg:justify-between lg:mb-3">
        <div>
          <h3 className="text-xl lg:font-bold text-text-lm">{post.title}</h3>
          <div className="lg:mt-2 lg:flex lg:items-center lg:gap-2">
            <Avatar className="lg:h-6 lg:w-6">
              <AvatarImage
                src={avatarSrc}
              />
              <AvatarFallback>{post.author[0]}</AvatarFallback>
            </Avatar>
            <span className="text-sm lg:font-medium text-text-lm">
              {post.author}
            </span>
            <span className="text-[12px] text-text-lighter-lm">
              {post.authorCourse}
            </span>
            <span className="text-[12px] text-text-lighter-lm">
              • {post.timestamp}
            </span>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="lg:p-1 lg:rounded hover:bg-secondary-lm"
              aria-label="Post options"
            >
              <MoreVertical className="lg:h-5 lg:w-5 text-accent-lm" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="bg-primary-lm lg:border border-stroke-grey text-text-lm lg:rounded-lg lg:shadow-md"
          >
            <DropdownMenuItem
              onClick={onEdit}
              className="text-accent-lm hover:bg-secondary-lm hover:text-accent-lm focus:bg-secondary-lm"
            >
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-accent-lm hover:bg-secondary-lm hover:text-accent-lm focus:bg-secondary-lm"
              onClick={onRemove}
            >
              Hide
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="lg:mb-4">
        <div
          ref={descRef}
          style={collapsed ? { maxHeight: "4.5rem", overflow: "hidden" } : undefined}
          className="text-text-lm lg:mb-2"
        >
          {post.description}
        </div>

        {showReadMore && (
          <Button
            variant="ghost"
            className="lg:ml-0 lg:h-auto lg:p-0 text-accent-lm"
            onClick={() => setCollapsed((c) => !c)}
          >
            {collapsed ? "Read More" : "Show less"}
          </Button>
        )}
      </div>

      {post.imageUrl && (
        <img
          src={post.imageUrl}
          alt="Lost item"
          className="lg:w-full lg:rounded-lg lg:border border-stroke-grey lg:mb-4"
        />
      )}

      <div className="lg:mt-4 lg:flex lg:items-center lg:gap-3">
        <button
          onClick={onToggleLike}
          className={
            "flex items-center gap-1.5 px-3 py-1 rounded-full border " +
            (isLiked
              ? "border-stroke-peach bg-accent-lm text-primary-lm"
              : "border-stroke-peach bg-secondary-lm text-accent-lm")
          }
        >
          <Heart
            className="lg:h-4 lg:w-4"
            fill={isLiked ? "currentColor" : "none"}
          />
          <span className="text-sm lg:font-bold">{post.reactions}</span>
        </button>

        <button
          className="lg:flex lg:items-center lg:gap-1.5 lg:px-3 lg:py-1 lg:rounded-full lg:border border-stroke-peach bg-secondary-lm text-accent-lm"
          onClick={onOpenComments}
        >
          <MessageCircle className="lg:h-4 lg:w-4" />
          <span className="text-sm lg:font-bold">{post.comments}</span>
        </button>

        <button className="lg:flex lg:items-center lg:gap-1.5 lg:px-3 lg:py-1 lg:rounded-full lg:border border-stroke-peach bg-secondary-lm text-accent-lm">
          <Share2 className="lg:h-4 lg:w-4" />
          <span className="text-sm lg:font-bold">{post.shares}</span>
        </button>
      </div>
    </div>
  );
}
