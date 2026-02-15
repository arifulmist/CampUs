import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { supabase } from "@/supabase/supabaseClient";
import PostCard from "./PostCard";
import type { Post } from "./types";
import QnaPost from "../components/QnaPost";
import PostDetail from "../components/PostDetail";
import toast from "react-hot-toast";

/* -------------------- TIME FORMATTER -------------------- */
export function formatPostTimestamp(createdAt: string): string {
  const date = new Date(createdAt);
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

/* -------------------- MAIN COMPONENT -------------------- */
export default function QAPageContent() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<"All" | "Question" | "Advice" | "Resource">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isNewPostOpen, setIsNewPostOpen] = useState(false);
  const [currentUserUid, setCurrentUserUid] = useState<string | null>(null);

  /* -------------------- AUTH USER -------------------- */
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserUid(data.user?.id ?? null);
    });
  }, []);

  /* -------------------- FETCH POSTS -------------------- */
  useEffect(() => {
    async function fetchPosts() {
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
              user_profile(profile_picture_url),
              departments_lookup!inner(department_name)
            )
          `)
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (!data) return;

        /* ---- TAGS ---- */
        const postIds = data.map((p: any) => p.post_id);
        const { data: tagsData } = await supabase
          .from("post_tags")
          .select("post_id, skill:skills_lookup(skill)")
          .in("post_id", postIds);

        const tagMap: Record<string, string[]> = {};
        tagsData?.forEach((t: any) => {
          if (!tagMap[t.post_id]) tagMap[t.post_id] = [];
          if (t.skill?.skill) tagMap[t.post_id].push(t.skill.skill);
        });

        const formatted: Post[] = data.map((p: any) => ({
          id: p.post_id,
          title: p.title,
          content: p.description,
          author: p.author?.name ?? "Unknown",
          authorAvatar: p.author?.user_profile?.profile_picture_url ?? null,
          authorCourse:
            p.author?.departments_lookup?.department_name && p.author?.batch
              ? `${p.author.departments_lookup.department_name}-${p.author.batch}`
              : "N/A",
          category: p.qna_posts?.qna_category?.category_name ?? "Question",
          tags: tagMap[p.post_id] ?? [],
          reactions: p.like_count ?? 0,
          comments: p.comment_count ?? 0,
          shares: 0,
          createdAt: p.created_at,
          timestamp: formatPostTimestamp(p.created_at),
          imageUrl: p.qna_posts?.img_url ?? null,
          authorUid: p.author?.auth_uid ?? null, 
        }));

        setPosts(formatted);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load posts");
      }
    }

    fetchPosts();
  }, [isNewPostOpen]);

  /* -------------------- FILTER -------------------- */
  const filteredPosts = posts.filter(
    (p) =>
      (activeTab === "All" || p.category === activeTab) &&
      p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  /* -------------------- ACTIONS -------------------- */
  const toggleLike = async (postId: string) => {
    const { error } = await supabase.rpc("increment_post_likes", { p_id: postId });
    if (!error) {
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, reactions: p.reactions + 1 } : p))
      );
    }
  };

  const addInlineComment = async (postId: string, text: string) => {
    if (!text.trim()) return;
    const { error } = await supabase.from("comments").insert({ post_id: postId, content: text });
    if (!error) {
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, comments: p.comments + 1 } : p))
      );
    }
  };

  /* -------------------- UI -------------------- */
  return (
    <div className="min-h-screen bg-background-lm">
      <main className="mx-auto max-w-4xl px-4 py-6">
        {selectedPost ? (
          <PostDetail
            post={{ ...selectedPost, comments: selectedPost.comments }}
            onBack={() => setSelectedPost(null)}
          />
        ) : (
          <>
            {/* Search */}
            <div className="flex gap-3 mb-6">
               <button
            onClick={() => setIsNewPostOpen(true)}
            className="lg:w-full lg:rounded-lg lg:border border-stroke-grey bg-secondary-lm lg:px-4 lg:py-3 text-left text-accent-lm hover:bg-[#FFF4EE]"
          >
            Add new post
          </button>
              
            </div>
             
            {/* Tabs */}
            <div className="flex justify-center gap-2 mb-6">
              {(["All", "Question", "Advice", "Resource"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-full ${
                    activeTab === tab ? "bg-accent-lm text-white" : "bg-primary-lm"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Posts */}
            <div className="space-y-4">
              {filteredPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  isOwner={post.authorUid === currentUserUid}
                  onOpenDetail={() => setSelectedPost(post)}
                  onLike={() => toggleLike(post.id)}
                  onAddInlineComment={(t) => addInlineComment(post.id, t)}
                />
              ))}
            </div>
          </>
        )}
      </main>

      <QnaPost
        open={isNewPostOpen}
        onOpenChange={setIsNewPostOpen}
        onCreate={() => setIsNewPostOpen(false)}
      />
    </div>
  );
}
