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
    <div className="flex flex-col gap-3 bg-secondary-lm hover:bg-hover-lm transition border-2 border-stroke-grey hover:border-stroke-peach p-8 rounded-2xl animate-slide-in">
      {category && (
        <div className="mt-1">
          <p
            className={`inline-block px-4 py-1 rounded-full font-semibold text-text-lm text-base ${categoryClasses}`}
            aria-label={`Category: ${categoryLabel}`}
          >
            {categoryLabel}
          </p>
        </div>
      )}
      
      <h3 className="text-text-lm font-bold font-[Poppins]">{title}</h3>
      {tags && tags.length > 0 && (
        <div className="flex gap-2 flex-wrap mt-2">
          {tags.map((t) => (
            <p
              key={t}
              className="border border-accent-lm text-accent-lm rounded-full px-3 py-1 text-sm"
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
        <div className="w-full h-120 overflow-hidden mt-4">
          <img
            src={content.img}
            alt="post"
            className="object-cover object-center w-full h-full rounded-lg"
          />
        </div>
      )}

      <div className="flex gap-3 justify-start">
        <LikeButton />
        <CommentButton />
        <ShareButton />
      </div>
    </div>
  );
}
