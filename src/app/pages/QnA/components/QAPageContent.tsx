// import { useState, useEffect } from "react";
// import { Search } from "lucide-react";
// import { Button } from "../../../../components/ui/button";
// import { Input } from "../../../../components/ui/input";
// import { supabase } from "@/supabase/supabaseClient";
// import PostCard from "./PostCard";
// import type { Post } from "./types";
// import QnaPost from "../components/QnaPost";
// import PostDetail from "../components/PostDetail";
// import toast from "react-hot-toast";
// /* -------------------- TIME FORMATTER -------------------- */
// export function formatPostTimestamp(createdAt: string): string {
//   const date = new Date(createdAt);
//   const now = new Date();
//   const diffMs = now.getTime() - date.getTime();
//   const diffMinutes = Math.floor(diffMs / 60000);
//   const diffHours = Math.floor(diffMinutes / 60);
//   const diffDays = Math.floor(diffHours / 24);

//   if (diffMinutes < 1) return "Posted just now";
//   if (diffMinutes < 60) return `Posted ${diffMinutes} min ago`;
//   if (diffHours < 24) return `Posted ${diffHours} hr ago`;
//   if (diffDays < 7) return `Posted ${diffDays} days ago`;

//   return `Posted on ${date.toLocaleDateString("en-GB", {
//     day: "2-digit",
//     month: "short",
//     year: "numeric",
//   })}`;
// }

// /* -------------------- MAIN COMPONENT -------------------- */
// export default function QAPageContent() {
//   const [posts, setPosts] = useState<Post[]>([]);
//   const [activeTab, setActiveTab] = useState<"All" | "Question" | "Advice" | "Resource">("All");
//   const [searchQuery, setSearchQuery] = useState("");
//   const [selectedPost, setSelectedPost] = useState<Post | null>(null);
//   const [isNewPostOpen, setIsNewPostOpen] = useState(false);
//   const [currentUserUid, setCurrentUserUid] = useState<string | null>(null);

//   /* -------------------- AUTH USER -------------------- */
//   useEffect(() => {
//     supabase.auth.getUser().then(({ data }) => {
//       setCurrentUserUid(data.user?.id ?? null);
//     });
//   }, []);

//   /* -------------------- FETCH POSTS -------------------- */
//   useEffect(() => {
//     async function fetchPosts() {
//       try {
//         const { data, error } = await supabase
//           .from("all_posts")
//           .select(`
//             post_id,
//             title,
//             description,
//             like_count,
//             comment_count,
//             created_at,
//             qna_posts!inner(
//               img_url,
//               qna_category(category_name)
//             ),
//             author:user_info!fk_author(
//               name,
//               auth_uid,
//               batch,
//               user_profile(profile_picture_url),
//               departments_lookup!inner(department_name)
//             )
//           `)
//           .order("created_at", { ascending: false });

//         if (error) throw error;
//         if (!data) return;

//         /* ---- TAGS ---- */
//         const postIds = data.map((p: any) => p.post_id);
//         const { data: tagsData } = await supabase
//           .from("post_tags")
//           .select("post_id, skill:skills_lookup(skill)")
//           .in("post_id", postIds);

//         const tagMap: Record<string, string[]> = {};
//         tagsData?.forEach((t: any) => {
//           if (!tagMap[t.post_id]) tagMap[t.post_id] = [];
//           if (t.skill?.skill) tagMap[t.post_id].push(t.skill.skill);
//         });

//         const formatted: Post[] = data.map((p: any) => ({
//           id: p.post_id,
//           title: p.title,
//           content: p.description,
//           author: p.author?.name ?? "Unknown",
//           authorAvatar: p.author?.user_profile?.profile_picture_url ?? null,
//           authorCourse:
//             p.author?.departments_lookup?.department_name && p.author?.batch
//               ? `${p.author.departments_lookup.department_name}-${p.author.batch}`
//               : "N/A",
//           category: p.qna_posts?.qna_category?.category_name ?? "Question",
//           tags: tagMap[p.post_id] ?? [],
//           reactions: p.like_count ?? 0,
//           comments: p.comment_count ?? 0,
//           shares: 0,
//           createdAt: p.created_at,
//           timestamp: formatPostTimestamp(p.created_at),
//           imageUrl: p.qna_posts?.img_url ?? null,
//           authorUid: p.author?.auth_uid ?? null, 
//           likedByUser: p.liked_by_user || false,
//         }));

//         setPosts(formatted);
//       } catch (err) {
//         console.error(err);
//         toast.error("Failed to load posts");
//       }
//     }

//     fetchPosts();
//   }, [isNewPostOpen]);
  
