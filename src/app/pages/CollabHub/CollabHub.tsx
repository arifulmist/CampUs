import { useState, useMemo, useEffect } from "react";
import { placeholderUser } from "../../../mockData/placeholderUser";
import {
  LikeButton,
  CommentButton,
  ShareButton,
} from "../../../components/PostButtons";

import { UserInfo } from "@/components/UserInfo";
import { Button } from "@/components/ui/button";
import { CategoryFilter } from "@/app/pages/CollabHub/components/CategoryFilter";
import type { Category } from "@/app/pages/CollabHub/components/Category";
import CreateCollabPost from "./components/CreateCollabPost";
import { addNotification } from "../../../mockData/notifications";
import {
  addInterested,
  removeInterested,
  getInterested,
  subscribe as interestedSubscribe,
} from "@/app/pages/UserProfile/backend/interestedStore";

type CollabPost = {
  id: string;
  category: Category;
  title: string;
  content: string;
  user: typeof placeholderUser;
  tags: string[];
  likes: number;
  comments: number;
};

// Sample posts
const initialPosts: CollabPost[] = [
  {
    id: "p1",
    category: "competition",
    title: "Java Project Competition",
    content:
      "We are participating in a Java Project Competition. We are short of 2 persons on our team.",
    user: placeholderUser,
    tags: ["#java", "#javafx", "#postgresql"],
    likes: 3,
    comments: 1,
  },
  {
    id: "p2",
    category: "research",
    title: "Data collection for Diabetes research",
    content:
      "Currently working on a research paper related to Diabetes. Need people for data collection.",
    user: placeholderUser,
    tags: ["#biomed", "#research"],
    likes: 46,
    comments: 12,
  },
  {
    id: "p3",
    category: "project",
    title: "Web App Project Team",
    content:
      "Looking for a frontend developer to join our web app project on student productivity tracking.",
    user: placeholderUser,
    tags: ["#frontend", "#react"],
    likes: 12,
    comments: 2,
  },
];

export function CollabHub() {
  const [posts, setPosts] = useState<CollabPost[]>(initialPosts);
  const [filter, setFilter] = useState<Category>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [interestedIds, setInterestedIds] = useState<Set<string>>(new Set());

  const categories: Category[] = ["all", "research", "competition", "project"];

  const filteredPosts = useMemo(() => {
    if (filter === "all") return posts;
    return posts.filter((p) => p.category === filter);
  }, [filter, posts]);

  useEffect(() => {
    // Initialize from store and subscribe for changes
    setInterestedIds(new Set(getInterested().map((i) => i.id)));
    const unsub = interestedSubscribe((items) =>
      setInterestedIds(new Set(items.map((i) => i.id)))
    );
    return unsub;
  }, []);

  const toggleInterested = (p: CollabPost) => {
    if (interestedIds.has(p.id)) {
      removeInterested(p.id);
    } else {
      addInterested({
        id: p.id,
        title: p.title,
        category: p.category,
        tags: p.tags,
        userName: p.user.name,
        content: p.content,
        createdAt: Date.now(),
      });
    }
  };

  return (
    <div className="lg:flex lg:gap-10 lg:h-full lg:w-full lg:p-10 bg-background-lm lg:animate-slide-in">
      {/* LEFT: Posts */}
      <div className="lg:flex-1">
        <div className="lg:flex lg:flex-col lg:gap-10 lg:h-full bg-primary-lm lg:p-10 lg:rounded-2xl border-2 border-stroke-grey">
          {/* Announce collaboration */}
          <button
            onClick={() => setModalOpen(true)}
            className="lg:w-full lg:rounded-md lg:border border-stroke-grey bg-secondary-lm lg:px-4 lg:py-3 text-left text-sm text-accent-lm hover:bg-hover-lm lg:transition"
          >
            Click to post a collaboration post here.
          </button>

          {/* Posts */}
          {filteredPosts.length === 0 ? (
            <div className="lg:flex lg:items-center lg:justify-center lg:min-h-50 border-stroke-grey">
              <p className="text-text-lighter-lm text-lg">
                No posts in this category
              </p>
            </div>
          ) : (
            filteredPosts.map((p) => {
              const isInterested = interestedIds.has(p.id);
              return (
                <div
                  key={p.id}
                  className={`relative bg-secondary-lm hover:bg-hover-lm transition border-2 p-8 rounded-2xl ${
                    isInterested
                      ? "border-stroke-peach"
                      : "border-stroke-grey hover:border-stroke-peach"
                  }`}
                >
                  {/* CATEGORY TAG */}
                  <span className="lg:absolute lg:top-4 lg:right-4 lg:font-bold bg-accent-lm text-primary-lm lg:px-3 lg:py-1 lg:rounded-full text-m lg:uppercase lg:tracking-wide">
                    {p.category}
                  </span>
                  <UserInfo
                    userImg={p.user.imgURL}
                    userName={p.user.name}
                    userBatch={p.user.batch || "Student"}
                  />
                  <h3 className="lg:mt-2 lg:font-[Poppins] lg:font-semibold text-xl text-text-lm">
                    {p.title}
                  </h3>
                  <p className="text-text-lighter-lm text-md lg:leading-relaxed">
                    {p.content}
                  </p>

                  <div className="lg:my-4 lg:mb-10 lg:flex lg:gap-2 lg:flex-wrap">
                    {p.tags.map((tag) => (
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
                      <LikeButton />
                      <CommentButton />
                      <ShareButton />
                    </div>
                    <Button
                      onClick={() => toggleInterested(p)}
                      className={`${
                        isInterested
                          ? "bg-accent-lm text-primary-lm"
                          : "border border-stroke-peach bg-primary-lm text-accent-lm"
                      } rounded-full px-4 py-2 hover:bg-hover-btn-lm`}
                      aria-pressed={isInterested}
                      title={
                        isInterested
                          ? "Marked as Interested"
                          : "Mark Interested"
                      }
                    >
                      Interested
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <CategoryFilter
        categories={categories}
        selected={filter}
        onChange={setFilter}
      />

      <CreateCollabPost
        open={modalOpen}
        onOpenChange={setModalOpen}
        onCreate={(payload) => {
          const newPost: CollabPost = {
            id: `p${posts.length + 1}`,
            category: payload.category,
            title: payload.title,
            content: payload.description,
            user: placeholderUser,
            tags: payload.tags.map((t) => `#${t}`),
            likes: 0,
            comments: 0,
          };
          setPosts((prev) => [newPost, ...prev]);
          addNotification({
            type: "collab",
            title: `New Collab: ${newPost.title}`,
            description: newPost.content,
            path: "/collab",
          });
        }}
      />
    </div>
  );
}

export default CollabHub;
