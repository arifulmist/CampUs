import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { supabase } from "../../../../../supabase/supabaseClient";
import PostCard from "./PostCard";
import type { Post } from "./types";
import QnaPost from "../components/QnaPost";
import PostDetail from "../components/PostDetail";

export default function QAPageContent() {
  const [activeTab, setActiveTab] = useState<"All" | "Question" | "Advice" | "Resource">("All");
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isNewPostOpen, setIsNewPostOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);

  // Fetch posts from Supabase
 useEffect(() => {
  async function fetchPosts() {
    try {
      // Fetch all posts with author, profile, qna info, category
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
      category_id,
      qna_category(category_name)
    ),
    author:user_info!fk_author(
        name,
        auth_uid,
        department,
        batch,
        user_profile(profile_picture_url),
        departments_lookup!inner(department_name)
        )

  `)
  .order("created_at", { ascending: false });


      if (error) throw error;

      if (!data) return;

      // Fetch tags for all posts in a single query
      const postIds = data.map((p: any) => p.post_id);
      const { data: tagsData, error: tagsError } = await supabase
        .from("post_tags")
        .select(`
          post_id,
          skill:skills_lookup(skill)
        `)
        .in("post_id", postIds);

      if (tagsError) throw tagsError;

      // Group tags by post_id
      const tagsMap: Record<string, string[]> = {};
      tagsData?.forEach((t: any) => {
        if (!tagsMap[t.post_id]) tagsMap[t.post_id] = [];
        if (t.skill?.skill) tagsMap[t.post_id].push(t.skill.skill);
      });

      // Map posts to frontend Post type
      const formattedPosts: Post[] = data.map((p: any) => ({
        id: p.post_id,
        title: p.title,
        content: p.description,
        author: p.author?.name || "Unknown",
       authorAvatar: p.author?.user_profile?.profile_picture_url || null,
       authorCourse: p.author?.departments_lookup?.department_name && p.author?.batch
        ? `${p.author.departments_lookup.department_name}-${p.author.batch}`
        : "N/A",

        category: p.qna_posts?.qna_category?.category_name || "Question",
        tags: tagsMap[p.post_id] || [],
        reactions: p.like_count || 0,
        comments: p.comment_count || 0,
        shares: 0,
        timestamp: new Date(p.created_at).toLocaleDateString(),
        imageUrl: p.qna_posts?.img_url || null
      }));
console.log("Formatted Posts Image URLs:", formattedPosts.map(p => p.imageUrl));

setPosts(formattedPosts);
    
    } catch (err) {
      console.error("Error fetching posts:", err);
    }
  }

  fetchPosts();
}, [isNewPostOpen]);

  const filteredPosts = posts.filter(
    (post) =>
      (activeTab === "All" || post.category === activeTab) &&
      post.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Increment likes
  const toggleLike = async (postId: string) => {
    const { error } = await supabase.rpc("increment_post_likes", { p_id: postId });
    if (!error) {
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, reactions: p.reactions + 1 } : p))
      );
    }
  };

  // Add inline comment
  const addInlineComment = async (postId: string, commentText: string) => {
    if (!commentText.trim()) return;

    const { error } = await supabase.from("comments").insert({ post_id: postId, content: commentText });
    if (!error) {
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, comments: p.comments + 1 } : p))
      );
      const updated = posts.find((p) => p.id === postId) || null;
      setSelectedPost(updated);
    }
  };

  return (
    <div className="lg:min-h-screen bg-background-lm lg:animate-fade-in" style={{ minHeight: "100vh", overflowY: "auto" }}>
      <main className="lg:mx-auto lg:max-w-4xl lg:px-4 lg:py-6">
        {selectedPost ? (
          <PostDetail post={{ ...selectedPost, commentsCount: selectedPost.comments }} onBack={() => setSelectedPost(null)} />
        ) : (
          <>
            {/* Search + New Post */}
            <div className="lg:mb-6 lg:flex lg:items-center lg:gap-3">
              <div className="lg:relative lg:flex-1 lg:min-w-0 lg:w-[60vw] lg:rounded-md bg-primary-lm">
                <Search className="lg:absolute lg:left-3 lg:top-1/2 lg:-translate-y-1/2 lg:h-4 text-accent-lm" />
                <Input
                  placeholder="Search anything"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="lg:h-10 lg:w-full lg:min-w-0 lg:pl-9 lg:rounded-full bg-primary-lm lg:border border-stroke-grey placeholder:text-text-lighter-lm focus:ring-2 focus:ring-accent-lm focus:border-accent-lm"
                />
              </div>
              <div className="lg:shrink-0">
                <Button onClick={() => setIsNewPostOpen(true)} className="bg-accent-lm hover:bg-hover-btn-lm text-primary-lm lg:px-4">
                  New Post
                </Button>
              </div>
            </div>

            {/* Tabs */}
            <div className="lg:flex lg:gap-2 lg:mb-6 lg:justify-center">
              {(["All", "Question", "Advice", "Resource"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`min-w-22 box-border text-center px-3 py-2 rounded-full text-sm font-medium transition focus:outline-none ${
                    activeTab === tab ? "bg-accent-lm text-primary-lm" : "bg-primary-lm text-text-lm hover:bg-hover-lm"
                  }`}
                  aria-pressed={activeTab === tab}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Posts */}
            <div className="lg:space-y-4 lg:min-h-48">
              {filteredPosts.length === 0 ? (
                <div className="lg:flex lg:items-center lg:justify-center lg:min-h-48">
                  <p className="text-text-lighter-lm text-lg">No posts in this category</p>
                </div>
              ) : (
                filteredPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onOpenDetail={() => setSelectedPost(post)}
                    onLike={() => toggleLike(post.id)}
                    onAddInlineComment={(text) => addInlineComment(post.id, text)}
                  />
                ))
              )}
            </div>
          </>
        )}
      </main>

      {/* New Post Modal */}
      <QnaPost
        open={isNewPostOpen}
        onOpenChange={setIsNewPostOpen}
        onCreate={() => setIsNewPostOpen(false)} // already handled inside QnaPost
      />
    </div>
  );
}
