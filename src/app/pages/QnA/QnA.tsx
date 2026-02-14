import { useState, Suspense, useEffect } from "react";
import { Search } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Textarea } from "../../../components/ui/textarea";
import { UserInfo } from "@/components/UserInfo";
import {
  LikeButton,
  CommentButton,
  ShareButton,
} from "../../../components/PostButtons";
import { PostDetail } from "./components/PostDetail";
import { addNotification } from "../../../mockData/notifications";
import QnaPost from "./components/QnaPost";
import { supabase } from "../../../supabase/supabaseClient";
import { QnaPostCard, type QnaFeedPost } from "./components/QnaPostCard";

type Post = QnaFeedPost;

const initialMockPosts: Post[] = [
  {
    id: "1",
    title: "Writing a research paper",
    author: "Ariful Islam",
    authorAvatar: "/abstract-geometric-shapes.png",
    authorCourse: "NSE-18",
    content:
      "Hello! I recently decided to write a research paper inspired by my seniors. My interests include cybersecurity and AI, but I’m a newbie. I tried learning about Machine Learning, Pattern Recognition, LLMs and other jargon but it's all still very confusing to me. Like it just straight up flies over my head. As for cybersecurity, I find OSINT problems fun to solve, but Web Hacking is my absolute weak spot. Can anyone guide me?",
    category: "Advice",
    tags: ["Research", "Academic"],
    reactions: 0,
    comments: 3,
    shares: 1,
    timestamp: "2 days ago",
  },
  {
    id: "2",
    title: "How do I start my deep fake project?",
    author: "Sarah Chen",
    authorAvatar: "/abstract-geometric-shapes.png",
    authorCourse: "CS-22",
    content:
      "I want to start a deep fake detection project for my final year. Any suggestions?",
    category: "Question",
    tags: ["AI", "Project"],
    reactions: 0,
    comments: 3,
    shares: 1,
    timestamp: "3 days ago",
  },
];

function formatRelativeTime(dateString?: string | null) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 3) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function QnA() {
  return (
    <Suspense fallback={null}>
      <QAPageContent />
    </Suspense>
  );
}

