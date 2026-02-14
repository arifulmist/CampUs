import { LikeButton, CommentButton, ShareButton } from "@/components/PostButtons";
import { UserInfo } from "@/components/UserInfo";

export function EventPostRoute()
{
  return(
    <div className="lg:flex lg:flex-col lg:gap-3 bg-secondary-lm hover:bg-hover-lm lg:transition border border-stroke-grey hover:border-stroke-peach lg:p-8 lg:rounded-2xl lg:animate-slide-in -mt-5 mb-5">
      {/* Category chip */}
      {/* {category && ( */}
        <div className="lg:mt-1 lg:mb-3">
          <p
            className={`inline-block px-4 py-1 rounded-full font-semibold text-text-lm text-base`}
          >
            Competition
          </p>
        </div>
      {/* )} */}
    
          {/* Title */}
          <h3 className="text-text-lm lg:font-extrabold lg:font-header">Ayayay</h3>
    
          {/* Tags */}
          {/* {tags && tags.length > 0 && ( */}
            <div className="lg:flex lg:gap-2 lg:flex-wrap">
              {/* {tags.map((t) => ( */}
                <p
                  // key={t}
                  className="lg:border border-accent-lm text-accent-lm lg:rounded-full lg:px-3 lg:py-1 text-sm"
                >
                  {/* #{t} */} #ge
                </p>
              {/* ))} */}
            </div>
          {/* )} */}
    
          {/* User info + dept/batch + date */}
          <div className="lg:120 lg:items-center lg:justify-between lg:mt-2">
            <UserInfo
              userName="KDKPathaoo"
              userBatch="CSE-23"
              userImg="@/assets/images/placeholderUser.png"
                postDate="12/20"
                userId="32332"
            />
          </div>
    
          {/* Body text */}
          <p className="mt-2">dijkdashdjahdkjaha</p>
    
          {/* Image */}
          {/* {content.img && ( */}
            <div className="lg:w-full lg:h-120 lg:overflow-hidden lg:mt-4">
              <img
                src="@/assets/images/placeholderPost.png"
                alt="event post"
                className="lg:object-cover lg:object-center lg:w-full lg:h-full lg:rounded-lg"
              />
            </div>
          {/* )} */}
    
          {/* Buttons */}
          <div className="lg:flex lg:gap-3 lg:justify-start lg:mt-3">
            <LikeButton />
            <CommentButton />
            <ShareButton />
          </div>
        </div>
  );
}