// src/app/pages/LostAndFound/LostFound.tsx
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
import { supabase } from "@/supabase/supabaseClient";
import { LFPostCard, type LFPost as UIFeedLFPost } from "./components/LFPostCard";

// backend service (functions)
import {
  fetchLostAndFoundPosts,
  createLostAndFoundPost,
  deleteLostAndFoundPost,
  changePostLikeCount,
  changePostCommentCount,
} from "./backend/lostAndFoundService";
import type { LFPost as BackendLFPost } from "./backend/lostAndFoundService";

/* -------------------------------------------------------------------------- */
/* helpers / small utilities                                                   */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/* Component                                                                   */
/* -------------------------------------------------------------------------- */

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
  const [activePost, setActivePost] = useState<UIFeedLFPost | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: "", description: "" });

  const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);

  // posts state (initialized empty; we will fetch)
  const [posts, setPosts] = useState<UIFeedLFPost[]>([]);

  const [currentUser, setCurrentUser] = useState<{
    authUid: string | null;
    name: string;
    course: string;
    avatarUrl: string | null;
  }>({ authUid: null, name: "You", course: "—", avatarUrl: null });

  // load current user info (unchanged behavior but simplified)
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

  // Fetch posts from backend on mount
  useEffect(() => {
    let alive = true;
    (async function load() {
      try {
        const backendPosts: BackendLFPost[] = await fetchLostAndFoundPosts({ limit: 50, order: "newest" });

        if (!alive) return;

        // map backend LFPost -> UI LFPost (UI expects fields used by LFPostCard)
        const mapped: UIFeedLFPost[] = backendPosts.map((bp) => ({
          id: bp.id,
          title: bp.title,
          author: bp.authorName ?? "Unknown",
          authorCourse: bp.authorCourse ?? "",
          authorAvatar: bp.authorAvatar ?? undefined,
          authorAuthUid: bp.authorAuthUid ?? undefined,
          description: bp.description,
          imageUrl: bp.imgUrl ?? undefined,
          reactions: typeof bp.likeCount === "number" ? bp.likeCount : 0,
          comments: typeof bp.commentCount === "number" ? bp.commentCount : 0,
          shares: 0,
          timestamp: formatRelativeTime(bp.createdAt ?? null),
        }));
        setPosts(mapped);
      } catch (err) {
        console.error("Failed loading Lost & Found posts:", err);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // track whether current user liked each post (local)
  const [likedByMe, setLikedByMe] = useState<Record<string, boolean>>({});

  const [commentsByPost, setCommentsByPost] = useState<Record<string, { id: string; author: string; avatar?: string; content: string; timestamp: string }[]>>({
    // keep any mock defaults if needed
  });

  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const allowCloseRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const openComments = (post: UIFeedLFPost) => {
    setActivePost(post);
    setIsCommentsOpen(true);
  };

  const openEdit = (post: UIFeedLFPost) => {
    setEditingPostId(post.id);
    setEditForm({ title: post.title, description: post.description });
    setIsEditOpen(true);
  };

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

  const requestRemove = (postId: string) => {
    setPendingRemoveId(postId);
    setIsRemoveConfirmOpen(true);
  };

  // perform removal (backend + UI)
  const removePost = async (postId: string) => {
    try {
      // optimistic UI removal
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

      await deleteLostAndFoundPost(postId);
    } catch (err) {
      console.error("Failed to delete post:", err);
      // On failure, we could reload posts; for now inform user and reload simple way:
      try {
        const backendPosts = await fetchLostAndFoundPosts({ limit: 50, order: "newest" });
        const mapped = backendPosts.map((bp) => ({
          id: bp.id,
          title: bp.title,
          author: bp.authorName ?? "Unknown",
          authorCourse: bp.authorCourse ?? "",
          authorAvatar: bp.authorAvatar ?? undefined,
          authorAuthUid: bp.authorAuthUid ?? undefined,
          description: bp.description,
          imageUrl: bp.imgUrl ?? undefined,
          reactions: typeof bp.likeCount === "number" ? bp.likeCount : 0,
          comments: typeof bp.commentCount === "number" ? bp.commentCount : 0,
          shares: 0,
          timestamp: formatRelativeTime(bp.createdAt ?? null),
        }));
        setPosts(mapped);
      } catch (e) {
        console.error("Error reloading posts after failed delete", e);
      }
    }
  };

  const filtered = posts.filter((p) =>
    p.title.toLowerCase().includes(query.toLowerCase())
  );

  function generateId(prefix = "lf-") {
    return `${prefix}${Date.now().toString(36)}${Math.random()
      .toString(36)
      .slice(2)}`;
  }

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
    if (fileInputRef.current) {
      try {
        fileInputRef.current.value = "";
      } catch {
        // ignore
      }
    }
  }

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

  // Create post -> call backend createLostAndFoundPost
  async function handlePost() {
    const title = form.title.trim();
    const description = form.description.trim();

    if (!title) {
      setTitleError(true);
      return;
    }

    // optimistic UI post
    const newId = generateId("lf-");
    const newPost: UIFeedLFPost = {
      id: newId,
      title,
      author: currentUser.name,
      authorCourse: currentUser.course,
      authorAvatar: currentUser.avatarUrl ?? undefined,
      authorAuthUid: currentUser.authUid ?? undefined,
      description,
      imageUrl: imageDataUrl ?? undefined,
      reactions: 0,
      comments: 0,
      shares: 0,
      timestamp: "Just now",
    };

    setPosts((prev) => [newPost, ...prev]);
    addNotification({
      type: "lostfound",
      title: `Lost & Found: ${newPost.title}`,
      description: newPost.description,
      path: "/lost-and-found",
    });
    setCommentsByPost((prev) => ({ ...prev, [newPost.id]: prev[newPost.id] ?? [] }));

    resetForm();
    allowCloseRef.current = true;
    setIsAnnounceOpen(false);
    setTitleError(false);

    // send to backend
    try {
      const created = await createLostAndFoundPost({
        authorAuthUid: currentUser.authUid,
        title,
        description,
        dateLostOrFound: form.date || undefined,
        timeLostOrFound: form.time || undefined,
        imgUrl: imageDataUrl ?? undefined, // for now store base64; recommended: upload to storage and pass public url
      });

      // replace optimistic post with server post mapping
      const serverMapped: UIFeedLFPost = {
        id: created.id,
        title: created.title,
        author: created.authorName ?? "Unknown",
        authorCourse: created.authorCourse ?? "",
        authorAvatar: created.authorAvatar ?? undefined,
        authorAuthUid: created.authorAuthUid ?? undefined,
        description: created.description,
        imageUrl: created.imgUrl ?? undefined,
        reactions: typeof created.likeCount === "number" ? created.likeCount : 0,
        comments: typeof created.commentCount === "number" ? created.commentCount : 0,
        shares: 0,
        timestamp: formatRelativeTime(created.createdAt ?? null),
      };

      setPosts((prev) => [serverMapped, ...prev.filter((p) => p.id !== newId)]);
    } catch (err) {
      console.error("Failed to create lost & found post:", err);
      // rollback optimistic insertion: remove the optimistic post
      setPosts((prev) => prev.filter((p) => p.id !== newId));
      // optionally notify user
    }
  }

  // convert LFComment[] -> CTComment[] for CommentThread initialComments
  function mapLFToCTComments(lf: { id: string; author: string; avatar?: string; content: string; timestamp: string }[] | undefined): CTComment[] {
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

  // When CommentThread changes comments for the active post:
  async function handleCommentsChangeForActivePost(newComments: CTComment[]) {
    if (!activePost) return;
    const lfList = newComments.map((nc) => ({
      id: nc.id,
      author: nc.author,
      avatar: nc.avatar,
      content: nc.content,
      timestamp: nc.timestamp,
    }));

    // compute delta and update post.comment_count on backend
    const prevCount = posts.find((p) => p.id === activePost.id)?.comments ?? 0;
    const newCount = lfList.length;
    const delta = newCount - prevCount;

    setCommentsByPost((prev) => ({ ...prev, [activePost.id]: lfList }));
    setPosts((prev) =>
      prev.map((p) =>
        p.id === activePost.id ? { ...p, comments: newCount } : p
      )
    );

    if (delta !== 0) {
      try {
        await changePostCommentCount(activePost.id, delta);
      } catch (err) {
        console.error("Failed to update comment count on backend:", err);
        // optionally re-sync from backend
      }
    }
  }

  function openAnnounceModal() {
    allowCloseRef.current = false;
    resetForm();
    setIsAnnounceOpen(true);
  }

  function handleClose() {
    allowCloseRef.current = true;
    resetForm();
    setIsAnnounceOpen(false);
  }

  function handleAnnounceDialogChange(nextOpen: boolean) {
    if (nextOpen) {
      allowCloseRef.current = false;
      resetForm();
      setIsAnnounceOpen(true);
      return;
    }
    if (allowCloseRef.current) {
      resetForm();
      setIsAnnounceOpen(false);
      allowCloseRef.current = false;
      setTitleError(false);
    } else {
      setIsAnnounceOpen(true);
    }
  }

  // toggle like with backend call (optimistic)
  async function toggleLikeBackend(postId: string) {
    setLikedByMe((prevLiked) => {
      const wasLiked = !!prevLiked[postId];
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

    try {
      // determine whether we should add or remove like
      const isNowLiked = !likedByMe[postId];
      const delta = isNowLiked ? +1 : -1;
      const newCount = await changePostLikeCount(postId, delta);
      // sync the count to server value
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, reactions: newCount } : p)));
    } catch (err) {
      console.error("Failed to toggle like:", err);
      // revert optimistic toggle on error
      setLikedByMe((prev) => ({ ...prev, [postId]: !!prev[postId] }));
      // reload count from backend as fallback
      try {
        const backendPosts = await fetchLostAndFoundPosts({ limit: 50, order: "newest" });
        const mapped = backendPosts.map((bp) => ({
          id: bp.id,
          title: bp.title,
          author: bp.authorName ?? "Unknown",
          authorCourse: bp.authorCourse ?? "",
          authorAvatar: bp.authorAvatar ?? undefined,
          authorAuthUid: bp.authorAuthUid ?? undefined,
          description: bp.description,
          imageUrl: bp.imgUrl ?? undefined,
          reactions: typeof bp.likeCount === "number" ? bp.likeCount : 0,
          comments: typeof bp.commentCount === "number" ? bp.commentCount : 0,
          shares: 0,
          timestamp: formatRelativeTime(bp.createdAt ?? null),
        }));
        setPosts(mapped);
      } catch {
        /* ignore */
      }
    }
  }

  /* ------------------------------------------------------------------------ */
  /* RENDER                                                                   */
  /* ------------------------------------------------------------------------ */

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
                  onToggleLike={() => toggleLikeBackend(post.id)}
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

              <DialogClose
                onClick={(e) => {
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
                    if (titleError && e.target.value.trim()) setTitleError(false);
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
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
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

        {/* Expanded image preview lightbox */}
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
                  initialComments={mapLFToCTComments(commentsByPost[activePost.id])}
                  currentUser={{
                    name: "Alvi Binte Zamil",
                    avatar: "/placeholder.svg",
                    course: "CSE-23",
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
              <AvatarImage src={post.authorAvatar || "/placeholder.svg"} />
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
