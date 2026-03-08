import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

import postEmptyState from "@/assets/images/noPost.svg";
import { CategoryFilter } from "@/app/pages/CollabHub/components/CategoryFilter";

import LostFoundPost, {
  type LostFoundPostType,
} from "./components/LostFoundPost";
import CreateLostFoundModal from "./components/CreateLostFoundModal";

import { fetchLostAndFoundPosts } from "./backend/lostAndFoundService";
import { Loading } from "../Fallback/Loading";
import {
  fetchAttachmentUrlsByPostIds,
  normalizeAttachmentUrls,
} from "@/utils/postAttachments";

type LFCategory = "all" | "lost" | "found";

export function LostFound() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<LostFoundPostType[]>([]);
  const [categories] = useState<LFCategory[]>(["all", "lost", "found"]);
  const [filter, setFilter] = useState<LFCategory>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [, setInitialLoad] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const PAGE_SIZE = 20;

  async function loadPosts({ reset }: { reset: boolean }) {
    if (reset) {
      setLoading(true);
      setInitialLoad(true);
      setHasMore(true);
      setPage(0);
      setPosts([]);
    } else {
      if (loadingMore || loading || !hasMore) return;
      setLoadingMore(true);
    }

    const offset = (reset ? 0 : page) * PAGE_SIZE;
    const categoryArg = filter === "all" ? null : filter;

    try {
      const backend = await fetchLostAndFoundPosts({
        limit: PAGE_SIZE,
        offset,
        order: "newest",
        category: categoryArg,
      });
      const mapped: LostFoundPostType[] = (backend ?? []).map((p) => ({
        id: p.id,
        category: p.category === "found" ? "found" : "lost",
        title: p.title,
        author: p.authorName ?? "Unknown",
        authorAuthUid: p.authorAuthUid ?? undefined,
        deptBatch: p.authorCourse ?? "",
        body: p.description ?? "",
        image: p.imgUrl ?? null,
        images: undefined,
        likes: p.likeCount ?? 0,
        comments: p.commentCount ?? 0,
        createdAt: p.createdAt ?? null,
        dateLostOrFound: p.dateLostOrFound ?? null,
        timeLostOrFound: p.timeLostOrFound ?? null,
        profilePictureUrl: p.authorAvatar ?? null,
      }));

      const ids = mapped.map((p) => p.id);
      const attachmentMap = await fetchAttachmentUrlsByPostIds(ids);
      const withAttachments: LostFoundPostType[] = mapped.map((p) => {
        const fromTable = attachmentMap.get(p.id) ?? [];
        const merged = normalizeAttachmentUrls([
          ...fromTable,
          p.image ?? undefined,
        ]);
        return {
          ...p,
          images: merged.length ? merged : undefined,
          image: merged[0] ?? p.image ?? null,
        };
      });

      setPosts((prev) =>
        reset ? withAttachments : [...prev, ...withAttachments],
      );
      setHasMore(withAttachments.length === PAGE_SIZE);
      setPage((p) => (reset ? 1 : p + 1));
    } catch (err) {
      console.error(err);
      toast.error("Error loading Lost & Found");
      if (reset) setPosts([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setInitialLoad(false);
    }
  }

  useEffect(() => {
    void loadPosts({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    if (!hasMore) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;
        void loadPosts({ reset: false });
      },
      { root: null, rootMargin: "400px", threshold: 0 },
    );

    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loadingMore, loading, page]);

  const filtered = useMemo(() => posts, [posts]);

  async function handleCreate() {
    await loadPosts({ reset: true });
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
                <Loading />
              ) : filtered.length === 0 ? (
                <div className="lg:flex flex-col lg:items-center lg:justify-center lg:min-h-50 border-stroke-grey">
                  <img src={postEmptyState} className="lg:size-50" />
                  <p className="text-text-lighter-lm text-lg">
                    No posts in this category
                  </p>
                </div>
              ) : (
                filtered.map((p) => (
                  <LostFoundPost
                    key={p.id}
                    post={p}
                    onClick={() => navigate(`/lost-and-found/${p.id}`)}
                  />
                ))
              )}

              {loadingMore ? (
                <div className="lg:flex lg:items-center lg:justify-center lg:py-4">
                  <p className="text-text-lighter-lm">Loading more…</p>
                </div>
              ) : null}

              <div ref={sentinelRef} />
            </div>
          </div>
        </div>

        {/* RIGHT: Categories */}
        <CategoryFilter
          categories={categories}
          selected={filter}
          onChange={setFilter}
        />
      </div>

      <CreateLostFoundModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}

export default LostFound;
