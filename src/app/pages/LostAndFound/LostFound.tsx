import { useState, useEffect, useRef } from "react";
import { Heart, MessageCircle, Share2, MoreVertical } from "lucide-react";
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../../../components/ui/avatar";
import cycleImg from "../../../assets/images/cycle.png";
import { Textarea } from "../../../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "../../../components/ui/dialog";

import CommentThread, { type Comment as CTComment } from "./components/CommentThread";

type LFPost = {
  id: string;
  title: string;
  author: string;
  authorCourse: string;
  authorAvatar?: string;
  description: string;
  imageUrl?: string;
  reactions: number;
  comments: number;
  shares: number;
  timestamp: string;
};

const mockPosts: LFPost[] = [
  {
    id: "lf-1",
    title: "My Cycle is lost!!!!",
    author: "Ariful Khan Pathan",
    authorCourse: "CSE-23",
    authorAvatar: "/abstract-geometric-shapes.png",
    description:
      "Bhai amar cycle churi hoye gese MIST theke please bhai keu dekhle boliyen...",
    imageUrl: cycleImg,
    reactions: 46,
    comments: 2,
    shares: 2,
    timestamp: "2h ago",
  },
];

export function LostFound() {
  const [query] = useState("");
  const [isAnnounceOpen, setIsAnnounceOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    file: undefined as File | undefined,
  });
  const [titleError, setTitleError] = useState(false);

  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [activePost, setActivePost] = useState<LFPost | null>(null);

  // posts state (initialized from mockPosts)
  const [posts, setPosts] = useState<LFPost[]>(mockPosts);

  type LFComment = {
    id: string;
    author: string;
    avatar?: string;
    content: string;
    timestamp: string;
  };

  // commentsByPost stores simple comments; we will map to CommentThread's shape on demand
  const [commentsByPost, setCommentsByPost] = useState<Record<string, LFComment[]>>({
    "lf-1": [
      {
        id: "c1",
        author: "Hasan Mahmud",
        avatar: "/placeholder.svg?key=h1",
        content: "Hi! I saw your cycle in Mist field.",
        timestamp: "1h ago",
      },
      {
        id: "c2",
        author: "Dulal Mia",
        avatar: "/placeholder.svg?key=d1",
        content: "Ohh! Ami o dekhchi oi khane, akta meye chalachchhilo.",
        timestamp: "30m ago",
      },
    ],
  });

  // image preview related
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // control whether Dialog is allowed to close when onOpenChange(false) arrives.
  // Only set this true when user explicitly clicks the modal's close control (DialogClose)
  // or we decide to close programmatically (Post).
  const allowCloseRef = useRef(false);

  // ref to native file input so we can clear its value (browsers may keep it)
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // open comments dialog for a post
  const openComments = (post: LFPost) => {
    setActivePost(post);
    setIsCommentsOpen(true);
  };

  // Filtering posts (search query currently unused)
  const filtered = posts.filter((p) =>
    p.title.toLowerCase().includes(query.toLowerCase())
  );

  function generateId(prefix = "lf-") {
    return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  }

  // Reset function to clear the announce form and preview and native file input
  function resetForm() {
    setForm({
      title: "",
      description: "",
      date: "",
      time: "",
      file: undefined,
    });
    setImageDataUrl(null);
    setImageName(null);
    setPreviewOpen(false);
    setTitleError(false);

    // clear native input if available
    if (fileInputRef.current) {
      try {
        fileInputRef.current.value = "";
      } catch {
        // ignore if browser forbids it
      }
    }
  }

  // When user picks a file: store file, imageName, and read data URL for preview/storage
  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm((prev) => ({ ...prev, file }));
    setImageName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      setImageDataUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  // Post creation: require title, use imageDataUrl for post.imageUrl, prepend post and create empty comment array
  function handlePost() {
    const title = form.title.trim();
    const description = form.description.trim();

    if (!title) {
      setTitleError(true);
      return;
    }

    const imageUrl = imageDataUrl ? imageDataUrl : undefined;

    const newPost: LFPost = {
      id: generateId("lf-"),
      title: title,
      author: "You",
      authorCourse: "—",
      authorAvatar: "/placeholder.svg",
      description,
      imageUrl,
      reactions: 0,
      comments: 0,
      shares: 0,
      timestamp: "Just now",
    };

    setPosts((prev) => [newPost, ...prev]);

    // ensure a comments bucket exists for this post
    setCommentsByPost((prev) => ({
      ...prev,
      [newPost.id]: prev[newPost.id] ?? [],
    }));

    // reset form and preview (clear file input via ref)
    resetForm();

    // allow dialog to close and then close
    allowCloseRef.current = true;
    setIsAnnounceOpen(false);
    setTitleError(false);
  }

  // Helper: convert LFComment[] -> CTComment[] for CommentThread initialComments
  function mapLFToCTComments(lf: LFComment[] | undefined): CTComment[] {
    if (!lf) return [];
    return lf.map((c) => ({
      id: c.id,
      author: c.author,
      avatar: c.avatar,
      course: undefined,
      content: c.content,
      likes: 0,
      replies: [],
      timestamp: c.timestamp,
    }));
  }

  // Handler when CommentThread changes comments for the active post:
  function handleCommentsChangeForActivePost(newComments: CTComment[]) {
    if (!activePost) return;
    // map back to simple LFComment[]
    const lfList: LFComment[] = newComments.map((nc) => ({
      id: nc.id,
      author: nc.author,
      avatar: nc.avatar,
      content: nc.content,
      timestamp: nc.timestamp,
    }));

    // update commentsByPost and post.comment count
    setCommentsByPost((prev) => ({ ...prev, [activePost.id]: lfList }));
    setPosts((prev) =>
      prev.map((p) => (p.id === activePost.id ? { ...p, comments: lfList.length } : p))
    );
  }

  // Open announce modal (explicit opener) - ensures no accidental close allowed
  function openAnnounceModal() {
    allowCloseRef.current = false;
    // clear any stale state immediately so the dialog shows fresh content
    resetForm();
    setIsAnnounceOpen(true);
  }

  // Local explicit close: invoked by the visible close button (DialogClose)
  // Reset the form and allow close then close the dialog.
  function handleClose() {
    allowCloseRef.current = true;
    // reset before closing so parent sees cleared state if needed
    resetForm();
    setIsAnnounceOpen(false);
  }

  // Dialog's onOpenChange handler that blocks unsolicited closes
  function handleAnnounceDialogChange(nextOpen: boolean) {
    if (nextOpen) {
      // dialog opened -> ensure fresh form and block accidental close
      allowCloseRef.current = false;
      resetForm();
      setIsAnnounceOpen(true);
      return;
    }
    // nextOpen === false: a close was requested (overlay click, ESC, etc.)
    if (allowCloseRef.current) {
      // allowed close -> reset and close
      resetForm();
      setIsAnnounceOpen(false);
      allowCloseRef.current = false;
      setTitleError(false);
    } else {
      // not allowed -> re-open (ignore the user's accidental close)
      setIsAnnounceOpen(true);
    }
  }

  return (
    <>
      <div className="min-h-screen bg-background-lm animate-fade-in">
        <main className="mx-auto max-w-4xl px-4 py-6">
          {/* Composer */}
          <div className="rounded-xl border border-stroke-grey bg-primary-lm p-4 mb-6">
            <Input
              placeholder="Tap to announce what has been lost or found"
              readOnly
              onClick={openAnnounceModal}
              className="cursor-pointer rounded-lg bg-primary-lm border-stroke-peach placeholder:text-text-lighter-lm focus-visible:ring-accent-lm focus-visible:border-accent-lm"
            />
          </div>

          {/* Posts */}
          <div className="space-y-4">
            {filtered.map((post) => (
              <LFPostCard
                key={post.id}
                post={post}
                onOpenComments={() => openComments(post)}
              />
            ))}
          </div>
        </main>

        {/* Announce Dialog */}
        <Dialog open={isAnnounceOpen} onOpenChange={handleAnnounceDialogChange}>
          <DialogContent className="sm:max-w-xl bg-primary-lm border-stroke-grey text-text-lm">
            <DialogHeader>
              <DialogTitle>Announce Lost or Found Item</DialogTitle>

              {/* Use the library's default close control (DialogClose).
                  Clicking this will call our handleClose to reset and allow close. */}
              <DialogClose
                onClick={(e) => {
                  // prevent nested DialogClose's default behavior from racing with our state change:
                  e.stopPropagation();
                  handleClose();
                }}
                className="absolute top-4 right-4 rounded-full bg-white/90 p-2 border border-stroke-grey"
                aria-label="Close announce dialog"
              >
                ✕
              </DialogClose>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              <div>
                <label className="text-sm text-text-lighter-lm">Title</label>
                <Input
                  placeholder="Title"
                  value={form.title}
                  onChange={(e) => {
                    setForm({ ...form, title: e.target.value });
                    if (titleError && e.target.value.trim()) setTitleError(false);
                  }}
                  className="mt-1 bg-primary-lm border-stroke-grey text-text-lm placeholder:text-text-lighter-lm focus-visible:ring-accent-lm focus-visible:border-accent-lm"
                />
                {titleError && (
                  <p className="text-sm text-red-600 mt-1">Title is required.</p>
                )}
              </div>

              <div>
                <label className="text-sm text-text-lighter-lm">
                  Description
                </label>
                <Textarea
                  placeholder="Describe the item and context"
                  rows={5}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className="mt-1 bg-primary-lm border-stroke-grey text-text-lm placeholder:text-text-lighter-lm focus-visible:ring-accent-lm focus-visible:border-accent-lm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-text-lighter-lm">Date</label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="mt-1 bg-primary-lm border-stroke-grey text-text-lm placeholder:text-text-lighter-lm focus-visible:ring-accent-lm focus-visible:border-accent-lm"
                  />
                </div>
                <div>
                  <label className="text-sm text-text-lighter-lm">Time</label>
                  <Input
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    className="mt-1 bg-primary-lm border-stroke-grey text-text-lm placeholder:text-text-lighter-lm focus-visible:ring-accent-lm focus-visible:border-accent-lm"
                  />
                </div>
              </div>

              {/* File upload + preview */}
              <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] items-center gap-3">
                <Button
                  className="bg-accent-lm hover:bg-hover-btn-lm text-primary-lm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Upload Image
                </Button>

                <div className="flex items-center gap-3">
                  <input
                    id="lf-file-input"
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      handleFileInput(e);
                    }}
                    className="hidden"
                  />

                  <div className="flex-1 border border-stroke-grey rounded-lg px-3 py-2 flex items-center">
                    {!imageDataUrl ? (
                      <div className="text-sm text-text-lighter-lm">No file chosen</div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setPreviewOpen(true)}
                          className="inline-block rounded-md overflow-hidden border border-stroke-grey"
                          aria-label="Open image preview"
                        >
                          <img
                            src={imageDataUrl}
                            alt={imageName ?? "Selected image"}
                            className="h-20 w-28 object-cover"
                          />
                        </button>

                        <div className="flex flex-col">
                          <div className="text-sm font-medium text-text-lm">
                            {imageName ?? "Image selected"}
                          </div>
                          <div className="text-xs text-text-lighter-lm">Click to expand</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Button
                className="w-full bg-accent-lm hover:bg-hover-btn-lm text-primary-lm"
                onClick={handlePost}
              >
                Post
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Expanded image preview lightbox (global, appears when clicking thumbnail inside dialog) */}
        {previewOpen && imageDataUrl && (
          <>
            <div
              className="fixed inset-0 z-60"
              onClick={() => setPreviewOpen(false)}
              style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
            />
            <div className="fixed inset-0 z-70 flex items-center justify-center p-6 pointer-events-none">
              <div
                className="pointer-events-auto max-w-[90vw] max-h-[90vh] relative"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setPreviewOpen(false)}
                  className="absolute top-2 right-2 z-80 rounded-full bg-white/90 p-2 border border-stroke-grey"
                  aria-label="Close preview"
                >
                  ✕
                </button>
                <img
                  src={imageDataUrl}
                  alt={imageName ?? "Selected image preview"}
                  className="max-w-full max-h-[80vh] object-contain rounded-md shadow-lg"
                />
                {imageName && (
                  <div className="mt-2 text-sm text-center text-text-lighter-lm">
                    {imageName}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Comments Dialog (uses your CommentThread) */}
        <Dialog open={isCommentsOpen} onOpenChange={(v) => setIsCommentsOpen(v)}>
          <DialogContent className="sm:max-w-xl bg-primary-lm border-stroke-grey text-text-lm">
            {activePost && (
              <div className="space-y-4">
                <DialogHeader>
                  <DialogTitle className="text-text-lm">
                    {activePost.author}
                  </DialogTitle>
                </DialogHeader>

                <div>
                  <h3 className="text-lg font-bold text-text-lm">
                    {activePost.title}
                  </h3>
                  <p className="text-text-lighter-lm mt-1">
                    {activePost.description}
                  </p>
                </div>

                <CommentThread
                  initialComments={mapLFToCTComments(commentsByPost[activePost.id])}
                  currentUser={{ name: "You", avatar: "/placeholder.svg", course: "—" }}
                  onChange={(newComments) => handleCommentsChangeForActivePost(newComments)}
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}

/**
 * Small helper component to render each post and handle "Read more" when description overflows.
 * Kept inside same file to avoid changing your project structure.
 */
function LFPostCard({ post, onOpenComments }: { post: LFPost; onOpenComments: () => void }) {
  const descRef = useRef<HTMLDivElement | null>(null);
  const [collapsed, setCollapsed] = useState(true);
  const [showReadMore, setShowReadMore] = useState(false);

  useEffect(() => {
    // measure overflow after render
    const el = descRef.current;
    if (!el) return;

    // use a small timeout to ensure styles applied
    const t = setTimeout(() => {
      // if scrollHeight is bigger than clientHeight, it overflows
      setShowReadMore(el.scrollHeight > el.clientHeight + 1);
    }, 0);

    // also listen for window resize to recompute
    const onResize = () => {
      if (!el) return;
      setShowReadMore(el.scrollHeight > el.clientHeight + 1);
    };
    window.addEventListener("resize", onResize);

    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", onResize);
    };
  }, [post.description]);

  return (
    <div
      className="bg-primary-lm p-6 rounded-xl border border-stroke-grey shadow-sm hover:shadow-md hover:border-stroke-peach transition animate-slide-in"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-xl font-bold text-text-lm">{post.title}</h3>
          <div className="mt-2 flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={post.authorAvatar || "/placeholder.svg"} />
              <AvatarFallback>{post.author[0]}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-text-lm">{post.author}</span>
            <span className="text-[12px] text-text-lighter-lm">{post.authorCourse}</span>
            <span className="text-[12px] text-text-lighter-lm">• {post.timestamp}</span>
          </div>
        </div>
        <MoreVertical className="h-5 w-5 text-accent-lm" />
      </div>

      <div className="mb-4">
        {/* description container: set a CSS maxHeight when collapsed so we can detect overflow */}
        <div
          ref={descRef}
          style={
            collapsed
              ? { maxHeight: "4.5rem", overflow: "hidden" } // approx 3 lines
              : undefined
          }
          className="text-text-lm mb-2"
        >
          {post.description}
        </div>

        {/* Read More only shows when content overflows the collapsed box */}
        {showReadMore && (
          <Button
            variant="ghost"
            className="ml-0 h-auto p-0 text-accent-lm"
            onClick={() => setCollapsed((c) => !c)}
          >
            {collapsed ? "Read More" : "Show less"}
          </Button>
        )}
      </div>

      {post.imageUrl && (
        <img src={post.imageUrl} alt="Lost item" className="w-full rounded-lg border border-stroke-grey mb-4" />
      )}

      <div className="mt-4 flex items-center gap-3">
        <button className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-stroke-peach bg-secondary-lm text-accent-lm">
          <Heart className="h-4 w-4" />
          <span className="text-sm font-bold">{post.reactions}</span>
        </button>

        <button
          className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-stroke-peach bg-secondary-lm text-accent-lm"
          onClick={onOpenComments}
        >
          <MessageCircle className="h-4 w-4" />
          <span className="text-sm font-bold">{post.comments}</span>
        </button>

        <button className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-stroke-peach bg-secondary-lm text-accent-lm">
          <Share2 className="h-4 w-4" />
          <span className="text-sm font-bold">{post.shares}</span>
        </button>
      </div>
    </div>
  );
}

export default LostFound;
