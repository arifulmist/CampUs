import { Link } from "react-router";
import { useUserProfileContext } from "./UserProfileContext";

function postPath(type: string, postId: string) {
  const t = type.trim().toLowerCase();
  const base = t === "lostfound" ? "lost-and-found" : t;
  return `/${base}/${postId}`;
}

export function UserPostsSection() {
  const { userPosts, userPostsLoading, userPostsError } = useUserProfileContext();

  return (
    <div className="bg-primary-lm border border-stroke-grey lg:rounded-xl lg:p-8 flex flex-col h-fit">
      <h4 className="font-header">Posts</h4>
      <div className="flex flex-col lg:gap-5 lg:mt-4">
        {userPostsLoading ? (
          <p className="text-sm text-text-lighter-lm">Loading…</p>
        ) : userPostsError ? (
          <p className="text-sm text-accent-lm">{userPostsError}</p>
        ) : userPosts.length === 0 ? (
          <p className="text-sm text-text-lighter-lm">No posts yet.</p>
        ) : (
          userPosts.map((p) => (
            <Link key={p.postId} to={postPath(p.type, p.postId)}>
              <div className="bg-secondary-lm hover:bg-hover-lm border border-stroke-grey hover:border-stroke-peach transition duration-200 lg:p-6 lg:rounded-lg cursor-pointer">
                <div className="text-xs text-text-lighter-lm">{p.type}</div>
                <h5 className="font-header">{p.title}</h5>
                <p className="text-sm text-text-lighter-lm">{p.description}</p>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
