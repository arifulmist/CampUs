import { UserInfo } from "./UserInfo";
import { CommentButton, LikeButton, ShareButton } from "./PostButtons";

interface PostContent {
  postId?: string;
  initialLikeCount?: number;
  initialCommentCount?: number;
  title: string;
  user: {
    name: string;
    batch: string;
    imgURL?: string | null;
    userId?: string;
  };
  content: {
    text: string;
    img?: string;
  };
  tags?: string[];
  category?: string;
  deptBatch?: string;
  formattedDate?: string;
}

export function PostBody({
  postId,
  initialLikeCount,
  initialCommentCount,
  title,
  user,
  content,
  tags,
  category,
  formattedDate,
}: PostContent) {
  const categoryClassMap: Record<string, string> = {
    workshop: "bg-[#75ea92]",
    seminar: "bg-[#71bdff]",
    course: "bg-[#c09ffa]",
    competition: "bg-[#e98181]",
  };

  const categoryLabel = category
    ? category.charAt(0).toUpperCase() + category.slice(1)
    : "";

  const categoryClasses = category
    ? categoryClassMap[category.toLowerCase()] ??
      "bg-secondary-lm border border-stroke-grey"
    : "";

  return (
    <div className="lg:flex lg:flex-col lg:gap-3 bg-secondary-lm hover:bg-hover-lm lg:transition border border-stroke-grey hover:border-stroke-peach lg:p-8 lg:rounded-2xl lg:animate-slide-in -mt-5 mb-5">
      {/* Category chip */}
      {category && (
        <div className="lg:mt-1 lg:mb-3">
          <p
            className={`inline-block px-4 py-1 rounded-full font-semibold text-text-lm text-base ${categoryClasses}`}
          >
            {categoryLabel}
          </p>
        </div>
      )}

      {/* Title */}
      <h3 className="text-text-lm lg:font-extrabold lg:font-header">{title}</h3>

      {/* Tags */}
      {tags && tags.length > 0 && (
        <div className="lg:flex lg:gap-2 lg:flex-wrap">
          {tags.map((t) => (
            <p
              key={t}
              className="lg:border border-accent-lm text-accent-lm lg:rounded-full lg:px-3 lg:py-1 text-sm"
            >
              #{t}
            </p>
          ))}
        </div>
      )}

      {/* User info + dept/batch + date */}
      <div className="lg:120 lg:items-center lg:justify-between lg:mt-2">
        <UserInfo
          userName={user.name}
          userBatch={user.batch}
          userImg={user.imgURL}
            postDate={formattedDate}
            userId={user.userId}
        />
      </div>

      {/* Body text */}
      <p className="mt-2">{content.text}</p>

      {/* Image */}
      {content.img && (
        <div className="lg:w-full lg:h-120 lg:overflow-hidden lg:mt-4">
          <img
            src={content.img}
            alt="event post"
            className="lg:object-cover lg:object-center lg:w-full lg:h-full lg:rounded-lg"
          />
        </div>
      )}

      {/* Buttons */}
      <div className="lg:flex lg:gap-3 lg:justify-start lg:mt-3">
        <LikeButton postId={postId} initialLikeCount={initialLikeCount} />
        <CommentButton postId={postId} initialCommentCount={initialCommentCount} />
        <ShareButton />
      </div>
    </div>
  );
}

