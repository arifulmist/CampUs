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

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

import { supabase } from "@/supabase/supabaseClient";

import { QnAPostCard } from "./QnAPostCard";
import { QnAPostCategory } from "./QnAPostCategory";
import { SearchAddPostBar } from "./SearchAddPostBar";
import { Loading } from "../../Fallback/Loading";

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

function formatPostTimestamp(createdAt: string): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return "Posted just now";
  if (diffMinutes < 60) return `Posted ${diffMinutes} min ago`;
  if (diffHours < 24) return `Posted ${diffHours} hr ago`;
  if (diffDays < 7) return `Posted ${diffDays} days ago`;

  return `Posted on ${date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })}`;
}

function truncateText(value: string, maxChars: number) {
  if (value.length <= maxChars) return value;
  return value.slice(0, Math.max(0, maxChars)).trimEnd() + "…";
}

export function QAPageContent() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<QnAFeedPost[]>([]);
  const [activeCategory, setActiveCategory] = useState<QnACategory>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    let alive = true;

    async function fetchPosts() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("all_posts")
          .select(`
            post_id,
            title,
            description,
            like_count,
            comment_count,
            created_at,
            qna_posts!inner(
              img_url,
              qna_category(category_name)
            ),
            author:user_info!fk_author(
              name,
              auth_uid,
              batch,
              departments_lookup!inner(department_name)
            )
          `)
          .order("created_at", { ascending: false });

        if (!alive) return;
        if (error) throw error;

        const rows = (data ?? []) as unknown[];
        const mapped: QnAFeedPost[] = rows
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
            const commentCount = typeof commentCountRaw === "number" ? commentCountRaw : Number(commentCountRaw ?? 0);

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

        setPosts(mapped);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load posts");
        setPosts([]);
      } finally {
        if (alive) {
          setLoading(false);
          setInitialLoad(false);
        }
      }
    }

    void fetchPosts();
    return () => {
      alive = false;
    };
  }, []);

  const filteredPosts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return posts.filter((p) => {
      const categoryOk = activeCategory === "All" ? true : p.category === activeCategory;
      const searchOk =
        !q ? true : p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
      return categoryOk && searchOk;
    });
  }, [posts, activeCategory, searchQuery]);

  if (initialLoad && loading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen w-screen lg:p-10 flex flex-col lg:gap-8">
      <SearchAddPostBar value={searchQuery} onChange={setSearchQuery} />

      <div className="flex lg:gap-4">
        <QnAPostCategory
          label="All"
          isSelected={activeCategory === "All"}
          onClick={() => setActiveCategory("All")}
        />
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
        {filteredPosts.map((post) => (
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
        ))}
      </ul>
    </div>
  );
}