//   /* -------------------- FILTER -------------------- */
//   const filteredPosts = posts.filter(
//     (p) =>
//       (activeTab === "All" || p.category === activeTab) &&
//       p.title.toLowerCase().includes(searchQuery.toLowerCase())
//   );

//   /* -------------------- ACTIONS -------------------- */
//  const toggleLike = async (postId: string, liked: boolean) => {
//   if (liked) {
//     const { error } = await supabase.rpc("decrement_post_likes", { p_id: postId });
//     if (!error) {
//       setPosts((prev) =>
//         prev.map((p) =>
//           p.id === postId ? { ...p, reactions: p.reactions - 1, likedByUser: false } : p
//         )
//       );
//     }
//   } else {
//     const { error } = await supabase.rpc("increment_post_likes", { p_id: postId });
//     if (!error) {
//       setPosts((prev) =>
//         prev.map((p) =>
//           p.id === postId ? { ...p, reactions: p.reactions + 1, likedByUser: true } : p
//         )
//       );
//     }
//   }
// };


//   const addInlineComment = async (postId: string, text: string) => {
//     if (!text.trim()) return;
//     const { error } = await supabase.from("comments").insert({ post_id: postId, content: text });
//     if (!error) {
//       setPosts((prev) =>
//         prev.map((p) => (p.id === postId ? { ...p, comments: p.comments + 1 } : p))
//       );
//     }
//   };

//   /* -------------------- UI -------------------- */
//   return (
//     <div className="min-h-screen bg-background-lm">
//       <main className="mx-auto max-w-4xl px-4 py-6">
//         {selectedPost ? (
//           <PostDetail
//             post={{ ...selectedPost, comments: selectedPost.comments }}
//             onBack={() => setSelectedPost(null)}
//           />
//         ) : (
//           <>
//             {/* Search */}
//             <div className="flex gap-3 mb-6">
//                <button
//             onClick={() => setIsNewPostOpen(true)}
//             className="lg:w-full lg:rounded-lg lg:border border-stroke-grey bg-secondary-lm lg:px-4 lg:py-3 text-left text-accent-lm hover:bg-[#FFF4EE]"
//           >
//             Add new post
//           </button>
              
//             </div>
             
//             {/* Tabs */}
//             <div className="flex justify-center gap-2 mb-6">
//               {(["All", "Question", "Advice", "Resource"] as const).map((tab) => (
//                 <button
//                   key={tab}
//                   onClick={() => setActiveTab(tab)}
//                   className={`px-4 py-2 rounded-full ${
//                     activeTab === tab ? "bg-accent-lm text-white" : "bg-primary-lm"
//                   }`}
//                 >
//                   {tab}
//                 </button>
//               ))}
//             </div>

//             {/* Posts */}
//             <div className="space-y-4">
//               {filteredPosts.map((post) => (
//                 <PostCard
//                   key={post.id}
//                   post={post}
//                   isOwner={post.authorUid === currentUserUid}
//                   onOpenDetail={() => setSelectedPost(post)}
//                   onLike={() => toggleLike(post.id, post.likedByUser ?? false)}
//                   onAddInlineComment={(t) => addInlineComment(post.id, t)}
//                 />
//               ))}
//             </div>
//           </>
//         )}
//       </main>

//       <QnaPost
//         open={isNewPostOpen}
//         onOpenChange={setIsNewPostOpen}
//         onCreate={() => setIsNewPostOpen(false)}
//       />
//     </div>
//   );
// }

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

import { supabase } from "@/supabase/supabaseClient";

import { QnAPostCard } from "./QnAPostCard";
import { QnAPostCategory } from "./QnAPostCategory";
import { SearchAddPostBar } from "./SearchAddPostBar";
import { Loading } from "../../Fallback/Loading";
import noPostSvg from "@/assets/images/noPost.svg";
import { CreateQnAPostModal } from "./CreateQnAPostModal";
import { formatPostedTimestamp } from "@/utils/datetime";

type QnACategory = "All" | "Question" | "Advice" | "Resource";

type QnAFeedPost = {
  id: string;
  title: string;
  description: string;
  category: Exclude<QnACategory, "All">;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  attachmentUrl: string | null;
  authorName: string;
  authorBatch: string;
  authorId: string | null;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function getRecord(obj: Record<string, unknown>, key: string): Record<string, unknown> | null {
  const v = obj[key];
  return isRecord(v) ? v : null;
}

const formatPostTimestamp = formatPostedTimestamp;

function truncateText(value: string, maxChars: number) {
  if (value.length <= maxChars) return value;
  return value.slice(0, Math.max(0, maxChars)).trimEnd() + "…";
}

function toPromise<T>(thenable: PromiseLike<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    thenable.then(resolve, reject);
  });
}

