import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

import postEmptyState from "@/assets/images/noPost.svg";
import { CategoryFilter } from "@/app/pages/CollabHub/components/CategoryFilter";

import LostFoundPost, { type LostFoundPostType } from "./components/LostFoundPost";
import CreateLostFoundModal from "./components/CreateLostFoundModal";

import { fetchLostAndFoundPosts } from "./backend/lostAndFoundService";
import { Loading } from "../Fallback/Loading";

type LFCategory = "all" | "lost" | "found";

export function LostFound() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<LostFoundPostType[]>([]);
  const [categories] = useState<LFCategory[]>(["all", "lost", "found"]);
  const [filter, setFilter] = useState<LFCategory>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);

  async function loadPosts() {
    setLoading(true);
    try {
      const backend = await fetchLostAndFoundPosts({ limit: 50, order: "newest" });
      const mapped: LostFoundPostType[] = (backend ?? []).map((p) => ({
        id: p.id,
        category: p.category === "found" ? "found" : "lost",
        title: p.title,
        author: p.authorName ?? "Unknown",
        authorAuthUid: p.authorAuthUid ?? undefined,
        deptBatch: p.authorCourse ?? "",
        body: p.description ?? "",
        image: p.imgUrl ?? null,
        likes: p.likeCount ?? 0,
        comments: p.commentCount ?? 0,
        createdAt: p.createdAt ?? null,
        profilePictureUrl: p.authorAvatar ?? null,
      }));
      setPosts(mapped);
    } catch (err) {
      console.error(err);
      toast.error("Error loading Lost & Found");
      setPosts([]);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }

  useEffect(() => {
    void loadPosts();
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return posts;
    return posts.filter((p) => p.category === filter);
  }, [posts, filter]);

  async function handleCreate() {
    await loadPosts();
  }

  if (initialLoad && loading) {
    return <Loading />;
  }

  return (
    <div className="lg:min-h-screen bg-background-lm">
      <div className="lg:flex lg:gap-10 lg:h-full lg:w-full lg:p-10">
        {/* LEFT: Posts */}
        <div className="lg:flex lg:flex-col lg:gap-10 lg:h-full bg-primary-lm lg:p-10 lg:rounded-2xl border border-stroke-grey">
          <button
            onClick={() => setModalOpen(true)}
            className="lg:w-full lg:rounded-lg lg:border border-stroke-grey bg-secondary-lm lg:px-4 lg:py-3 text-left text-accent-lm hover:bg-[#FFF4EE]"
          >
            Click to announce a Lost &amp; Found post here
          </button>

          <div className="lg:flex lg:items-center lg:justify-center">
            <div className="lg:w-[60vw] flex flex-col lg:gap-10">
              {loading ? (
                <p>Loading posts...</p>
              ) : filtered.length === 0 ? (
                <div className="lg:flex flex-col lg:items-center lg:justify-center lg:min-h-50 border-stroke-grey">
                  <img src={postEmptyState} className="lg:size-50" />
                  <p className="text-text-lighter-lm text-lg">No posts in this category</p>
                </div>
              ) : (
                filtered.map((p) => (
                  <LostFoundPost key={p.id} post={p} onClick={() => navigate(`/lost-and-found/${p.id}`)} />
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Categories */}
        <CategoryFilter categories={categories} selected={filter} onChange={setFilter} />
      </div>

      <CreateLostFoundModal open={modalOpen} onClose={() => setModalOpen(false)} onCreate={handleCreate} />
    </div>
  );
}

export default LostFound;
