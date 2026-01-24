import { UserInfo } from "./UserInfo";
import { CommentButton, LikeButton, ShareButton } from "./PostButtons";

interface PostContent
{
  title: string;
  user:{
    name: string;
    batch: string;
    imgURL: string;
  };
  content:{
    text: string;
    img?: string;
  };
  tags?: string[];
  category?: string;
}

export function PostBody({ title, user, content, tags, category }: PostContent)
{
  const categoryClassMap: Record<string, string> = 
  {
    workshop: "bg-[#75ea92]",
    seminar: "bg-[#71bdff]",
    course: "bg-[#c09ffa]",
    competition: "bg-[#e98181]",
  };

  const categoryLabel = category
    ? category.charAt(0).toUpperCase() + category.slice(1)
    : "";

  const categoryClasses = category ? categoryClassMap[category] ?? "bg-secondary-lm text-text-lm border border-stroke-grey" : "";

  return(
    <div className="lg:flex lg:flex-col lg:gap-3 bg-secondary-lm hover:bg-hover-lm lg:transition border border-stroke-grey hover:border-stroke-peach lg:p-8 lg:rounded-2xl lg:animate-slide-in -mt-5 mb-5">
      {category && (
        <div className="lg:mt-1">
          <p
            className={`inline-block px-4 py-1 rounded-full font-semibold text-text-lm text-base ${categoryClasses}`}
            aria-label={`Category: ${categoryLabel}`}
          >
            {categoryLabel}
          </p>
        </div>
      )}
      
      <h3 className="text-text-lm m-0 lg:font-bold lg:font-[Poppins]">{title}</h3>
      {tags && tags.length > 0 && (
        <div className="lg:flex lg:gap-2 lg:flex-wrap lg:mt-2">
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

      <UserInfo
        userName={user.name}
        userBatch={user.batch}
        userImg={user.imgURL}
      ></UserInfo>
      <p>{content.text}</p>
      {content.img && (
        <div className="lg:w-full lg:h-120 lg:overflow-hidden lg:mt-4">
          <img
            src={content.img}
            alt="post"
            className="lg:object-cover lg:object-center lg:w-full lg:h-full lg:rounded-lg"
          />
        </div>
      )}

      <div className="lg:flex lg:gap-3 lg:justify-start">
        <LikeButton />
        <CommentButton />
        <ShareButton />
      </div>
    </div>
  );
}
