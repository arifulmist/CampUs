import { useEffect, useRef, useState } from "react";
import { UserInfo } from "@/components/UserInfo";
import { MoreVertical } from "lucide-react";
import { getCategoryClass } from "@/utils/categoryColors";

import { CommentButton, LikeButton, ShareButton } from "@/components/PostButtons";
import { LikedByText } from "@/components/LikedByText";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type LFPost = {
  id: string;
  category?: string;
  title: string;
  author: string;
  authorCourse: string;
  authorAvatar?: string;
  authorAuthUid?: string;
  description: string;
  imageUrl?: string;
  likeCount: number;
  commentCount: number;
  timestamp: string;
};

/**
 * Lost & Found feed card.
 * (Moved out of LostFound.tsx so UserProfile can reuse it.)
 */
export function LFPostCard({
  post,
  commentNavigateTo,
  onEdit,
  onRemove,
  showPostTypeLabel,
}: {
  post: LFPost;
  commentNavigateTo?: string;
  onEdit: () => void;
  onRemove: () => void;
  showPostTypeLabel?: boolean;
}) {
  const categoryLabel = (() => {
    const c = typeof post.category === "string" ? post.category.trim().toLowerCase() : "";
    if (c === "found") return "Found";
    if (c === "lost") return "Lost";
    return c ? c[0].toUpperCase() + c.slice(1) : null;
  })();

  const categoryKey = (() => {
    const c = typeof post.category === "string" ? post.category.trim().toLowerCase() : "";
    if (c === "lost" || c === "found") return c;
    return null;
  })();

  const descRef = useRef<HTMLDivElement | null>(null);
  const [collapsed, setCollapsed] = useState(true);
  const [showReadMore, setShowReadMore] = useState(false);

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
          {categoryLabel || showPostTypeLabel ? (
            <div className="flex items-center gap-2 lg:mb-2">
              {categoryLabel ? (
                <p
                  className={`inline-block px-4 py-1 rounded-full font-semibold text-text-lm text-base ${getCategoryClass(
                    categoryKey ?? undefined,
                    "lostfound"
                  )}`}
                >
                  {categoryLabel}
                </p>
              ) : null}
              {showPostTypeLabel ? (
                <>
                  <span className="text-text-lighter-lm">•</span>
                  <span className="text-base text-text-lm font-semibold">Lost and Found</span>
                </>
              ) : null}
            </div>
          ) : null}
          <h3 className="text-xl lg:font-bold text-text-lm">{post.title}</h3>
          <div className="lg:mt-2 lg:flex lg:items-center lg:gap-2">
            <UserInfo
              userImg={post.authorAvatar ?? undefined}
              userName={post.author}
              userBatch={post.authorCourse}
              userId={post.authorAuthUid}
              postDate={post.timestamp}
            />
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
          className="lg:size-40 lg:rounded-lg lg:border border-stroke-grey lg:mb-4"
        />
      )}

      {post.id && (post.likeCount ?? 0) > 0 && (
        <div className="lg:mb-2">
          <LikedByText postId={post.id} likeCount={post.likeCount ?? 0} />
        </div>
      )}

      <div className="lg:mt-4 lg:flex lg:items-center lg:gap-3">
        <LikeButton postId={post.id} initialLikeCount={post.likeCount} />
        <CommentButton
          postId={post.id}
          initialCommentCount={post.commentCount}
          navigateTo={commentNavigateTo}
        />
        <ShareButton postId={post.id} categorySet={"lostfound"} />
      </div>
    </div>
  );
}
