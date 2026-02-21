import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  EllipsisVertical as LucideEllipsis,
  LucideArrowLeft,
  LucidePaperclip,
  LucideSendHorizontal,
  LucideTrash2,
  LucideUserRound,
  LucideX,
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import ImagePreview from "@/components/ImagePreview";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import {
  getMessagesPage,
  getOrCreateConversation,
  deleteConversation,
  markMessagesAsRead,
  sendMessage,
  updateMessage,
  deleteMessage,
  subscribeToMessages,
  type Message,
} from "../utils/messagingUtils";
import { supabase } from "@/supabase/supabaseClient";
import { formatTimeToLocale } from "@/utils/datetime";

export interface chatUser {
  userName: string;
  userAvatar: string;
  userBatch?: string;
  onlineStatus?: boolean;
}

interface ChatHistoryProps extends chatUser {
  conversationId: string;
  onBack: () => void;
  metaLoading?: boolean;
  otherUserId?: string | null;
  onConversationCreated?: (conversationId: string) => void;
  onConversationDeleted?: (conversationId: string) => void;
}

export function ChatHistory({
  conversationId,
  userName,
  userAvatar,
  userBatch,
  onlineStatus,
  onBack,
  metaLoading = false,
  otherUserId = null,
  onConversationCreated,
  onConversationDeleted,
}: ChatHistoryProps) {
  const navigate = useNavigate();
  const IMAGE_PREFIX = "__image__:";

  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasOlder, setHasOlder] = useState(false);
  const [oldestCursor, setOldestCursor] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [attachedImage, setAttachedImage] = useState<File | null>(null);
  const [attachedImagePreviewUrl, setAttachedImagePreviewUrl] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [unsendOpen, setUnsendOpen] = useState(false);
  const [unsendMessageId, setUnsendMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatBodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const didInitialScrollRef = useRef(false);
  const scrollRafRef = useRef<number | null>(null);
  const markReadInFlightRef = useRef(false);
  const prevConversationIdRef = useRef<string | null>(null);
  const lastUpdateKindRef = useRef<"initial" | "append" | "prepend">("initial");

  const PAGE_SIZE = 50;

  const isTempConversation =
    !conversationId ||
    conversationId === "loading" ||
    conversationId.startsWith("temp-");

  const handleViewProfile = async () => {
    if (!otherUserId) return;

    try {
      const { data, error } = await supabase
        .from("user_info")
        .select("student_id")
        .eq("auth_uid", otherUserId)
        .maybeSingle();

      if (error) throw error;
      const studentId = (data as unknown as { student_id?: unknown } | null)?.student_id;
      if (typeof studentId === "string" && studentId.trim()) {
        navigate(`/profile/${encodeURIComponent(studentId.trim())}`);
      }
    } catch (e) {
      console.error("Failed to navigate to user profile:", e);
    }
  };

  useEffect(() => {
    if (!menuOpen) return;

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node | null;
      if (!target) return;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const clearAttachment = () => {
    setAttachedImage(null);
    setAttachmentError(null);
    if (attachedImagePreviewUrl) {
      URL.revokeObjectURL(attachedImagePreviewUrl);
      setAttachedImagePreviewUrl(null);
    }
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setNewMessage("");
    clearAttachment();
  };

  useEffect(() => {
    if (!editingMessageId) return;

    // Focus after the DOM updates.
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      const el = inputRef.current;
      if (el) {
        try {
          const len = el.value.length;
          el.setSelectionRange(len, len);
        } catch {
          // ignore
        }
      }
    });
  }, [editingMessageId]);

  useEffect(() => {
    return () => {
      if (attachedImagePreviewUrl) URL.revokeObjectURL(attachedImagePreviewUrl);
    };
  }, [attachedImagePreviewUrl]);

  const handlePickImage = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    if (!file.type.startsWith("image/")) return;

    // Replace any previous attachment
    if (attachedImagePreviewUrl) URL.revokeObjectURL(attachedImagePreviewUrl);
    setAttachedImage(file);
    setAttachedImagePreviewUrl(URL.createObjectURL(file));
    setAttachmentError(null);

    // allow selecting the same file again after clearing
    e.target.value = "";
  };

  const openPreview = (src: string, name?: string) => {
    setPreviewSrc(src);
    setPreviewName(name ?? null);
    setPreviewOpen(true);
  };

  const closePreview = () => {
    setPreviewOpen(false);
    setPreviewSrc(null);
    setPreviewName(null);
  };

  const getFileExtension = (filename: string) => {
    const parts = filename.split(".");
    if (parts.length < 2) return "";
    const ext = parts[parts.length - 1]?.trim();
    return ext ? `.${ext}` : "";
  };

  const encodeImageMessageBody = (path: string, filename: string) => {
    return `${IMAGE_PREFIX}${encodeURIComponent(path)}::${encodeURIComponent(filename)}`;
  };

  // Get current user ID
  useEffect(() => {
    async function getCurrentUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    }
    getCurrentUser();
  }, []);

  // Fetch messages when conversation changes
  useLayoutEffect(() => {
    const prevId = prevConversationIdRef.current;
    prevConversationIdRef.current = conversationId ?? null;

    // If we just switched from a temp id to a real conversation id,
    // force loading before paint and clear old messages to avoid flicker/stale UI.
    if (!conversationId) return;
    if (conversationId === "loading" || conversationId.startsWith("temp-")) return;

    const expectedTempId = otherUserId ? `temp-${otherUserId}` : null;
    const switchingFromTempToRealSameChat = !!expectedTempId && prevId === expectedTempId;

    // When we just created a conversation on first send, don't blank the UI.
    // Keep the optimistic messages and let the background fetch refresh.
    if (switchingFromTempToRealSameChat) {
      setLoading(false);
      didInitialScrollRef.current = false;
      return;
    }

    setMessages([]);
    setLoading(true);
    didInitialScrollRef.current = false;
  }, [conversationId, otherUserId]);

  useEffect(() => {
    async function loadMessages() {
      if (!conversationId) {
        setMessages([]);
        setLoading(false);
        setHasOlder(false);
        setOldestCursor(null);
        return;
      }

      // New chat (no conversation yet): show empty state, not a blocking loader
      if (conversationId === "loading" || conversationId.startsWith("temp-")) {
        setMessages([]);
        setLoading(false);
        setHasOlder(false);
        setOldestCursor(null);
        return;
      }

      setLoading(true);
      lastUpdateKindRef.current = "initial";

      // Load newest page first for speed.
      // Ask for one extra row so we can detect if there are older messages.
      const page = await getMessagesPage(conversationId, { limit: PAGE_SIZE + 1 });
      const nextHasOlder = page.length > PAGE_SIZE;
      const pageTrimmed = nextHasOlder ? page.slice(page.length - PAGE_SIZE) : page;

      setMessages(pageTrimmed);
      setHasOlder(nextHasOlder);
      setOldestCursor(pageTrimmed[0]?.created_at ?? null);
      setLoading(false);

      // If the user is currently viewing this conversation, treat any existing unread
      // incoming messages as read immediately.
      if (!markReadInFlightRef.current) {
        markReadInFlightRef.current = true;
        try {
          await markMessagesAsRead(conversationId);
        } finally {
          markReadInFlightRef.current = false;
        }
      }
    }

    loadMessages();
  }, [conversationId]);

  const loadOlderMessages = async () => {
    if (!conversationId) return;
    if (conversationId === "loading" || conversationId.startsWith("temp-")) return;
    if (loading || loadingOlder) return;
    if (!hasOlder) return;

    const container = chatBodyRef.current;
    if (!container) return;

    const before = oldestCursor;
    if (!before) {
      setHasOlder(false);
      return;
    }

    setLoadingOlder(true);
    const prevScrollHeight = container.scrollHeight;
    const prevScrollTop = container.scrollTop;

    try {
      lastUpdateKindRef.current = "prepend";
      const page = await getMessagesPage(conversationId, { before, limit: PAGE_SIZE + 1 });
      const nextHasOlder = page.length > PAGE_SIZE;
      const pageTrimmed = nextHasOlder ? page.slice(page.length - PAGE_SIZE) : page;

      if (pageTrimmed.length === 0) {
        setHasOlder(false);
        return;
      }

      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const toPrepend = pageTrimmed.filter((m) => !existingIds.has(m.id));
        return [...toPrepend, ...prev];
      });
      setHasOlder(nextHasOlder);
      setOldestCursor(pageTrimmed[0]?.created_at ?? before);

      // Keep the viewport anchored (avoid jumping to bottom due to new content above).
      requestAnimationFrame(() => {
        const nextScrollHeight = container.scrollHeight;
        container.scrollTop = prevScrollTop + (nextScrollHeight - prevScrollHeight);
      });
    } finally {
      setLoadingOlder(false);
    }
  };

  // Subscribe to real-time message updates
  useEffect(() => {
    if (!conversationId || conversationId === "loading" || conversationId.startsWith("temp-")) return;

    return subscribeToMessages(conversationId, (newMsg) => {
      setMessages((prev) => {
        // Check if message already exists to avoid duplicates
        const exists = prev.some((msg) => msg.id === newMsg.id);
        if (exists) return prev;
        lastUpdateKindRef.current = "append";
        return [...prev, newMsg];
      });

      // If we received a message from the other user while this chat is open,
      // mark it as read right away so the unread dot/count doesn't persist.
      if (newMsg.sender_id !== currentUserId && !markReadInFlightRef.current) {
        markReadInFlightRef.current = true;
        Promise.resolve(markMessagesAsRead(conversationId))
          .catch((error) => {
            console.error("Failed to mark messages as read:", error);
          })
          .finally(() => {
            markReadInFlightRef.current = false;
          });
      }
    });
  }, [conversationId, currentUserId]);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // One-time initial scroll after the first real message load renders.
  useLayoutEffect(() => {
    if (metaLoading) return;
    if (isTempConversation) return;
    if (loading) return;
    if (messages.length === 0) return;
    if (didInitialScrollRef.current) return;

    didInitialScrollRef.current = true;

    if (scrollRafRef.current) {
      cancelAnimationFrame(scrollRafRef.current);
      scrollRafRef.current = null;
    }

    // Double-rAF to ensure DOM + layout settle before we jump.
    requestAnimationFrame(() => {
      scrollRafRef.current = requestAnimationFrame(() => {
        scrollToBottom("auto");
        scrollRafRef.current = null;
      });
    });
  }, [metaLoading, isTempConversation, loading, messages.length]);

  // After initial scroll, keep existing behavior: scroll on updates.
  useEffect(() => {
    if (!didInitialScrollRef.current) return;
    if (messages.length === 0) return;
    if (lastUpdateKindRef.current === "prepend") return;
    scrollToBottom("smooth");
  }, [messages.length]);

  useEffect(() => {
    return () => {
      if (scrollRafRef.current) {
        cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
    };
  }, []);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();

    const hasText = !!newMessage.trim();
    const hasAttachment = !!attachedImage;
    if (sending) return;

    // Edit mode: only allow text edits.
    if (editingMessageId) {
      if (!hasText) return;

      setSending(true);
      const messageBody = newMessage.trim();
      setNewMessage("");

      try {
        const updated = await updateMessage(editingMessageId, messageBody);
        if (!updated) {
          setNewMessage(messageBody);
          return;
        }

        setMessages((prev) => prev.map((m) => (m.id === updated.id ? { ...m, message_body: updated.message_body } : m)));
        setEditingMessageId(null);
      } catch (error) {
        console.error("Failed to update message:", error);
        setNewMessage(messageBody);
      } finally {
        setSending(false);
      }

      return;
    }

    if ((!hasText && !hasAttachment)) return;

    setSending(true);
    const messageBody = newMessage.trim();
    if (hasText) setNewMessage(""); // Clear input immediately for better UX

    try {
      let activeConversationId = conversationId;
      let createdConversationId: string | null = null;
      let anySent = false;

      // If this is a brand-new chat, create the conversation only when sending the first message
      if (!activeConversationId || activeConversationId === "loading" || activeConversationId.startsWith("temp-")) {
        if (!otherUserId) {
          if (hasText) setNewMessage(messageBody);
          return;
        }
        const createdId = await getOrCreateConversation(otherUserId);
        if (!createdId) {
          if (hasText) setNewMessage(messageBody);
          return;
        }
        createdConversationId = createdId;
        activeConversationId = createdId;
      }

      // 1) Send text (if any)
      if (hasText) {
        const sentTextMessage = await sendMessage(activeConversationId, messageBody);
        if (sentTextMessage) {
          anySent = true;
          setMessages((prev) => {
            const exists = prev.some((m) => m.id === sentTextMessage.id);
            return exists ? prev : [...prev, sentTextMessage];
          });
        } else {
          setNewMessage(messageBody);
        }
      }

      // 2) Upload + send image (if any)
      if (attachedImage) {
        const ext = getFileExtension(attachedImage.name);
        const uuid =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const path = `${activeConversationId}/${uuid}${ext}`;

        const { error: uploadError } = await supabase
          .storage
          .from("message_uploads")
          .upload(path, attachedImage, {
            contentType: attachedImage.type,
            upsert: false,
          });

        if (uploadError) {
          console.error("Image upload failed:", uploadError);
          setAttachmentError(uploadError.message || "Image upload failed");
        } else {
          // Store the storage path (not a public URL). We'll generate signed URLs when rendering.
          const imageMessageBody = encodeImageMessageBody(path, attachedImage.name);
          const sentImageMessage = await sendMessage(activeConversationId, imageMessageBody);
          if (sentImageMessage) {
            anySent = true;
            clearAttachment();
            setMessages((prev) => {
              const exists = prev.some((m) => m.id === sentImageMessage.id);
              return exists ? prev : [...prev, sentImageMessage];
            });
          } else {
            setAttachmentError("Image uploaded but failed to send message");
          }
        }
      }

      // Only now switch the parent to the real conversation id.
      // This avoids flicker mid-send (especially important when uploading attachments).
      if (createdConversationId && anySent) {
        onConversationCreated?.(createdConversationId);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      // Restore message if sending failed
      if (hasText) setNewMessage(messageBody);
    } finally {
      setSending(false);
      // Ensure the input is focused after sending finishes and the
      // disabled state (sending) is cleared. Use RAF so DOM updates settle.
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Block render only while metadata is loading, or while fetching messages for an existing conversation.
  // For new chats (temp conversation id), show the UI with an empty state.
  const showFullScreenLoading = metaLoading || (!isTempConversation && loading && messages.length === 0);
  const editMode = !!editingMessageId;

  if (showFullScreenLoading) {
    return (
      <div className="flex-1 min-h-0 bg-primary-lm flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="size-12 text-accent-lm" />
          <p className="text-md text-text-lighter-lm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className={`flex flex-col flex-1 min-h-0 bg-primary-lm overflow-hidden ${unsendOpen ? "opacity-50 pointer-events-none" : ""}`}>
      {/* Chat header */}
      <div className={`bg-primary-lm border-b border-b-stroke-grey lg:p-2 shrink-0 ${editMode ? "opacity-50 pointer-events-none" : ""}`}>
        {/* holds user details & online status */}
        <div className="flex justify-between items-center">
          {/* user details */}
          <div className="flex items-center lg:gap-2">
            <button onClick={onBack} className="cursor-pointer">
              <LucideArrowLeft className="text-accent-lm" />
            </button>
            <div className="flex items-center lg:gap-2 gap-2 text-left">
              <div className="relative lg:size-10 size-10 shrink-0 rounded-full ring ring-stroke-grey overflow-visible">
                <div className="w-full h-full rounded-full overflow-hidden">
                  <img
                    src={userAvatar}
                    className="rounded-full object-cover w-full h-full"
                    alt={userName}
                  />
                </div>
                {onlineStatus && (
                  <span className="absolute bottom-0 right-0 size-3 rounded-full bg-online-indicator ring-2 ring-primary-lm" />
                )}
              </div>

              <div className="flex flex-col">
                <p className="m-0 p-0 text-accent-lm font-semibold">{userName}</p>
                {userBatch && (
                  <p className="m-0 p-0 text-text-lm font-semibold text-sm">{userBatch}</p>
                )}
              </div>
            </div>
          </div>

          {/* Options menu */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="p-2 rounded-md hover:bg-hover-lm transition duration-150"
              aria-label="Chat options"
            >
              <LucideEllipsis className="size-5 text-accent-lm" />
            </button>

            {menuOpen ? (
              <div className="absolute right-0 mt-2 bg-primary-lm border border-stroke-grey rounded-md overflow-hidden min-w-44 z-50">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    void handleViewProfile();
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-text-lm hover:bg-hover-lm transition duration-150 text-left"
                >
                  <LucideUserRound className="h-4 w-4" />
                  Visit Profile
                </button>
                <button
                  type="button"
                  disabled={isTempConversation}
                  onClick={() => {
                    setMenuOpen(false);
                    setDeleteOpen(true);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-danger-lm hover:bg-hover-lm transition duration-150 text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <LucideTrash2 className="h-4 w-4 text-danger-lm" />
                  Delete Chat
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Chat body */}
      <div
        ref={chatBodyRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          if (el.scrollTop <= 0) {
            void loadOlderMessages();
          }
        }}
        className={`bg-secondary-lm flex-1 min-h-0 overflow-y-auto lg:p-3 lg:space-y-2 p-3 space-y-2 ${editMode ? "opacity-50 pointer-events-none" : ""}`}
      >
        {loadingOlder && (
          <div className="text-center text-text-lighter-lm text-sm">Loading older messages...</div>
        )}
        {loading && messages.length === 0 ? (
          <div className="text-center lg:py-4 text-text-lighter-lm">
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center lg:py-4 text-text-lighter-lm">
            Start the conversation...
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                messageId={message.id}
                message={message.message_body}
                isCurrentUser={message.sender_id === currentUserId}
                userAvatar={userAvatar}
                timestamp={message.created_at}
                onOpenPreview={openPreview}
                onEdit={() => {
                  setEditingMessageId(message.id);
                  clearAttachment();
                  setNewMessage(message.message_body);
                }}
                onUnsend={() => {
                  setUnsendMessageId(message.id);
                  setUnsendOpen(true);
                }}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Send message */}
      <div className="bg-primary-lm border-t border-t-stroke-grey lg:rounded-lg flex flex-col gap-2 lg:px-2 lg:py-2 shrink-0">
        {editingMessageId ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-2 py-1">
              <p className="m-0 text-text-lm">Editing message</p>
              <button
                type="button"
                onClick={cancelEditing}
                className="hover:bg-stroke-grey/80 bg-background-lm p-1 rounded-full transition cursor-pointer disabled:opacity-50"
                aria-label="Cancel editing"
              >
                <LucideX className="text-text-lm size-4" />
              </button>
            </div>
          </div>
        ) : null}

        {attachedImage && attachedImagePreviewUrl && (
          <div className="flex items-center justify-between gap-2 bg-secondary-lm border border-stroke-grey rounded-md px-2 py-1">
            <div className="flex items-center gap-2 min-w-0">
              <div className="size-9 rounded overflow-hidden ring ring-stroke-grey shrink-0">
                <img
                  src={attachedImagePreviewUrl}
                  alt={attachedImage.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="m-0 text-sm text-text-lm truncate">{attachedImage.name}</p>
            </div>
            <button
              type="button"
              onClick={clearAttachment}
              disabled={sending}
              className="hover:bg-hover-lm p-1 rounded disabled:opacity-50"
              aria-label="Remove attachment"
            >
              <LucideX className="text-accent-lm size-4" />
            </button>
          </div>
        )}

        {attachmentError && (
          <p className="m-0 text-xs text-text-lighter-lm">
            Attachment error: {attachmentError}
          </p>
        )}

        <div className="flex lg:gap-2 items-center">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelected}
          />

        <button
          type="button"
          onClick={handlePickImage}
          disabled={sending}
          className="hover:bg-hover-lm lg:p-1 p-1 lg:rounded-md cursor-pointer disabled:opacity-50"
        >
          <LucidePaperclip className="text-accent-lm lg:size-6" />
        </button>
        <form onSubmit={handleSendMessage} className="flex lg:gap-2 flex-1 items-center">
          <input
            ref={inputRef}
            type="text"
            placeholder="Type here..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={sending || editMode}
            className="bg-secondary-lm border border-stroke-grey lg:rounded-md text-text-lm lg:px-2 lg:py-2 placeholder:text-text-lighter-lm/60 flex-1 focus:outline-none focus:border-accent-lm disabled:opacity-50 text-sm"
          />
          <button
            type="submit"
            disabled={editingMessageId ? !newMessage.trim() || sending : ((!newMessage.trim() && !attachedImage) || sending)}
            className="hover:bg-hover-lm lg:p-1 lg:rounded-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LucideSendHorizontal className="text-accent-lm lg:size-6" />
          </button>
        </form>
        </div>
      </div>
    </div>
    <DeleteConfirmModal
      open={deleteOpen}
      onClose={() => setDeleteOpen(false)}
      title="Delete Chat"
      onConfirm={async () => {
        if (isTempConversation) {
          setDeleteOpen(false);
          return;
        }

        await deleteConversation(conversationId);
        onConversationDeleted?.(conversationId);
        setDeleteOpen(false);
        onBack();
      }}
    />

    <DeleteConfirmModal
      open={unsendOpen}
      onClose={() => {
        setUnsendOpen(false);
        setUnsendMessageId(null);
      }}
      title="Unsend Message"
      onConfirm={async () => {
        const id = unsendMessageId;
        if (!id) return;

        await deleteMessage(id);
        setMessages((prev) => prev.filter((m) => m.id !== id));
        if (editingMessageId === id) setEditingMessageId(null);
        setUnsendOpen(false);
        setUnsendMessageId(null);
      }}
    />
    {previewOpen && previewSrc ? (
      <ImagePreview src={previewSrc} filename={previewName ?? undefined} onClose={closePreview} />
    ) : null}
    </>
  );
}

interface ChatMessageProps {
  messageId: string;
  message: string;
  isCurrentUser: boolean;
  userAvatar: string;
  timestamp: string;
  onOpenPreview?: (src: string, name?: string) => void;
  onEdit?: () => void;
  onUnsend?: () => void;
}

function ChatMessage({ message, isCurrentUser, userAvatar, timestamp, onOpenPreview, onEdit, onUnsend }: ChatMessageProps) {
  const IMAGE_PREFIX = "__image__:";
  const imageData = (() => {
    if (!message.startsWith(IMAGE_PREFIX)) return null;
    const rest = message.slice(IMAGE_PREFIX.length);
    const [encodedUrl, encodedName] = rest.split("::");
    const raw = encodedUrl ? decodeURIComponent(encodedUrl) : "";
    const name = encodedName ? decodeURIComponent(encodedName) : "Image";
    if (!raw) return null;
    return { raw, name };
  })();

  const [resolvedImageUrl, setResolvedImageUrl] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node | null;
      if (!target) return;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  useEffect(() => {
    let cancelled = false;

    async function resolveUrl() {
      if (!imageData) {
        setResolvedImageUrl(null);
        return;
      }

      const raw = imageData.raw;

      // Support both formats:
      // 1) New: raw is a storage path like `<conversationId>/<uuid>.png`
      // 2) Legacy: raw is a public storage URL
      const isHttp = /^https?:\/\//i.test(raw);

      const extractPathFromStorageUrl = (urlString: string) => {
        try {
          const u = new URL(urlString);
          const match = u.pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)$/);
          if (!match) return null;
          const bucket = match[1];
          const path = match[2];
          return { bucket, path };
        } catch {
          return null;
        }
      };

      let bucket = "message_uploads";
      let path = raw;

      if (isHttp) {
        const extracted = extractPathFromStorageUrl(raw);
        if (!extracted) {
          setResolvedImageUrl(raw);
          return;
        }
        bucket = extracted.bucket;
        path = extracted.path;
      }

      if (bucket !== "message_uploads") {
        setResolvedImageUrl(raw);
        return;
      }

      const { data, error } = await supabase
        .storage
        .from("message_uploads")
        .createSignedUrl(path, 60 * 60);

      if (cancelled) return;

      if (error) {
        console.error("Failed to create signed URL:", error);
        setResolvedImageUrl(isHttp ? raw : null);
        return;
      }

      setResolvedImageUrl(data?.signedUrl ?? (isHttp ? raw : null));
    }

    resolveUrl();
    return () => {
      cancelled = true;
    };
  }, [imageData]);

  return (
    <div className={`flex items-end gap-2 ${isCurrentUser ? "justify-end" : "justify-start"}`}>
      {!isCurrentUser ? (
        <div className="lg:size-8 shrink-0 rounded-full overflow-hidden ring ring-stroke-grey">
          <img src={userAvatar} className="object-cover w-full h-full" alt="User avatar" />
        </div>
      ) : null}

      {isCurrentUser ? (
        <div className="relative flex items-end gap-2" ref={menuRef} onClick={(e) => e.stopPropagation()}>
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((v) => !v);
              }}
              className="p-1.5 rounded-full hover:bg-stroke-grey transition duration-150"
              aria-label="Message options"
            >
              <LucideEllipsis className="size-4 text-text-lighter-lm" />
            </button>

            {menuOpen ? (
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 bg-primary-lm border border-stroke-grey rounded-md overflow-hidden min-w-40 z-50">
                <button
                  type="button"
                  disabled={!!imageData}
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    onEdit?.();
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-text-lm hover:bg-hover-lm transition duration-150 text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Edit Message
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    onUnsend?.();
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-danger-lm hover:bg-hover-lm transition duration-150 text-left"
                >
                  Unsend Message
                </button>
              </div>
            ) : null}
          </div>

          <div
            className={`w-fit h-fit lg:px-3 lg:py-2 lg:rounded-lg ${
              isCurrentUser ? "bg-message-user-lm text-primary-lm" : "bg-message-other-lm text-text-lm"
            }`}
          >
            {imageData ? (
              resolvedImageUrl ? (
                <button
                  type="button"
                  onClick={() => onOpenPreview?.(resolvedImageUrl, imageData.name)}
                  className="block max-w-40 max-h-40"
                  title={imageData.name}
                >
                  <img
                    src={resolvedImageUrl}
                    alt={imageData.name}
                    className="w-full h-full rounded-md object-cover"
                  />
                </button>
              ) : (
                <p className="m-0 text-sm opacity-70">Loading image...</p>
              )
            ) : (
              <p className="m-0 max-w-40 wrap-break-word text-sm">{renderMessageWithLinks(message)}</p>
            )}
            <p className={`text-xs opacity-70 lg:mt-1 ${isCurrentUser ? "text-right" : "text-left"}`}>
              {formatTimeToLocale(timestamp, [], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
      ) : (
        <div className={`max-w-40 max-h-40 w-fit h-fit lg:px-3 lg:py-2 lg:rounded-lg bg-message-other-lm text-text-lm`}>
          {imageData ? (
            resolvedImageUrl ? (
              <button
                type="button"
                onClick={() => onOpenPreview?.(resolvedImageUrl, imageData.name)}
                className="block w-full h-full"
                title={imageData.name}
              >
                <img
                  src={resolvedImageUrl}
                  alt={imageData.name}
                  className="max-w-40 max-h-40 w-full h-full rounded-md object-cover"
                />
              </button>
            ) : (
              <p className="m-0 text-sm opacity-70">Loading image...</p>
            )
          ) : (
            <p className="m-0 max-w-40 wrap-break-word text-sm">{renderMessageWithLinks(message)}</p>
          )}
          <p className="m-0 text-xs opacity-70 lg:mt-1 text-left">
            {formatTimeToLocale(timestamp, [], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      )}
    </div>
  );
}

function renderMessageWithLinks(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (!part) return null;
    if (urlRegex.test(part)) {
      const href = part.startsWith("http") ? part : `https://${part}`;
      return (
        <a
          key={i}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-lm font-semibold underline wrap-break-word"
        >
          {part}
        </a>
      );
    }

    // Preserve newlines
    if (part.includes("\n")) {
      return part.split("\n").map((line, idx) => (
        idx === 0 ? (
          line
        ) : (
          <span key={`${i}-${idx}`}>
            <br />
            {line}
          </span>
        )
      ));
    }

    return part;
  });
}