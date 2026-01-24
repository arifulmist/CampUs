import { Link } from "react-router-dom";
import { ButtonCTA } from "@/components/ButtonCTA";
import type { InterestedItem } from "../backend/interestedStore";

export function InterestedPosts({ items }: { items: InterestedItem[] }) {
  return (
    <section className="lg:rounded-2xl lg:border border-stroke-grey bg-primary-lm lg:shadow-sm lg:p-7 lg:min-h-50 lg:flex lg:flex-col">
      <div className="lg:mb-4 lg:flex lg:items-center lg:justify-between">
        <h2 className="text-lg lg:font-bold text-text-lm">Interested Posts</h2>
      </div>

      {items.length === 0 ? (
        <>
          <p className="text-sm text-text-lighter-lm">
            No interested posts yet.
          </p>
          <div className="lg:flex lg:justify-end lg:pt-3 lg:mt-auto">
            <Link to="/collab">
              <ButtonCTA label={"Add More"} />
            </Link>
          </div>
        </>
      ) : (
        <div className="lg:flex lg:flex-col lg:gap-4">
          {items
            .slice()
            .sort((a, b) => b.createdAt - a.createdAt)
            .map((item) => (
              <div
                key={item.id}
                className="lg:rounded-xl lg:border border-stroke-grey bg-secondary-lm lg:px-4 lg:py-3"
              >
                <div className="lg:flex lg:items-center lg:justify-between">
                  <div>
                    <div className="lg:font-semibold text-text-lm">
                      {item.title}
                    </div>
                    <div className="text-xs text-text-lighter-lm">
                      {item.category}
                      {item.userName ? ` • by ${item.userName}` : ""}
                    </div>
                    {item.tags && item.tags.length > 0 && (
                      <div className="lg:mt-2 lg:flex lg:gap-2 lg:flex-wrap">
                        {item.tags.map((tag) => (
                          <span
                            key={tag}
                            className="lg:font-bold bg-[#C23D00] text-[#FFFFFF] lg:px-2 lg:py-0.5 lg:rounded-full text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-text-lighter-lm">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          <div className="lg:flex lg:justify-end lg:pt-3 lg:mt-auto">
            <Link to="/collab">
              <ButtonCTA label={"Add More"} />
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}

export default InterestedPosts;
