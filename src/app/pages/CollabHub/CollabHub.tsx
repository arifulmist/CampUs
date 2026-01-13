import { useState, useMemo, useEffect } from "react";
import { placeholderUser } from "../../../lib/placeholderUser";
import {
  LikeButton,
  CommentButton,
  ShareButton,
} from "../../../components/PostButtons";

import { UserInfo } from "@/components/UserInfo";
import { Button } from "@/components/ui/button";
import { CategoryFilter } from "@/components/Category_Events_CollabHub/CategoryFilter";
import type { Category } from "@/components/Category_Events_CollabHub/Category";
import CreateCollabPost from "./components/CreateCollabPost";
import { addNotification } from "../../../lib/notifications";
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
    <div className="flex gap-10 h-full w-full p-10 bg-background-lm animate-slide-in">
      {/* LEFT: Posts */}
      <div className="flex-1">
        <div className="flex flex-col gap-10 h-full bg-primary-lm p-10 rounded-2xl border-2 border-stroke-grey">
          {/* Announce collaboration */}
          <button
            onClick={() => setModalOpen(true)}
            className="w-full rounded-md border border-stroke-grey bg-secondary-lm px-4 py-3 text-left text-sm text-accent-lm hover:bg-hover-lm transition "
          >
            Click to post a collaboration post here.
          </button>

          {/* Posts */}
          {filteredPosts.length === 0 ? (
            <div className="flex items-center justify-center min-h-50 border-stroke-grey">
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
                  <span className="absolute top-4 right-4 font-bold bg-accent-lm text-primary-lm px-3 py-1 rounded-full text-m uppercase tracking-wide">
                    {p.category}
                  </span>
                  <UserInfo
                    userImg={p.user.imgURL}
                    userName={p.user.name}
                    userBatch={p.user.batch || "Student"}
                  />
                  <h3 className="mt-2 font-[Poppins] font-semibold text-xl text-text-lm">
                    {p.title}
                  </h3>
                  <p className="text-text-lighter-lm text-md leading-relaxed">
                    {p.content}
                  </p>

                  <div className="my-4 mb-10 flex gap-2 flex-wrap">
                    {p.tags.map((tag) => (
                      <span
                        key={tag}
                        className="font-bold text-accent-lm border border-accent-lm px-3 py-1.5 rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex gap-4 items-center">
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
