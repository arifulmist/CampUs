import { Link } from "react-router-dom";
import { ButtonCTA } from "@/components/ButtonCTA";
import type { InterestedItem } from "../backend/interestedStore";

export function InterestedPosts({ items }: { items: InterestedItem[] }) {
  return (
    <div className="lg:flex lg:flex-col lg:justify-between lg:w-full lg:h-fit bg-primary-lm border border-stroke-grey lg:rounded-2xl lg:overflow-hidden">
      <div className="lg:p-3 border border-t-0 border-l-0 border-r-0 border-b-stroke-grey">
        <h6 className="lg:font-[Poppins] lg:font-semibold text-text-lm">Interested Posts</h6>
      </div>

      {items.length === 0 ? (
        <div className="lg:p-4 lg:flex lg:flex-col lg:justify-start">
          <p className="text-text-lighter-lm text-md">No interested posts yet.</p>
        </div>
      ) : (
        <div className="lg:p-4 lg:flex lg:flex-col lg:justify-start">
          <div className="lg:flex lg:flex-col">
            {items
              .slice()
              .sort((a, b) => b.createdAt - a.createdAt)
              .map((item, index) => (
                <div
                  key={item.id}
                  className="lg:flex lg:flex-col lg:py-2 lg:px-3 hover:bg-secondary-lm hover:w-full hover:rounded-lg"
                >
                  <div className="lg:flex lg:items-start lg:justify-between lg:gap-4">
                    <div className="min-w-0">
                      <p className="lg:font-medium text-md text-text-lm truncate">{item.title}</p>
                      <p className="text-sm text-text-lighter-lm">
                        {item.category}
                        {item.userName ? ` • by ${item.userName}` : ""}
                      </p>

                      {item.tags && item.tags.length > 0 && (
                        <div className="lg:mt-2 lg:flex lg:gap-2 lg:flex-wrap">
                          {item.tags.map((tag) => (
                            <span
                              key={tag}
                              className="border border-stroke-peach text-accent-lm lg:px-2 lg:py-0.5 lg:rounded-full text-xs"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* <p className="text-xs text-text-lighter-lm whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </p> */}
                  </div>
                  {index !== items.length - 1 && (
                    <hr className="lg:mt-4 border-stroke-grey"></hr>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="lg:flex lg:justify-end lg:p-3 lg:w-full">
        <Link to="/collab">
          <ButtonCTA label={"Add More"} />
        </Link>
      </div>

    </div>
  );
}

export default InterestedPosts;
