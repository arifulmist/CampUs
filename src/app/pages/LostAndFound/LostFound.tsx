import { useState, useEffect, useRef } from "react";
import {
  Heart,
  MessageCircle,
  Share2,
  MoreVertical,
} from "lucide-react";
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../../components/ui/avatar";
import cycleImg from "../../../assets/images/cycle.png";
import { Textarea } from "../../../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "../../../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";

import CommentThread, {
  type Comment as CTComment,
} from "./components/CommentThread";
import { addNotification } from "../../../mockData/notifications";
import { DialogOverlay } from "@radix-ui/react-dialog";
import { supabase } from "../../../../supabase/supabaseClient";

const lfAvatarCacheByAuthUid = new Map<string, string | null>();
const lfAvatarFetchInFlight = new Map<string, Promise<string | null>>();

type LFPost = {
  id: string;
  title: string;
  author: string;
  authorCourse: string;
  authorAvatar?: string;
  authorAuthUid?: string;
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
    reactions: 4,
    comments: 2,
    shares: 2,
    timestamp: "2h ago",
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
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: "", description: "" });

  // remove confirm dialog state
  const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);

  // posts state (initialized from mockPosts)
  const [posts, setPosts] = useState<LFPost[]>(mockPosts);

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

    async function loadFeed() {
      try {
        const { data: rows, error } = await supabase
          .from("all_posts")
          .select("post_id,title,description,author_id,like_count,comment_count,created_at")
          .eq("type", "lostfound")
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

        const mapped: LFPost[] = parsed
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
            const u = userByAuthUid.get(authorId);
            return {
              id: postId,
              title,
              author: u?.name ?? "Unknown",
              authorCourse: u?.course ?? "",
              authorAvatar: profilePicByAuthUid.get(authorId) ?? undefined,
              authorAuthUid: authorId,
              description,
              reactions: typeof r.like_count === "number" ? r.like_count : 0,
              comments: typeof r.comment_count === "number" ? r.comment_count : 0,
              shares: 0,
              timestamp: formatRelativeTime(r.created_at ?? null),
            } as LFPost;
          })
          .filter(Boolean) as LFPost[];

        if (!alive) return;
        if (mapped.length) setPosts(mapped);
      } catch (e) {
        // keep mock feed if load fails
        console.error(e);
      }
    }

    loadFeed();
    return () => {
      alive = false;
    };
  }, []);

  // track whether current user liked each post
  const [likedByMe, setLikedByMe] = useState<Record<string, boolean>>({});

  // toggle like/unlike and update reactions count accordingly
  const toggleLike = (postId: string) => {
    setLikedByMe((prevLiked) => {
      const wasLiked = !!prevLiked[postId];
      // update reactions count based on previous like state
      setPosts((prevPosts) =>
        prevPosts.map((p) =>
          p.id === postId
            ? {
                ...p,
                reactions: Math.max(0, p.reactions + (wasLiked ? -1 : 1)),
              }
            : p
        )
      );
      return { ...prevLiked, [postId]: !wasLiked };
    });
  };

  type LFComment = {
    id: string;
    author: string;
    avatar?: string;
    content: string;
    timestamp: string;
  };

  // commentsByPost stores simple comments; we will map to CommentThread's shape on demand
  const [commentsByPost, setCommentsByPost] = useState<
    Record<string, LFComment[]>
  >({
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

  // open edit dialog for a post
  const openEdit = (post: LFPost) => {
    setEditingPostId(post.id);
    setEditForm({ title: post.title, description: post.description });
    setIsEditOpen(true);
  };

  // save edit changes
  const saveEdit = () => {
    if (!editingPostId) return;
    const title = editForm.title.trim();
    const description = editForm.description.trim();
    setPosts((prev) =>
      prev.map((p) =>
        p.id === editingPostId
          ? { ...p, title: title || p.title, description }
          : p
      )
    );
    setIsEditOpen(false);
    setEditingPostId(null);
  };

  // request to remove: open confirm dialog
  const requestRemove = (postId: string) => {
    setPendingRemoveId(postId);
    setIsRemoveConfirmOpen(true);
  };

  // perform removal (called after confirm)
  const removePost = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    setCommentsByPost((prev) => {
      const { [postId]: _removed, ...rest } = prev;
      return rest;
    });
    if (activePost?.id === postId) {
      setIsCommentsOpen(false);
      setActivePost(null);
    }
    setIsRemoveConfirmOpen(false);
    setPendingRemoveId(null);
  };

  // Filtering posts (search query currently unused)
  const filtered = posts.filter((p) =>
    p.title.toLowerCase().includes(query.toLowerCase())
  );

  function generateId(prefix = "lf-") {
    return `${prefix}${Date.now().toString(36)}${Math.random()
      .toString(36)
      .slice(2)}`;
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
      author: currentUser.name,
      authorCourse: currentUser.course,
      authorAvatar: currentUser.avatarUrl ?? undefined,
      authorAuthUid: currentUser.authUid ?? undefined,
      description,
      imageUrl,
      reactions: 0,
      comments: 0,
      shares: 0,
      timestamp: "Just now",
    };

    setPosts((prev) => [newPost, ...prev]);

    // Notify: new Lost & Found post created
    addNotification({
      type: "lostfound",
      title: `Lost & Found: ${newPost.title}`,
      description: newPost.description,
      path: "/lost-and-found",
    });

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
      prev.map((p) =>
        p.id === activePost.id ? { ...p, comments: lfList.length } : p
      )
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
      <div className="lg:min-h-screen bg-background-lm lg:animate-fade-in">
        <main className="lg:mx-auto lg:max-w-4xl lg:px-4 lg:py-6">
          {/* Posts */}
          <div className="lg:space-y-4 bg-primary-lm lg:p-10 lg:rounded-xl border-2 border-stroke-grey">
            <div className="lg:rounded-lg lg:border border-stroke-grey bg-primary-lm lg:mb-6 lg:w-full hover:bg-hover-lm lg:transition">
              <Input
                placeholder="Tap to announce what has been lost or found"
                readOnly
                onClick={openAnnounceModal}
                className="cursor-pointer lg:rounded-lg border-none placeholder:text-accent-lm focus-visible:ring-accent-lm focus-visible:border-accent-lm"
              />
            </div>
            {filtered.length === 0 ? (
              <div className="text-center lg:py-10 text-text-lighter-lm">
                <p className="text-lg lg:font-medium">No posts available</p>
                <p className="text-sm lg:mt-1">
                  Be the first to announce a lost or found item.
                </p>
              </div>
            ) : (
              filtered.map((post) => (
                <LFPostCard
                  key={post.id}
                  post={post}
                  onOpenComments={() => openComments(post)}
                  onEdit={() => openEdit(post)}
                  onRemove={() => requestRemove(post.id)}
                  isLiked={!!likedByMe[post.id]}
                  onToggleLike={() => toggleLike(post.id)}
                />
              ))
            )}
          </div>
        </main>

        {/* Announce Dialog */}
        <Dialog open={isAnnounceOpen} onOpenChange={handleAnnounceDialogChange}>
          <DialogContent
            showCloseButton={false}
            className="sm:max-w-xl bg-primary-lm border-stroke-grey text-text-lm"
          >
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
                className="lg:absolute lg:top-4 lg:right-4 lg:rounded-full bg-white/90 lg:p-2 lg:border border-stroke-grey"
                aria-label="Close announce dialog"
              >
                {" "}
                x
              </DialogClose>
            </DialogHeader>

            <div className="lg:space-y-4 lg:mt-2">
              <div>
                <label className="text-sm text-text-lighter-lm">Title</label>
                <Input
                  placeholder="Title"
                  value={form.title}
                  onChange={(e) => {
                    setForm({ ...form, title: e.target.value });
                    if (titleError && e.target.value.trim())
                      setTitleError(false);
                  }}
                  className="lg:mt-1 bg-primary-lm border-stroke-grey text-text-lm placeholder:text-text-lighter-lm focus-visible:ring-accent-lm focus-visible:border-accent-lm"
                />
                {titleError && (
                  <p className="text-sm text-red-600 lg:mt-1">
                    Title is required.
                  </p>
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
                  className="lg:mt-1 bg-primary-lm border-stroke-grey text-text-lm placeholder:text-text-lighter-lm focus-visible:ring-accent-lm focus-visible:border-accent-lm"
                />
              </div>

              <div className="lg:grid lg:grid-cols-1 sm:grid-cols-2 lg:gap-3">
                <div>
                  <label className="text-sm text-text-lighter-lm">Date</label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="lg:mt-1 bg-primary-lm border-stroke-grey text-text-lm placeholder:text-text-lighter-lm focus-visible:ring-accent-lm focus-visible:border-accent-lm"
                  />
                </div>
                <div>
                  <label className="text-sm text-text-lighter-lm">Time</label>
                  <Input
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    className="lg:mt-1 bg-primary-lm border-stroke-grey text-text-lm placeholder:text-text-lighter-lm focus-visible:ring-accent-lm focus-visible:border-accent-lm"
                  />
                </div>
              </div>

              {/* File upload + preview */}
              <div className="lg:grid lg:grid-cols-1 sm:grid-cols-[auto_1fr] lg:items-center lg:gap-3">
                <Button
                  className="bg-accent-lm hover:bg-hover-btn-lm text-primary-lm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Upload Image
                </Button>

                <div className="lg:flex lg:items-center lg:gap-3">
                  <input
                    id="lf-file-input"
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      handleFileInput(e);
                    }}
                    className="lg:hidden"
                  />

                  <div className="lg:flex-1 lg:border border-stroke-grey lg:rounded-lg lg:px-3 lg:py-2 lg:flex lg:items-center">
                    {!imageDataUrl ? (
                      <div className="text-sm text-text-lighter-lm">
                        No file chosen
                      </div>
                    ) : (
                      <div className="lg:flex lg:items-center lg:gap-3">
                        <button
                          type="button"
                          onClick={() => setPreviewOpen(true)}
                          className="lg:inline-block lg:rounded-md lg:overflow-hidden lg:border border-stroke-grey"
                          aria-label="Open image preview"
                        >
                          <img
                            src={imageDataUrl}
                            alt={imageName ?? "Selected image"}
                            className="lg:h-20 lg:w-28 lg:object-cover"
                          />
                        </button>

                        <div className="lg:flex lg:flex-col">
                          <div className="text-sm lg:font-medium text-text-lm">
                            {imageName ?? "Image selected"}
                          </div>
                          <div className="text-xs text-text-lighter-lm">
                            Click to expand
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Button
                className="lg:w-full bg-accent-lm hover:bg-hover-btn-lm text-primary-lm"
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
              className="lg:fixed lg:inset-0 lg:z-60"
              onClick={() => setPreviewOpen(false)}
              style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
            />
            <div className="lg:fixed lg:inset-0 lg:z-70 lg:flex lg:items-center lg:justify-center lg:p-6 lg:pointer-events-none">
              <div
                className="lg:pointer-events-auto lg:max-w-[90vw] lg:max-h-[90vh] lg:relative"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setPreviewOpen(false)}
                  className="lg:absolute lg:top-2 lg:right-2 lg:z-80 lg:rounded-full bg-white/90 lg:p-2 lg:border border-stroke-grey"
                  aria-label="Close preview"
                >
                  ✕
                </button>
                <img
                  src={imageDataUrl}
                  alt={imageName ?? "Selected image preview"}
                  className="lg:max-w-full lg:max-h-[80vh] lg:object-contain lg:rounded-md lg:shadow-lg"
                />
                {imageName && (
                  <div className="lg:mt-2 text-sm text-center text-text-lighter-lm">
                    {imageName}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        <Dialog
          open={isCommentsOpen}
          onOpenChange={(v) => setIsCommentsOpen(v)}
        >
          <DialogOverlay className="bg-stroke-grey lg:z-100"></DialogOverlay>
          <DialogContent className="sm:max-w-xl bg-primary-lm border-stroke-grey text-text-lm">
            {activePost && (
              <div className="lg:space-y-4">
                <DialogHeader>
                  <DialogTitle className="text-text-lm">
                    {activePost.author}
                  </DialogTitle>
                </DialogHeader>

                <div>
                  <h3 className="text-lg lg:font-bold text-text-lm">
                    {activePost.title}
                  </h3>
                  <p className="text-text-lighter-lm lg:mt-1">
                    {activePost.description}
                  </p>
                </div>

                <CommentThread
                  initialComments={mapLFToCTComments(
                    commentsByPost[activePost.id]
                  )}
                  currentUser={{
                    name: currentUser.name,
                    avatar: currentUser.avatarUrl ?? "/placeholder.svg",
                    course: currentUser.course,
                  }}
                  onChange={(newComments) =>
                    handleCommentsChangeForActivePost(newComments)
                  }
                />
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Post Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-xl bg-primary-lm border-stroke-grey text-text-lm">
            <DialogHeader>
              <DialogTitle>Edit Post</DialogTitle>
            </DialogHeader>
            <div className="lg:space-y-4 lg:mt-2">
              <div>
                <label className="text-sm text-text-lighter-lm">Title</label>
                <Input
                  placeholder="Title"
                  value={editForm.title}
                  onChange={(e) =>
                    setEditForm({ ...editForm, title: e.target.value })
                  }
                  className="lg:mt-1 bg-primary-lm border-stroke-grey text-text-lm placeholder:text-text-lighter-lm focus-visible:ring-accent-lm focus-visible:border-accent-lm"
                />
              </div>
              <div>
                <label className="text-sm text-text-lighter-lm">
                  Description
                </label>
                <Textarea
                  placeholder="Description"
                  rows={5}
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm({ ...editForm, description: e.target.value })
                  }
                  className="lg:mt-1 bg-primary-lm border-stroke-grey text-text-lm placeholder:text-text-lighter-lm focus-visible:ring-accent-lm focus-visible:border-accent-lm"
                />
              </div>
              <div className="lg:grid lg:grid-cols-2 lg:gap-3">
                <Button
                  className="bg-accent-lm hover:bg-hover-btn-lm text-primary-lm"
                  onClick={saveEdit}
                >
                  Save
                </Button>
                <Button
                  variant="outline"
                  className="border-stroke-grey text-text-lm"
                  onClick={() => setIsEditOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Remove Post Confirm Dialog */}
        <Dialog
          open={isRemoveConfirmOpen}
          onOpenChange={setIsRemoveConfirmOpen}
        >
          <DialogContent className="sm:max-w-md bg-primary-lm lg:border border-stroke-peach text-text-lm">
            <DialogHeader>
              <DialogTitle>Hide Post?</DialogTitle>
            </DialogHeader>
            {/* <div className="lg:mt-1 lg:flex lg:items-center lg:gap-2 lg:rounded-md bg-secondary-lm lg:border border-stroke-peach lg:p-2">
              <AlertTriangle className="lg:h-4 lg:w-4 text-accent-lm" />
              <span className="text-sm text-accent-lm">
                This action cannot be undone.
              </span>
            </div> */}
            <div className="lg:grid lg:grid-cols-2 lg:gap-3 lg:mt-4">
              <Button
                variant="outline"
                className="border-stroke-grey text-text-lm hover:bg-secondary-lm"
                onClick={() => setIsRemoveConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="bg-accent-lm hover:bg-hover-btn-lm text-primary-lm focus-visible:ring-accent-lm"
                onClick={() => {
                  if (pendingRemoveId) removePost(pendingRemoveId);
                }}
              >
                Hide
              </Button>
            </div>
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
function LFPostCard({
  post,
  onOpenComments,
  onEdit,
  onRemove,
  isLiked,
  onToggleLike,
}: {
  post: LFPost;
  onOpenComments: () => void;
  onEdit: () => void;
  onRemove: () => void;
  isLiked: boolean;
  onToggleLike: () => void;
}) {
  const descRef = useRef<HTMLDivElement | null>(null);
  const [collapsed, setCollapsed] = useState(true);
  const [showReadMore, setShowReadMore] = useState(false);
  const [resolvedAvatar, setResolvedAvatar] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const authUid = post.authorAuthUid;
    if (!authUid) {
      setResolvedAvatar(null);
      return () => {
        mounted = false;
      };
    }

    const cached = lfAvatarCacheByAuthUid.get(authUid);
    if (cached !== undefined) {
      setResolvedAvatar(cached);
      return () => {
        mounted = false;
      };
    }

    const existing = lfAvatarFetchInFlight.get(authUid);
    const promise =
      existing ??
      (async () => {
        const { data, error } = await supabase
          .from("user_profile")
          .select("profile_picture_url")
          .eq("auth_uid", authUid)
          .maybeSingle();
        if (error) throw error;
        const url = (data as unknown as { profile_picture_url?: unknown } | null)?.profile_picture_url;
        return typeof url === "string" && url.trim() ? url : null;
      })();

    if (!existing) lfAvatarFetchInFlight.set(authUid, promise);

    promise
      .then((url) => {
        lfAvatarCacheByAuthUid.set(authUid, url);
        lfAvatarFetchInFlight.delete(authUid);
        if (mounted) setResolvedAvatar(url);
      })
      .catch((e) => {
        lfAvatarCacheByAuthUid.set(authUid, null);
        lfAvatarFetchInFlight.delete(authUid);
        if (mounted) setResolvedAvatar(null);
        console.error("Failed to load Lost&Found avatar:", e);
      });

    return () => {
      mounted = false;
    };
  }, [post.authorAuthUid]);

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
    <div className="bg-secondary-lm lg:p-6 lg:rounded-xl lg:border border-stroke-grey hover:border-stroke-peach hover:bg-hover-lm lg:transition lg:animate-slide-in">
      <div className="lg:flex lg:items-start lg:justify-between lg:mb-3">
        <div>
          <h3 className="text-xl lg:font-bold text-text-lm">{post.title}</h3>
          <div className="lg:mt-2 lg:flex lg:items-center lg:gap-2">
            <Avatar className="lg:h-6 lg:w-6">
              <AvatarImage src={(resolvedAvatar ?? post.authorAvatar) || "/placeholder.svg"} />
              <AvatarFallback>{post.author[0]}</AvatarFallback>
            </Avatar>
            <span className="text-sm lg:font-medium text-text-lm">
              {post.author}
            </span>
            <span className="text-[12px] text-text-lighter-lm">
              {post.authorCourse}
            </span>
            <span className="text-[12px] text-text-lighter-lm">
              • {post.timestamp}
            </span>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="lg:p-1 lg:rounded hover:bg-secondary-lm"
              aria-label="Post options"
            >
              <MoreVertical className="lg:h-5 lg:w-5 text-accent-lm" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="bg-primary-lm lg:border border-stroke-grey text-text-lm lg:rounded-lg lg:shadow-md"
          >
            <DropdownMenuItem
              onClick={onEdit}
              className="text-accent-lm hover:bg-secondary-lm hover:text-accent-lm focus:bg-secondary-lm"
            >
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-accent-lm hover:bg-secondary-lm hover:text-accent-lm focus:bg-secondary-lm"
              onClick={onRemove}
            >
              Hide
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="lg:mb-4">
        {/* description container: set a CSS maxHeight when collapsed so we can detect overflow */}
        <div
          ref={descRef}
          style={
            collapsed
              ? { maxHeight: "4.5rem", overflow: "hidden" } // approx 3 lines
              : undefined
          }
          className="text-text-lm lg:mb-2"
        >
          {post.description}
        </div>

        {/* Read More only shows when content overflows the collapsed box */}
        {showReadMore && (
          <Button
            variant="ghost"
            className="lg:ml-0 lg:h-auto lg:p-0 text-accent-lm"
            onClick={() => setCollapsed((c) => !c)}
          >
            {collapsed ? "Read More" : "Show less"}
          </Button>
        )}
      </div>

      {post.imageUrl && (
        <img
          src={post.imageUrl}
          alt="Lost item"
          className="lg:w-full lg:rounded-lg lg:border border-stroke-grey lg:mb-4"
        />
      )}

      <div className="lg:mt-4 lg:flex lg:items-center lg:gap-3">
        <button
          onClick={onToggleLike}
          className={
            "flex items-center gap-1.5 px-3 py-1 rounded-full border " +
            (isLiked
              ? "border-stroke-peach bg-accent-lm text-primary-lm"
              : "border-stroke-peach bg-secondary-lm text-accent-lm")
          }
        >
          <Heart className="lg:h-4 lg:w-4" fill={isLiked ? "currentColor" : "none"} />
          <span className="text-sm lg:font-bold">{post.reactions}</span>
        </button>

        <button
          className="lg:flex lg:items-center lg:gap-1.5 lg:px-3 lg:py-1 lg:rounded-full lg:border border-stroke-peach bg-secondary-lm text-accent-lm"
          onClick={onOpenComments}
        >
          <MessageCircle className="lg:h-4 lg:w-4" />
          <span className="text-sm lg:font-bold">{post.comments}</span>
        </button>

        <button className="lg:flex lg:items-center lg:gap-1.5 lg:px-3 lg:py-1 lg:rounded-full lg:border border-stroke-peach bg-secondary-lm text-accent-lm">
          <Share2 className="lg:h-4 lg:w-4" />
          <span className="text-sm lg:font-bold">{post.shares}</span>
        </button>
      </div>
    </div>
  );
}

export default LostFound;
