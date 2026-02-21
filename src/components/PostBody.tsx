import { UserInfo } from "./UserInfo";
import { CommentButton, InterestedButton, LikeButton, ShareButton } from "./PostButtons";
import { getCategoryClass } from "@/utils/categoryColors";
import {
  formatDateToLocale,
  formatTime12hFromTimeString,
  isSameDay,
} from "@/utils/datetime";

function formatEventDateDisplay(dateString?: string | null) {
  return formatDateToLocale(dateString, "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface PostContent {
  postId?: string;
  initialLikeCount?: number;
  initialCommentCount?: number;
  categorySet?: "events" | "collab" | "lostfound";
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
    imgs?: string[];
  };
  eventStartDate?: string | null;
  eventEndDate?: string | null;
  location?: string | null;
  tags?: string[];
  category?: string;
  deptBatch?: string;
  formattedDate?: string;
  lostFoundDate?: string | null;
  lostFoundTime?: string | null;
}

function normalizeImages(content: { img?: string; imgs?: string[] }): string[] {
  const fromArray = Array.isArray(content.imgs) ? content.imgs : [];
  const out = [...fromArray, content.img].filter((v): v is string => typeof v === "string");
  const trimmed = out.map((v) => v.trim()).filter((v) => v.length > 0);

  const seen = new Set<string>();
  const uniq: string[] = [];
  for (const url of trimmed) {
    if (seen.has(url)) continue;
    seen.add(url);
    uniq.push(url);
  }

  return uniq;
}

export function PostBody({
  postId,
  initialLikeCount,
  initialCommentCount,
  categorySet,
  title,
  user,
  content,
  tags,
  category,
  formattedDate,
  lostFoundDate,
  lostFoundTime,
  eventStartDate,
  eventEndDate,
  location,
}: PostContent) {
  const categoryLabel = category ? category.charAt(0).toUpperCase() + category.slice(1) : "";
  const categoryClasses = category ? getCategoryClass(category, categorySet) : "";

  const commentNavigateTo =
    postId && categorySet === "events"
      ? `/events/${postId}`
      : postId && categorySet === "collab"
        ? `/collab/${postId}`
        : postId && categorySet === "lostfound"
          ? `/lost-and-found/${postId}`
          : undefined;

  const images = normalizeImages(content);
  const shouldUseFeedCollage = (categorySet === "events" || categorySet === "lostfound") && images.length > 1;

  const feedCollage = shouldUseFeedCollage ? (() => {
    const total = images.length;
    const shown = images.slice(0, 3);
    const remaining = Math.max(0, total - 3);

    // Layout rules (feed):
    // - show up to 3 images
    // - if >3, show a 4th grey tile with +N
    if (total >= 4) {
      return (
        <div className="lg:w-full lg:h-120 lg:overflow-hidden lg:mt-4">
          <div className="grid grid-cols-2 grid-rows-2 gap-2 w-full h-full">
            {shown.map((src, idx) => (
              <div key={src + idx} className="w-full h-full overflow-hidden rounded-lg">
                <img src={src} alt="post attachment" className="w-full h-full object-cover" />
              </div>
            ))}
            <div className="w-full h-full rounded-lg bg-stroke-grey flex items-center justify-center">
              <p className="text-text-lm font-semibold text-3xl">+{remaining}</p>
            </div>
          </div>
        </div>
      );
    }

    if (total === 3) {
      return (
        <div className="lg:w-full lg:h-120 lg:overflow-hidden lg:mt-4">
          <div className="grid grid-cols-3 gap-2 w-full h-full">
            {shown.map((src, idx) => (
              <div key={src + idx} className="w-full h-full overflow-hidden rounded-lg">
                <img src={src} alt="post attachment" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      );
    }

    // total === 2
    return (
      <div className="lg:w-full lg:h-120 lg:overflow-hidden lg:mt-4">
        <div className="grid grid-cols-2 gap-2 w-full h-full">
          {shown.map((src, idx) => (
            <div key={src + idx} className="w-full h-full overflow-hidden rounded-lg">
              <img src={src} alt="post attachment" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      </div>
    );
  })() : null;

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
      <h3 className="text-text-lm lg:font-bold lg:font-header">{title}</h3>

      {(categorySet === "lostfound" && (lostFoundDate || lostFoundTime)) && (
        <div>
          {lostFoundDate ? (
            <p className="text-text-lm font-semibold text-md">
              {`${categoryLabel ? `Date ${categoryLabel}: ` : "Date: "}${formatDateToLocale(lostFoundDate, "en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}`}
            </p>
          ) : null}
          {lostFoundTime ? (
            <p className="text-text-lm font-semibold text-md mt-1">
              {`${categoryLabel ? `Time ${categoryLabel}: ` : "Time: "}${formatTime12hFromTimeString(lostFoundTime, {
                spaceBeforePeriod: true,
                periodCase: "upper",
                convertOffsetToLocal: false,
              })}`}
            </p>
          ) : null}
        </div>
      )}

      {(eventStartDate || eventEndDate || location) && (
        <div>
          {(eventStartDate || eventEndDate) && (
            <p className="text-accent-lm font-semibold text-md">
              {eventStartDate && eventEndDate && isSameDay(eventStartDate, eventEndDate)
                ? formatEventDateDisplay(eventStartDate)
                : (
                    <>
                      {eventStartDate ? formatEventDateDisplay(eventStartDate) : ""}
                      {eventStartDate && eventEndDate ? " \u2014 " : ""}
                      {eventEndDate ? formatEventDateDisplay(eventEndDate) : ""}
                    </>
                  )}
            </p>
          )}

          {location ? (
            <p className="text-text-lm font-semibold text-md mt-1">{location}</p>
          ) : null}
        </div>
      )}

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

      {/* Images */}
      {feedCollage}
      {!shouldUseFeedCollage && content.img ? (
        <div className="lg:w-full lg:h-120 lg:overflow-hidden lg:mt-4">
          <img
            src={content.img}
            alt="event post"
            className="lg:object-cover lg:object-center lg:w-full lg:h-full lg:rounded-lg"
          />
        </div>
      ) : null}

      {/* Buttons */}
      <div className="lg:flex lg:items-center lg:justify-between lg:mt-3">
        <div className="lg:flex lg:gap-3 lg:justify-start">
          <LikeButton postId={postId} initialLikeCount={initialLikeCount} />
          <CommentButton postId={postId} initialCommentCount={initialCommentCount} navigateTo={commentNavigateTo} />
          <ShareButton postId={postId} categorySet={categorySet} />
        </div>
        <div>{postId && categorySet === "events" ? <InterestedButton postId={postId} /> : null}</div>
      </div>
    </div>
  );
}