async function withTimeout<T>(thenable: PromiseLike<T>, ms: number, label: string): Promise<T> {
  let t: number | null = null;
  try {
    return await Promise.race([
      toPromise(thenable),
      new Promise<T>((_, reject) => {
        t = window.setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    if (t !== null) window.clearTimeout(t);
  }
}

export function QAPageContent() {
  const navigate = useNavigate();
  const DEBUG = import.meta.env.DEV;
  const [posts, setPosts] = useState<QnAFeedPost[]>([]);
  const [activeCategory, setActiveCategory] = useState<QnACategory>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [initialLoadTimeout, setInitialLoadTimeout] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [newPostOpen, setNewPostOpen] = useState(false);
  const [refreshSeq, setRefreshSeq] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const inFlightRef = useRef(false);
  const mountedRef = useRef(true);
  const pageRef = useRef(0);
  const hasMoreRef = useRef(true);
  const loadingRef = useRef(true);
  const loadingMoreRef = useRef(false);
  const activeCategoryRef = useRef<QnACategory>("All");
  const searchRef = useRef<string>("");

  const PAGE_SIZE = 20;

  useEffect(() => {
    // React StrictMode runs effect setup/cleanup twice in dev.
    // Ensure the ref is reset on the second setup.
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!(initialLoad && loading)) {
      setInitialLoadTimeout(false);
      return;
    }

    const t = window.setTimeout(() => {
      if (mountedRef.current) setInitialLoadTimeout(true);
    }, 9000);

    return () => window.clearTimeout(t);
  }, [initialLoad, loading]);

  useEffect(() => {
    activeCategoryRef.current = activeCategory;
  }, [activeCategory]);

  useEffect(() => {
    searchRef.current = debouncedSearch;
  }, [debouncedSearch]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchQuery.trim()), 250);
    return () => window.clearTimeout(t);
  }, [searchQuery]);

  const loadPage = useCallback(async ({ reset }: { reset: boolean }) => {
      if (inFlightRef.current) return;
      if (!reset && (loadingRef.current || loadingMoreRef.current || !hasMoreRef.current)) return;

      inFlightRef.current = true;
      if (reset) {
        loadingRef.current = true;
        setLoading(true);
        setInitialLoad(true);
        setLoadError(null);

        hasMoreRef.current = true;

        pageRef.current = 0;
        setPosts([]);
      } else {
        loadingMoreRef.current = true;
        setLoadingMore(true);
      }

      const offset = (reset ? 0 : pageRef.current) * PAGE_SIZE;
      const cat = activeCategoryRef.current;
      const categoryArg = cat === "All" ? null : cat;
      const searchArg = searchRef.current ? searchRef.current : null;

      if (DEBUG) console.log("[QnA] loadPage", { reset, offset, categoryArg, searchArg });

      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
        const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY as string | undefined;
        if (!supabaseUrl || !supabaseKey) {
          throw new Error(
            "Supabase env vars are missing. Check VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY."
          );
        }

        let mapped: QnAFeedPost[] = [];

        async function fetchFallback(): Promise<QnAFeedPost[]> {
          let q = supabase
            .from("all_posts")
            .select(
              `post_id,title,description,like_count,comment_count,created_at,
               qna_posts!inner(img_url,qna_category(category_name)),
               author:user_info!fk_author(name,auth_uid,batch,departments_lookup!inner(department_name))`
            )
            .order("created_at", { ascending: false })
            .range(offset, offset + PAGE_SIZE - 1);

          if (categoryArg) q = q.eq("qna_posts.qna_category.category_name", categoryArg);
          if (searchArg) q = q.or(`title.ilike.%${searchArg}%,description.ilike.%${searchArg}%`);

          const { data, error } = await withTimeout(q, 8000, "QnA fallback query");
          if (error) throw error;

          const rows = (data ?? []) as unknown[];
          return rows
            .map((row) => {
              if (!isRecord(row)) return null;

              const id = row.post_id;
              const title = row.title;
              const description = row.description;
              const createdAt = row.created_at;

              const qnaPosts = getRecord(row, "qna_posts");
              const qnaCategory = qnaPosts ? getRecord(qnaPosts, "qna_category") : null;
              const categoryName = qnaCategory?.category_name;

              const attachmentRaw = qnaPosts?.img_url;
              const attachmentUrl = typeof attachmentRaw === "string" && attachmentRaw.trim() ? attachmentRaw : null;

              const category: QnAFeedPost["category"] =
                categoryName === "Advice" || categoryName === "Resource" || categoryName === "Question"
                  ? categoryName
                  : "Question";

              const likeCountRaw = row.like_count;
              const commentCountRaw = row.comment_count;
              const likeCount = typeof likeCountRaw === "number" ? likeCountRaw : Number(likeCountRaw ?? 0);
              const commentCount =
                typeof commentCountRaw === "number" ? commentCountRaw : Number(commentCountRaw ?? 0);

              const author = getRecord(row, "author");
              const authorName = author?.name;
              const authorId = author?.auth_uid;
              const batch = author?.batch;
              const deptLookup = author ? getRecord(author, "departments_lookup") : null;
              const dept = deptLookup?.department_name;
              const authorBatch =
                typeof dept === "string" && dept.trim() && (typeof batch === "string" || typeof batch === "number")
                  ? `${dept}-${String(batch)}`
                  : "N/A";

              if (typeof id !== "string" || typeof title !== "string") return null;

              return {
                id,
                title,
                description: typeof description === "string" ? description : "",
                category,
                createdAt: typeof createdAt === "string" ? createdAt : new Date().toISOString(),
                likeCount: Number.isFinite(likeCount) ? likeCount : 0,
                commentCount: Number.isFinite(commentCount) ? commentCount : 0,
                attachmentUrl,
                authorName: typeof authorName === "string" && authorName.trim() ? authorName : "Unknown",
                authorBatch,
                authorId: typeof authorId === "string" ? authorId : null,
              } satisfies QnAFeedPost;
            })
            .filter((x): x is QnAFeedPost => Boolean(x));
        }

        // Prefer RPC (server-side paging/filtering). Keep fallback if not deployed yet.
        if (DEBUG) console.log("[QnA] attempting RPC");
        const rpcRes = await withTimeout(
          supabase.rpc("get_qna_feed_page", {
            p_limit: PAGE_SIZE,
            p_offset: offset,
            p_category: categoryArg,
            p_search: searchArg,
          }),
          8000,
          "QnA RPC"
        );

        if (!rpcRes.error && Array.isArray(rpcRes.data)) {
          if (DEBUG) console.log("[QnA] RPC ok", { rows: rpcRes.data.length });
          const rows = rpcRes.data as any[];
          mapped = rows.map((r) => {
            const dept = typeof r.author_department === "string" ? r.author_department : "";
            const batch = typeof r.author_batch === "string" ? r.author_batch : "";
            const authorBatch = dept && batch ? `${dept}-${batch}` : dept || "N/A";
            const cat = r.qna_category;
            const category: QnAFeedPost["category"] =
              cat === "Advice" || cat === "Resource" || cat === "Question" ? cat : "Question";

            return {
              id: String(r.post_id),
              title: String(r.title ?? ""),
              description: String(r.description ?? ""),
              category,
              createdAt: typeof r.created_at === "string" ? r.created_at : new Date().toISOString(),
              likeCount: Number(r.like_count ?? 0),
              commentCount: Number(r.comment_count ?? 0),
              attachmentUrl:
                typeof r.attachment_url === "string" && r.attachment_url.trim() ? r.attachment_url : null,
              authorName: typeof r.author_name === "string" && r.author_name.trim() ? r.author_name : "Unknown",
              authorBatch,
              authorId: typeof r.author_auth_uid === "string" ? r.author_auth_uid : null,
            } satisfies QnAFeedPost;
          });

          // If the RPC exists but returns an empty first page, verify with the fallback query.
          // This helps when the RPC definition (or RLS) is out-of-sync and filters everything out.
          if (reset && offset === 0 && mapped.length === 0) {
            if (DEBUG) console.log("[QnA] RPC returned 0 rows; verifying with fallback");
            const fb = await fetchFallback();
            if (DEBUG) console.log("[QnA] fallback rows", { rows: fb.length });
            if (fb.length > 0) {
              console.warn("[QnA] RPC returned empty but fallback returned rows. RPC may be misconfigured/deployed.");
              mapped = fb;
            }
          }
        } else {
          if (DEBUG) console.log("[QnA] RPC unavailable; using fallback", { error: (rpcRes as any)?.error });
          mapped = await fetchFallback();
        }

        if (!mountedRef.current) return;
        setPosts((prev) => (reset ? mapped : [...prev, ...mapped]));

        const nextHasMore = mapped.length === PAGE_SIZE;
        hasMoreRef.current = nextHasMore;

        const nextPage = reset ? 1 : pageRef.current + 1;
        pageRef.current = nextPage;
      } catch (err) {
        console.error(err);
        const msg = err instanceof Error ? err.message : "Failed to load posts";
        if (reset) {
          setLoadError(msg);
          toast.error(msg);
        }
        if (mountedRef.current && reset) setPosts([]);
      } finally {
        inFlightRef.current = false;
        loadingRef.current = false;
        loadingMoreRef.current = false;
        if (mountedRef.current) {
          setLoading(false);
          setLoadingMore(false);
          setInitialLoad(false);
        }
      }
    }, []);

  useEffect(() => {
    void loadPage({ reset: true });
  }, [loadPage, refreshSeq, activeCategory, debouncedSearch]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        void loadPage({ reset: false });
      },
      { root: null, rootMargin: "400px", threshold: 0 }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [loadPage]);

  const filteredPosts = useMemo(() => posts, [posts]);

  if (initialLoad && loading) {
    if (!initialLoadTimeout) return <Loading />;

    return (
      <div className="lg:flex lg:flex-col lg:gap-6 lg:h-full lg:w-full lg:p-10 lg:animate-fade-in">
        <div className="bg-primary-lm border border-stroke-grey lg:rounded-xl lg:p-10 flex flex-col gap-4 w-full">
          <p className="text-text-lm">QnA is taking longer than expected to load.</p>
          <p className="text-text-lighter-lm text-sm">
            Check the browser console for errors. If this keeps happening, it usually means the page never started the
            Supabase request or it failed before the network layer.
          </p>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setInitialLoadTimeout(false);
                setRefreshSeq((n) => n + 1);
              }}
              className="bg-accent-lm text-white px-4 py-2 rounded-lg hover:opacity-90 transition"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loadError && posts.length === 0) {
    return (
      <div className="lg:flex lg:flex-col lg:gap-6 lg:h-full lg:w-full lg:p-10 lg:animate-fade-in">
        <div className="bg-primary-lm border border-stroke-grey lg:rounded-xl lg:p-10 flex flex-col gap-4 w-full">
          <p className="text-text-lm">Couldn’t load QnA posts.</p>
          <p className="text-text-lighter-lm text-sm" style={{ wordBreak: "break-word" }}>
            {loadError}
          </p>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setInitialLoadTimeout(false);
                setLoadError(null);
                setRefreshSeq((n) => n + 1);
              }}
              className="bg-accent-lm text-white px-4 py-2 rounded-lg hover:opacity-90 transition"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-screen lg:p-10 flex flex-col lg:gap-8">
      <SearchAddPostBar value={searchQuery} onChange={setSearchQuery} onNewPostClick={() => setNewPostOpen(true)} />

      <CreateQnAPostModal
        open={newPostOpen}
        onClose={() => setNewPostOpen(false)}
        onCreated={() => setRefreshSeq((n) => n + 1)}
      />

      <div className="flex lg:gap-4">
        <QnAPostCategory label="All" isSelected={activeCategory === "All"} onClick={() => setActiveCategory("All")} />
        <QnAPostCategory
          label="Questions"
          isSelected={activeCategory === "Question"}
          onClick={() => setActiveCategory("Question")}
        />
        <QnAPostCategory
          label="Advice"
          isSelected={activeCategory === "Advice"}
          onClick={() => setActiveCategory("Advice")}
        />
        <QnAPostCategory
          label="Resources"
          isSelected={activeCategory === "Resource"}
          onClick={() => setActiveCategory("Resource")}
        />
      </div>

      <ul className="flex flex-col lg:gap-5">
        {filteredPosts.length === 0 ? (
          <div className="flex flex-col items-center lg:gap-4">
            <img src={noPostSvg} alt="No posts" className="lg:size-50" />
            <p className="text-text-lm lg:text-lg">No posts in this category</p>
          </div>
        ) : (
          filteredPosts.map((post) => (
            <li
              key={post.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/qna/${post.id}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate(`/qna/${post.id}`);
                }
              }}
            >
              <QnAPostCard
                postId={post.id}
                postTag={post.category}
                postTitle={post.title}
                postPreview={truncateText(post.description, 200)}
                attachmentUrl={post.attachmentUrl}
                authorName={post.authorName}
                authorBatch={post.authorBatch}
                authorId={post.authorId}
                postDate={formatPostTimestamp(post.createdAt)}
                initialLikeCount={post.likeCount}
                initialCommentCount={post.commentCount}
              />
            </li>
          ))
        )}

        {loadingMore ? (
          <div className="flex justify-center py-4">
            <p className="text-text-lighter-lm">Loading more…</p>
          </div>
        ) : null}

        <div ref={sentinelRef} />
      </ul>
    </div>
  );
}



