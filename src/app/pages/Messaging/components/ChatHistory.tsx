import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { LucideArrowLeft, LucidePaperclip, LucideSendHorizontal } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import {
  getMessages,
  getOrCreateConversation,
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const didInitialScrollRef = useRef(false);
  const scrollRafRef = useRef<number | null>(null);

  const isTempConversation =
    !conversationId ||
    conversationId === "loading" ||
    conversationId.startsWith("temp-");

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
    });
  }, [conversationId]);

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
    
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const messageBody = newMessage.trim();
    setNewMessage(""); // Clear input immediately for better UX

    try {
      let activeConversationId = conversationId;
      let createdConversationId: string | null = null;

      // If this is a brand-new chat, create the conversation only when sending the first message
      if (!activeConversationId || activeConversationId === "loading" || activeConversationId.startsWith("temp-")) {
        if (!otherUserId) {
          setNewMessage(messageBody);
          return;
        }
        const createdId = await getOrCreateConversation(otherUserId);
        if (!createdId) {
          setNewMessage(messageBody);
          return;
        }
        createdConversationId = createdId;
        activeConversationId = createdId;
      }

      const sentMessage = await sendMessage(activeConversationId, messageBody);
      if (sentMessage) {
        // Optimistically add the message so we don't flash a full-screen loader
        // while the new conversation id propagates to the parent.
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === sentMessage.id);
          return exists ? prev : [...prev, sentMessage];
        });

        // Only now switch the parent to the real conversation id.
        // This avoids a brief "Loading..." flash between creating the conversation row
        // and inserting the first message.
        if (createdConversationId) {
          onConversationCreated?.(createdConversationId);
        }

        // Message will be added via real-time subscription
        // Focus back to input
        inputRef.current?.focus();
      } else {
        // Restore message if sending failed
        setNewMessage(messageBody);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      // Restore message if sending failed
      setNewMessage(messageBody);
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
      <div className="lg:h-[70vh] bg-primary-lm flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="size-12 text-accent-lm" />
          <p className="text-md text-text-lighter-lm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="lg:h-[70vh] flex flex-col bg-primary-lm">
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
                className={`lg:size-4 rounded-full ${
                  onlineStatus ? "bg-online-indicator" : "bg-stroke-grey"
                }`}
              ></span>
              <p className="m-0 p-0 text-sm">
                {onlineStatus ? (
                  <span className="text-online-indicator">Online</span>
                ) : (
                  <span className="text-stroke-grey">Offline</span>
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
      <div className="bg-primary-lm border-t border-t-stroke-grey flex lg:gap-2 items-center lg:px-2 lg:py-2 shrink-0">
        <button type="button" className="hover:bg-hover-lm lg:p-1 lg:rounded">
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
            disabled={!newMessage.trim() || sending}
            className="hover:bg-hover-lm lg:p-1 lg:rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LucideSendHorizontal className="text-accent-lm lg:size-6" />
          </button>
        </form>
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
  return (
    <div className={`flex lg:gap-2 items-end ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isCurrentUser && (
        <div className="lg:size-8 shrink-0">
          <img
            src={userAvatar}
            className="rounded-full ring ring-stroke-grey object-cover w-full h-full"
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
        <p className="m-0 wrap-break-word text-sm">{message}</p>
        <p className="m-0 text-xs opacity-70 lg:mt-1 text-right">
          {new Date(timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}