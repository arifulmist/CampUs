import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { LucideArrowLeft, LucidePaperclip, LucideSendHorizontal, LucideX } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import {
  getMessages,
  getOrCreateConversation,
  markMessagesAsRead,
  sendMessage,
  subscribeToMessages,
  type Message,
} from "../utils/messagingUtils";
import { supabase } from "../../../../../supabase/supabaseClient";

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
}: ChatHistoryProps) {
  const IMAGE_PREFIX = "__image__:";

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [attachedImage, setAttachedImage] = useState<File | null>(null);
  const [attachedImagePreviewUrl, setAttachedImagePreviewUrl] = useState<string | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const didInitialScrollRef = useRef(false);
  const scrollRafRef = useRef<number | null>(null);
  const markReadInFlightRef = useRef(false);

  const isTempConversation =
    !conversationId ||
    conversationId === "loading" ||
    conversationId.startsWith("temp-");

  const clearAttachment = () => {
    setAttachedImage(null);
    setAttachmentError(null);
    if (attachedImagePreviewUrl) {
      URL.revokeObjectURL(attachedImagePreviewUrl);
      setAttachedImagePreviewUrl(null);
    }
  };

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
    // If we just switched from a temp id to a real conversation id,
    // force loading before paint and clear old messages to avoid flicker/stale UI.
    if (!conversationId) return;
    if (conversationId === "loading" || conversationId.startsWith("temp-")) return;
    setMessages([]);
    setLoading(true);
    didInitialScrollRef.current = false;
  }, [conversationId]);

  useEffect(() => {
    async function loadMessages() {
      if (!conversationId) {
        setMessages([]);
        setLoading(false);
        return;
      }

      // New chat (no conversation yet): show empty state, not a blocking loader
      if (conversationId === "loading" || conversationId.startsWith("temp-")) {
        setMessages([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const msgs = await getMessages(conversationId);
      setMessages(msgs);
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

  // Subscribe to real-time message updates
  useEffect(() => {
    if (!conversationId || conversationId === "loading" || conversationId.startsWith("temp-")) return;

    return subscribeToMessages(conversationId, (newMsg) => {
      setMessages((prev) => {
        // Check if message already exists to avoid duplicates
        const exists = prev.some((msg) => msg.id === newMsg.id);
        if (exists) return prev;
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
    if ((!hasText && !hasAttachment) || sending) return;

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

      inputRef.current?.focus();
    } catch (error) {
      console.error("Failed to send message:", error);
      // Restore message if sending failed
      if (hasText) setNewMessage(messageBody);
    } finally {
      setSending(false);
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
    <div className="flex flex-col flex-1 min-h-0 bg-primary-lm overflow-hidden">
      {/* Chat header */}
      <div className="bg-primary-lm border-b border-b-stroke-grey lg:p-2 shrink-0">
        {/* holds user details & online status */}
        <div className="flex justify-between items-center">
          {/* user details */}
          <div className="flex items-center lg:gap-2">
            <button onClick={onBack} className="cursor-pointer">
              <LucideArrowLeft className="text-accent-lm" />
            </button>
            <div className="lg:size-10">
              <img
                src={userAvatar}
                className="rounded-full object-cover ring ring-stroke-grey w-full h-full"
                alt={userName}
              />
            </div>
            <div className="flex flex-col">
              <p className="m-0 p-0 text-accent-lm font-semibold">{userName}</p>
              {userBatch && (
                <p className="m-0 p-0 text-text-lm font-semibold text-sm">{userBatch}</p>
              )}
            </div>
          </div>

          {/* Online status */}
          {onlineStatus !== undefined && (
            <div className="flex items-center lg:gap-1">
              <span
                className={`lg:size-2 rounded-full ${
                  onlineStatus ? "bg-online-indicator" : "bg-text-lighter-lm/40"
                }`}
              ></span>
              <p className="m-0 p-0 text-sm">
                {onlineStatus ? (
                  <span className="text-online-indicator">Online</span>
                ) : (
                  <span className="text-text-lighter-lm/50">Offline</span>
                )}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Chat body */}
      <div className="bg-secondary-lm flex-1 min-h-0 overflow-y-auto lg:p-3 lg:space-y-2 p-3 space-y-2">
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
                message={message.message_body}
                isCurrentUser={message.sender_id === currentUserId}
                userAvatar={userAvatar}
                timestamp={message.created_at}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Send message */}
      <div className="bg-primary-lm border-t border-t-stroke-grey flex flex-col gap-2 lg:px-2 lg:py-2 px-2 py-2 shrink-0">
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
          className="hover:bg-hover-lm lg:p-1 p-1 lg:rounded rounded disabled:opacity-50"
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
            disabled={sending}
            className="bg-secondary-lm border border-stroke-grey lg:rounded-md text-text-lm lg:px-2 lg:py-2 placeholder:text-text-lighter-lm/60 flex-1 focus:outline-none focus:border-accent-lm disabled:opacity-50 text-sm"
          />
          <button
            type="submit"
            disabled={(!newMessage.trim() && !attachedImage) || sending}
            className="hover:bg-hover-lm lg:p-1 lg:rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LucideSendHorizontal className="text-accent-lm lg:size-6" />
          </button>
        </form>
        </div>
      </div>
    </div>
  );
}

interface ChatMessageProps {
  message: string;
  isCurrentUser: boolean;
  userAvatar: string;
  timestamp: string;
}

function ChatMessage({ message, isCurrentUser, userAvatar, timestamp }: ChatMessageProps) {
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
    <div className={`flex lg:gap-2 items-end ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isCurrentUser && (
        <div className="lg:size-8 shrink-0 rounded-full overflow-hidden ring ring-stroke-grey">
          <img
            src={userAvatar}
            className="object-cover w-full h-full"
            alt="User avatar"
          />
        </div>
      )}
      <div
        className={`w-fit h-fit lg:px-3 lg:py-2 lg:rounded-lg ${
          isCurrentUser
            ? "bg-message-user-lm text-primary-lm"
            : "bg-message-other-lm text-text-lm"
        }`}
      >
        {imageData ? (
          resolvedImageUrl ? (
            <Dialog>
              <DialogTrigger asChild>
                <button type="button" className="block" title={imageData.name}>
                  <img
                    src={resolvedImageUrl}
                    alt={imageData.name}
                    className="max-w-55 max-h-55 rounded-md object-cover"
                  />
                </button>
              </DialogTrigger>
              <DialogContent
                overlayClassName="bg-[rgba(0,0,0,0.4)]"
                className="bg-primary-lm border-stroke-grey text-text-lm p-4 sm:max-w-5xl"
              >
                <img
                  src={resolvedImageUrl}
                  alt={imageData.name}
                  className="w-full h-auto max-h-[85vh] object-contain rounded-md"
                />
              </DialogContent>
            </Dialog>
          ) : (
            <p className="m-0 text-sm opacity-70">Loading image...</p>
          )
        ) : (
          <p className="m-0 wrap-break-word text-sm">{message}</p>
        )}
        <p className={`m-0 text-xs opacity-70 lg:mt-1 ${
          isCurrentUser
          ? "text-right"
          : "text-left"}`}>
          {new Date(timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}