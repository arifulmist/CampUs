import { LikeButton, CommentButton, ShareButton } from "@/components/PostButtons";
import { UserInfo } from "@/components/UserInfo";
import { Button } from "@/components/ui/button";
import { getCategoryClass } from "@/utils/categoryColors";

import type { Category } from "./Category";

export type CollabPost = {
  id: string;
  category: Category;
  title: string;
  content: string;
  authorAuthUid: string;
  authorName: string;
  authorBatch: string;
  authorAvatarUrl: string | null;
  tags: string[];
  likes: number;
  comments: number;
};

export function CollabPostCard({
  post,
  isInterested,
  onToggleInterested,
}: {
  post: CollabPost;
  isInterested: boolean;
  onToggleInterested: (post: CollabPost) => void;
}) {
  return (
    <div
      className={`relative bg-secondary-lm hover:bg-hover-lm transition border-2 p-8 rounded-2xl ${
        isInterested
          ? "border-stroke-peach"
          : "border-stroke-grey hover:border-stroke-peach"
      }`}
    >
      <span
        className={`lg:absolute lg:top-4 lg:right-4 lg:font-bold text-primary-lm lg:px-3 lg:py-1 lg:rounded-full text-m lg:uppercase lg:tracking-wide ${getCategoryClass(
          post.category,
          "collab"
        )}`}
      >
        {post.category}
      </span>

      <UserInfo
        userImg={post.authorAvatarUrl}
        userName={post.authorName}
        userBatch={post.authorBatch || "Student"}
        userId={post.authorAuthUid}
      />

      <h3 className="lg:mt-2 lg:font-[Poppins] lg:font-semibold text-xl text-text-lm">
        {post.title}
      </h3>
      <p className="text-text-lighter-lm text-md lg:leading-relaxed">{post.content}</p>

      <div className="lg:my-4 lg:mb-10 lg:flex lg:gap-2 lg:flex-wrap">
        {post.tags.map((tag) => (
          <span
            key={tag}
            className="lg:font-bold text-accent-lm lg:border border-accent-lm lg:px-3 lg:py-1.5 lg:rounded-full text-sm"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="lg:flex lg:items-center lg:justify-between lg:mt-2">
        <div className="lg:flex lg:gap-4 lg:items-center">
          <LikeButton postId={post.id} initialLikeCount={post.likes} />
          <CommentButton postId={post.id} initialCommentCount={post.comments} />
          <ShareButton />
        </div>
        <Button
          onClick={() => onToggleInterested(post)}
          className={`${
            isInterested
              ? "bg-accent-lm text-primary-lm"
              : "border border-stroke-peach bg-primary-lm text-accent-lm"
          } rounded-full px-4 py-2 hover:bg-hover-btn-lm`}
          aria-pressed={isInterested}
          title={isInterested ? "Marked as Interested" : "Mark Interested"}
        >
          Interested
        </Button>
      </div>
    </div>
  );
}