function QAPageContent() {
  const [activeTab, setActiveTab] = useState<
    "All" | "Question" | "Advice" | "Resource"
  >("All");
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isNewPostOpen, setIsNewPostOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newPost, setNewPost] = useState({
    title: "",
    description: "",
    tags: [] as string[],
    category: "Question" as Post["category"],
  });

  // posts are stateful so we can update reactions/comments etc.
  const [posts, setPosts] = useState<Post[]>(initialMockPosts);

  const [currentUser, setCurrentUser] = useState<{
    authUid: string | null;
    name: string;
    course: string;
    avatarUrl: string | null;
  }>({ authUid: null, name: "You", course: "—", avatarUrl: null });

  useEffect(() => {
    let alive = true;

    async function loadCurrentUser() {
      const { data } = await supabase.auth.getUser();
      const authUid = data.user?.id ?? null;
      if (!alive) return;

      if (!authUid) {
        setCurrentUser({ authUid: null, name: "You", course: "—", avatarUrl: null });
        return;
      }

      const [infoRes, profileRes, departmentsRes] = await Promise.all([
        supabase
          .from("user_info")
          .select("auth_uid,name,batch,department,departments_lookup(department_name)")
          .eq("auth_uid", authUid)
          .maybeSingle(),
        supabase
          .from("user_profile")
          .select("profile_picture_url")
          .eq("auth_uid", authUid)
          .maybeSingle(),
        supabase.from("departments_lookup").select("dept_id,department_name"),
      ]);

      if (!alive) return;

      const deptNameById = new Map<string, string>();
      for (const row of (departmentsRes.data ?? []) as any[]) {
        if (typeof row.dept_id === "string" && typeof row.department_name === "string") {
          deptNameById.set(row.dept_id, row.department_name);
        }
      }

      const info = infoRes.data as any;
      const deptId = info?.department;
      const deptLookup = info?.departments_lookup;
      const deptName =
        (typeof deptLookup?.department_name === "string" && deptLookup.department_name) ||
        (typeof deptId === "string" ? deptNameById.get(deptId) ?? deptId : "");
      const batchVal = info?.batch;
      const batch = typeof batchVal === "number" ? String(batchVal) : (typeof batchVal === "string" ? batchVal : "");
      const course = deptName && batch ? `${deptName}-${batch}` : deptName || "—";

      setCurrentUser({
        authUid,
        name: typeof info?.name === "string" && info.name.trim() ? info.name : "You",
        course,
        avatarUrl: (profileRes.data as any)?.profile_picture_url ?? null,
      });
    }

    loadCurrentUser();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadQnaFeed() {
      try {
        const { data: rows, error } = await supabase
          .from("all_posts")
          .select("post_id,title,description,author_id,like_count,comment_count,created_at")
          .eq("type", "qna")
          .order("created_at", { ascending: false })
          .limit(50);
        if (error) throw error;

        const parsed = (rows ?? []) as any[];
        if (!parsed.length) return;

        const authorIds = Array.from(
          new Set(
            parsed
              .map((r) => r.author_id)
              .filter((x) => typeof x === "string" && x)
          )
        ) as string[];

        const [usersRes, profilesRes, departmentsRes] = await Promise.all([
          authorIds.length
            ? supabase
                .from("user_info")
                .select(
                  "auth_uid,name,batch,department,departments_lookup(department_name)"
                )
                .in("auth_uid", authorIds)
            : Promise.resolve({ data: [], error: null } as any),
          authorIds.length
            ? supabase
                .from("user_profile")
                .select("auth_uid,profile_picture_url")
                .in("auth_uid", authorIds)
            : Promise.resolve({ data: [], error: null } as any),
          supabase.from("departments_lookup").select("dept_id,department_name"),
        ]);

        if (usersRes.error) throw usersRes.error;
        if (profilesRes.error) throw profilesRes.error;
        if (departmentsRes.error) throw departmentsRes.error;

        const deptNameById = new Map<string, string>();
        for (const row of (departmentsRes.data ?? []) as any[]) {
          if (typeof row.dept_id === "string" && typeof row.department_name === "string") {
            deptNameById.set(row.dept_id, row.department_name);
          }
        }

        const profilePicByAuthUid = new Map<string, string>();
        for (const row of (profilesRes.data ?? []) as any[]) {
          const authUid = row.auth_uid;
          const url = row.profile_picture_url;
          if (typeof authUid === "string" && typeof url === "string" && url.trim()) {
            profilePicByAuthUid.set(authUid, url);
          }
        }

        const userByAuthUid = new Map<string, { name: string; course: string }>();
        for (const row of (usersRes.data ?? []) as any[]) {
          const authUid = row.auth_uid;
          const name = row.name;
          const batchVal = row.batch;
          const deptId = row.department;
          const deptLookup = row.departments_lookup;
          const deptName =
            (typeof deptLookup?.department_name === "string" && deptLookup.department_name) ||
            (typeof deptId === "string" ? deptNameById.get(deptId) ?? deptId : "");
          const batch = typeof batchVal === "number" ? String(batchVal) : (typeof batchVal === "string" ? batchVal : "");
          const course = deptName && batch ? `${deptName}-${batch}` : deptName || "";
          if (typeof authUid === "string" && typeof name === "string") {
            userByAuthUid.set(authUid, { name, course });
          }
        }

        const mapped: Post[] = parsed
          .map((r) => {
            const postId = r.post_id;
            const title = r.title;
            const description = r.description;
            const authorId = r.author_id;
            if (
              typeof postId !== "string" ||
              typeof title !== "string" ||
              typeof description !== "string" ||
              typeof authorId !== "string"
            ) {
              return null;
            }
            const user = userByAuthUid.get(authorId);
            return {
              id: postId,
              title,
              author: user?.name ?? "Unknown",
              authorAvatar: profilePicByAuthUid.get(authorId) ?? null,
              authorAuthUid: authorId,
              authorCourse: user?.course ?? "",
              content: description,
              category: "Question",
              tags: [],
              reactions: typeof r.like_count === "number" ? r.like_count : 0,
              comments: typeof r.comment_count === "number" ? r.comment_count : 0,
              shares: 0,
              timestamp: formatRelativeTime(r.created_at ?? null),
            } as Post;
          })
          .filter(Boolean) as Post[];

        if (!alive) return;
        if (mapped.length) setPosts(mapped);
      } catch (e) {
        // keep mock posts if load fails
        console.error(e);
      }
    }

    loadQnaFeed();
    return () => {
      alive = false;
    };
  }, []);

  const filteredPosts = posts.filter(
    (post) =>
      (activeTab === "All" || post.category === activeTab) &&
      post.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  function handleAddTag(tag: string) {
    if (tag.trim() && !newPost.tags.includes(tag.trim())) {
      setNewPost({ ...newPost, tags: [...newPost.tags, tag.trim()] });
    }
  }

  // Like handler: toggle +1 behavior (simple)
  function toggleLike(postId: string) {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, reactions: p.reactions + 1 } : p
      )
    );
  }

  // Create a new post -> prepend to posts
  function submitNewPost() {
    const title = newPost.title.trim();
    if (!title) return;
    const id = Date.now().toString();
    const created: Post = {
      id,
      title,
      author: currentUser.name,
      authorAvatar: currentUser.avatarUrl,
      authorAuthUid: currentUser.authUid ?? undefined,
      authorCourse: currentUser.course,
      content: newPost.description,
      category: newPost.category,
      tags: newPost.tags,
      reactions: 0,
      comments: 0,
      shares: 0,
      timestamp: "Just now",
    };
    setPosts((p) => [created, ...p]);
    // Notify: new QnA post created
    addNotification({
      type: "qna",
      title: `New QnA Post: ${title}`,
      description: newPost.description,
      path: "/qna",
    });
    setIsNewPostOpen(false);
    setNewPost({ title: "", description: "", tags: [], category: "Question" });
  }

  // add an inline comment to a post (increments comment count)
  function addInlineComment(postId: string, commentText: string) {
    if (!commentText.trim()) return;
    // Update comments count, then open detail view with updated post
    setPosts((prev) => {
      const next = prev.map((p) =>
        p.id === postId ? { ...p, comments: p.comments + 1 } : p
      );
      const updated = next.find((p) => p.id === postId) || null;
      setSelectedPost(updated);
      return next;
    });
  }

  // Inject a small style reset to force native scrollbar appearance for this component only.
  useEffect(() => {
    // create and append style element
    const style = document.createElement("style");
    style.dataset.qna = "reset-scrollbar";
    style.innerHTML = `
      /* limit to QnA container so we don't affect other pages */
      .qna-reset-scrollbar {
        /* restore platform/native scrollbar behavior */
        scrollbar-width: auto !important; /* Firefox */
        -ms-overflow-style: auto !important; /* IE 10+ */
      }

      /* WebKit browsers: try to restore default thumb/track look */
      .qna-reset-scrollbar::-webkit-scrollbar {
        width: auto !important;
        height: auto !important;
        background: transparent !important;
        -webkit-appearance: scrollbar !important;
      }
      .qna-reset-scrollbar::-webkit-scrollbar-thumb {
        background: initial !important;
        border-radius: initial !important;
        border: none !important;
        -webkit-appearance: scrollbarthumb !important;
      }
      .qna-reset-scrollbar::-webkit-scrollbar-track {
        background: initial !important;
        -webkit-appearance: scrollbartrack !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    // add qna-reset-scrollbar class so our injected CSS affects this component only
    <div
      className="lg:qna-reset-scrollbar lg:min-h-screen bg-background-lm lg:animate-fade-in"
      style={{
        minHeight: "100vh",
        overflowY: "auto", // allow native scrollbars when needed (auto instead of forced scroll)
      }}
    >
      <main
        className="lg:mx-auto lg:max-w-4xl lg:px-4 lg:py-6 lg:w-full lg:box-border"
        style={{ boxSizing: "border-box" }}
      >
        {selectedPost ? (
          <PostDetail
            post={{ ...selectedPost, commentsCount: selectedPost.comments }}
            onBack={() => setSelectedPost(null)}
          />
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

              {/* New Post button kept same width to avoid reflow */}
              <div className="lg:shrink-0">
                <Button
                  onClick={() => setIsNewPostOpen(true)}
                  className="bg-accent-lm hover:bg-hover-btn-lm text-primary-lm lg:px-4"
                >
                  New Post
                </Button>
              </div>
            </div>

            {/* Tabs: centered and fixed button widths so switching doesn't reflow */}
            <div className="lg:flex lg:gap-2 lg:mb-6 lg:justify-center">
              {(["All", "Question", "Advice", "Resource"] as const).map(
                (tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    // min-w ensures every button occupies same space; text-center avoids shifts
                    className={`min-w-22 box-border text-center px-3 py-2 rounded-full text-sm font-medium transition focus:outline-none ${
                      activeTab === tab
                        ? "bg-accent-lm text-primary-lm"
                        : "bg-primary-lm text-text-lm hover:bg-hover-lm"
                    }`}
                    aria-pressed={activeTab === tab}
                  >
                    {tab}
                  </button>
                )
              )}
            </div>

            {/* Posts: reserve a minimum height so switching to empty doesn't collapse layout */}
            <div className="lg:space-y-4 lg:min-h-48">
              {filteredPosts.length === 0 ? (
                <div className="lg:flex lg:items-center lg:justify-center lg:min-h-48">
                  <p className="text-text-lighter-lm text-lg">
                    No posts in this category
                  </p>
                </div>
              ) : (
                filteredPosts.map((post) => (
                  <QnaPostCard
                    key={post.id}
                    post={post}
                    onOpenDetail={() => setSelectedPost(post)}
                    onLike={() => toggleLike(post.id)}
                    onAddInlineComment={(text) =>
                      addInlineComment(post.id, text)
                    }
                  />
                ))
              )}
            </div>
          </>
        )}
      </main>

     <QnaPost
  open={isNewPostOpen}
  onOpenChange={setIsNewPostOpen}
  onCreate={(payload) => {
    const created: Post = {
      id: Date.now().toString(),
      title: payload.title,
      author: currentUser.name,
      authorAvatar: currentUser.avatarUrl,
      authorAuthUid: currentUser.authUid ?? undefined,
      authorCourse: currentUser.course,
      content: payload.description,
      category: payload.category,
      tags: payload.tags,
      reactions: 0,
      comments: 0,
      shares: 0,
      timestamp: "Just now",
    };

    setPosts((prev) => [created, ...prev]);
  }}
/>

    </div>
  );
}

// (PostCard moved to ./components/QnaPostCard)
