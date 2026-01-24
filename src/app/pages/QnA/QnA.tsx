import { useState, Suspense, useEffect, useRef } from "react";
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

type Post = {
  id: string;
  title: string;
  author: string;
  authorAvatar: string;
  authorCourse: string;
  content: string;
  category: "Question" | "Advice" | "Resource";
  tags: string[];
  reactions: number;
  comments: number;
  shares: number;
  timestamp: string;
};

const categoryStyles = {
  Question: "bg-secondary-lm text-accent-lm border-stroke-peach",
  Advice: "bg-secondary-lm text-accent-lm border-stroke-peach",
  Resource: "bg-secondary-lm text-accent-lm border-stroke-peach",
};

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
      author: "You",
      authorAvatar: "/placeholder.svg",
      authorCourse: "—",
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
                  <PostCard
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

      {/* New Post Dialog */}
      <Dialog open={isNewPostOpen} onOpenChange={setIsNewPostOpen}>
        <DialogContent className="sm:max-w-lg bg-primary-lm border-stroke-grey text-text-lm lg:max-h-[80vh] lg:overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Post</DialogTitle>
          </DialogHeader>

          <div className="lg:space-y-4 lg:px-0">
            <Input
              placeholder="Title"
              value={newPost.title}
              onChange={(e) =>
                setNewPost({ ...newPost, title: e.target.value })
              }
              className="lg:w-full bg-primary-lm border-stroke-grey text-text-lm placeholder:text-text-lighter-lm focus-visible:ring-accent-lm focus-visible:border-accent-lm"
            />

            <Textarea
              placeholder="Description"
              rows={5}
              value={newPost.description}
              onChange={(e) =>
                setNewPost({ ...newPost, description: e.target.value })
              }
              className="lg:w-full bg-primary-lm border-stroke-grey text-text-lm placeholder:text-text-lighter-lm focus-visible:ring-accent-lm focus-visible:border-accent-lm"
            />

            <div className="lg:space-y-2">
              <div className="lg:flex lg:flex-wrap lg:gap-2">
                {(["Question", "Advice", "Resource"] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setNewPost({ ...newPost, category: cat })}
                    aria-pressed={newPost.category === cat}
                    className={`group inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm border transition focus:outline-none focus:ring-2 focus:ring-accent-lm ${
                      newPost.category === cat
                        ? "border-stroke-peach bg-secondary-lm text-accent-lm shadow-sm ring-2 ring-accent-lm"
                        : "border-stroke-grey bg-primary-lm text-text-lm hover:bg-hover-lm"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:pt-2">
              <Button
                className="lg:w-full bg-accent-lm hover:bg-hover-btn-lm text-primary-lm"
                onClick={submitNewPost}
              >
                Post
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * PostCard: renders a feed card with a fixed collapsed content height.
 * - Detects overflow and shows "Read More" when needed
 * - Clicking "Read More" or the Comment icon expands the card in-place (revealing full content + inline reply box)
 * - Clicking the card header/title opens the detail view
 *
 * Layout notes:
 * - `min-h-[14rem]` keeps cards visually consistent across tabs
 * - `flex flex-col` + `justify-between` pins the footer (actions + timestamp) to the bottom
 * - main content sits in a `flex-grow` container so long text doesn't change the overall card height below the min
 */
function PostCard({
  post,
  onOpenDetail,
  onLike,
  onAddInlineComment,
}: {
  post: Post;
  onOpenDetail: () => void;
  onLike: () => void;
  onAddInlineComment: (text: string) => void;
}) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [collapsed, setCollapsed] = useState(true);
  const [showReadMore, setShowReadMore] = useState(false);
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    setShowReadMore(el.scrollHeight > el.clientHeight + 1);
  }, [post.content]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        // Avoid navigating to detail while composing a reply
        if (!replying) onOpenDetail();
      }}
      className="lg:relative bg-secondary-lm lg:p-8 lg:rounded-2xl border-2 border-stroke-grey hover:bg-hover-lm hover:border-stroke-peach lg:transition cursor-pointer lg:w-full lg:box-border lg:min-h-56 lg:flex lg:flex-col lg:justify-between"
    >
      <span
        className={`
        absolute top-4 right-4
        px-3 py-1 font-semibold rounded-full border
        ${categoryStyles[post.category]}
      `}
      >
        {post.category}
      </span>

      {/* Top: user + title */}
      <div>
        <UserInfo
          userImg={post.authorAvatar}
          userName={post.author}
          userBatch={post.authorCourse}
        />

        <h5 className="lg:font-[Poppins] lg:font-semibold text-text-lm lg:mt-2">
          {post.title}
        </h5>
      </div>

      {/* Middle: content + tags (flex-grow so footer stays at bottom) */}
      <div className="lg:grow lg:mt-3">
        <div
          ref={contentRef}
          className="text-text-lighter-lm text-md lg:leading-relaxed"
          style={collapsed ? { maxHeight: "6rem", overflow: "hidden" } : {}}
        >
          {post.content}
        </div>

        {showReadMore && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCollapsed((c) => !c);
              if (collapsed) setReplying(true);
            }}
            className="text-accent-lm text-sm lg:font-medium lg:mt-1"
          >
            {collapsed ? "Read more" : "Show less"}
          </button>
        )}

        <div className="lg:flex lg:gap-2 lg:flex-wrap lg:mt-3">
          <span className="lg:font-bold bg-[#C23D00] text-primary-lm lg:px-3 lg:py-1.5 lg:rounded-full text-sm">
            #{post.category}
          </span>
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="lg:font-bold bg-[#C23D00] text-primary-lm lg:px-3 lg:py-1.5 lg:rounded-full text-sm"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>

      {/* Footer: actions + timestamp + inline reply area (if expanded) */}
      <div>
        <div className="lg:flex lg:gap-4 lg:items-center lg:mt-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLike();
            }}
          >
            <LikeButton />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetail();
            }}
          >
            <CommentButton />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              alert("Share clicked");
            }}
          >
            <ShareButton />
          </button>
        </div>

        <p className="text-xs text-text-lighter-lm lg:mt-2">{post.timestamp}</p>

        {/* INLINE REPLY (kept in footer but reserves space only when visible) */}
        {!collapsed && (
          <div className="lg:mt-4 bg-secondary-lm lg:rounded-2xl lg:p-6 border-2 border-stroke-grey">
            {!replying ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setReplying(true);
                }}
                className="lg:w-full text-left lg:px-4 lg:py-3 text-text-lighter-lm text-sm hover:bg-hover-lm lg:rounded-lg lg:transition"
              >
                Add a reply
              </button>
            ) : (
              <div className="lg:space-y-4">
                <Textarea
                  placeholder="Add a reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="border-none bg-secondary-lm text-text-lm focus-visible:ring-0"
                />
                <div className="lg:flex lg:justify-end lg:gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setReplying(false);
                      setReplyText("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="bg-accent-lm text-primary-lm"
                    onClick={() => {
                      onAddInlineComment(replyText);
                      setReplyText("");
                      setReplying(false);
                    }}
                  >
                    Comment
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
