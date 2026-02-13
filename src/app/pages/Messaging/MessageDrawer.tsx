import { useEffect, useLayoutEffect, useRef, useState } from "react";
import placeholderUserImg from "@/assets/images/placeholderUser.png";
import { Spinner } from "@/components/ui/spinner";
import type { chatUser } from "./components/ChatHistory";
import { ChatHistory } from "./components/ChatHistory";
import {
  getConversations,
  subscribeToConversations,
  markMessagesAsRead,
  getExistingConversationId,
  type Conversation,
} from "./utils/messagingUtils";
import { supabase } from "../../../../supabase/supabaseClient";

interface MessageDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messageButtonRef?: React.RefObject<HTMLButtonElement>;
  initialUserId?: string | null;
  initialUserName?: string;
}

interface ListMessages extends chatUser {
  messagePreview: string;
  isUnread: boolean;
}

export function MessageDrawer({ 
  open, 
  onOpenChange, 
  messageButtonRef, 
  initialUserId, 
  initialUserName
}: MessageDrawerProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false); // Start with false
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [directChatMode, setDirectChatMode] = useState(false); // Track if opening direct chat
  const [directInitLoading, setDirectInitLoading] = useState(false);
  const [directUser, setDirectUser] = useState<{
    name: string;
    avatar: string;
    batch: string;
  } | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Get current user ID
  useEffect(() => {
    async function getCurrentUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    }
    getCurrentUser();
  }, []);

  // Clear any previous chat header/data BEFORE paint when switching to a new profile target.
  useLayoutEffect(() => {
    if (!open) return;
    if (!initialUserId) return;
    if (!currentUserId) return;
    if (initialUserId === currentUserId) return;

    setDirectInitLoading(true);
    setDirectChatMode(true);
    setSelectedConversation(null);
    setDirectUser(null);
  }, [open, initialUserId, currentUserId]);

  // Handle initial user conversation opening (async fetch)
  useEffect(() => {
    let cancelled = false;

    async function openInitialConversation() {
      if (!open || !initialUserId || !currentUserId || initialUserId === currentUserId) return;

      // Load direct user's meta (avatar + batch) for the header
      try {
        const [infoRes, profileRes] = await Promise.all([
          supabase
            .from("user_info")
            .select("name,batch,department,departments_lookup(department_name)")
            .eq("auth_uid", initialUserId)
            .maybeSingle(),
          supabase
            .from("user_profile")
            .select("profile_picture_url")
            .eq("auth_uid", initialUserId)
            .maybeSingle(),
        ]);

        if (cancelled) return;

        const displayName = infoRes.data?.name?.trim() || initialUserName || "User";
        const deptName = infoRes.data?.departments_lookup?.department_name || infoRes.data?.department || "";
        const batchValue = infoRes.data?.batch ?? null;
        const displayBatch = deptName && batchValue ? `${deptName}-${batchValue}` : "";

        setDirectUser({
          name: displayName,
          avatar: profileRes.data?.profile_picture_url || placeholderUserImg,
          batch: displayBatch,
        });
      } catch {
        if (cancelled) return;
        setDirectUser({
          name: initialUserName || "User",
          avatar: placeholderUserImg,
          batch: "",
        });
      }

      try {
        // Only open an existing conversation; do not create one until first message is sent
        const conversationId = await getExistingConversationId(initialUserId);
        if (!cancelled && conversationId) setSelectedConversation(conversationId);

        // Load conversations for navigation
        const convs = await getConversations();
        if (!cancelled) setConversations(convs);
      } catch (error) {
        console.error('Error in openInitialConversation:', error);
        if (!cancelled) {
          // If error occurred, fall back to conversation list
          setDirectChatMode(false);
        }
      } finally {
        if (!cancelled) setDirectInitLoading(false);
      }
    }

    openInitialConversation();

    return () => {
      cancelled = true;
    };
  }, [open, initialUserId, initialUserName, currentUserId]);

  // Fetch conversations on mount (only if not direct chat mode)
  useEffect(() => {
    async function loadConversations() {
      if (!directChatMode) {
        setLoading(true);
      }
      const convs = await getConversations();
      setConversations(convs);
      if (!directChatMode) {
        setLoading(false);
      }
    }

    if (open && !initialUserId) { // Only load when not opening direct chat
      loadConversations();
    }
  }, [open, initialUserId, directChatMode]);

  // Subscribe to real-time conversation updates
  useEffect(() => {
    if (!open) return;

    return subscribeToConversations(async () => {
      const convs = await getConversations();
      setConversations(convs);
    });
  }, [open]);

  // Handle click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        drawerRef.current &&
        !drawerRef.current.contains(event.target as Node) &&
        !(messageButtonRef?.current?.contains(event.target as Node))
      ) {
        onOpenChange(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open, onOpenChange, messageButtonRef]);

  // Reset selected conversation when drawer closes
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (!open) {
      timeoutId = setTimeout(() => {
        setSelectedConversation(null);
        setDirectChatMode(false); // Reset direct chat mode
        setDirectInitLoading(false);
        setDirectUser(null);
        // Clear the message target in TopNav when drawer closes normally
        const event = new CustomEvent('campus:clearMessage');
        window.dispatchEvent(event);
      }, 0);
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [open]);

  const handleConversationClick = async (conversationId: string) => {
    setDirectChatMode(false);
    setDirectUser(null);
    setSelectedConversation(conversationId);
    // Mark messages as read when conversation is selected
    await markMessagesAsRead(conversationId);
    // Refresh conversations to update unread count
    const convs = await getConversations();
    setConversations(convs);
  };

  const handleBackToList = async () => {
    setSelectedConversation(null);
    setDirectChatMode(false); // Reset direct chat mode when going back
    setDirectUser(null);
    setLoading(true);
    try {
      // Refresh conversations when returning to list
      const convs = await getConversations();
      setConversations(convs);
    } finally {
      setLoading(false);
    }
  };

  const truncateMessage = (message: string, maxLength: number = 35): string => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + "...";
  };

  if (!open) return null;

  return (
    <div
      ref={drawerRef}
      className="lg:h-screen bg-primary-lm lg:w-[25vw] lg:px-4 lg:py-5 fixed top-30 right-0 bottom-0 border border-stroke-grey lg:rounded-md lg:rounded-b-none z-50"
    >
      <div>
        <h5 className="text-accent-lm font-header font-semibold">Messages</h5>
        <hr className="border-accent-lm lg:mt-3 lg:mb-1" />
      </div>

      {/* Content Area - either Chat History or Conversation List */}
      <div className="lg:overflow-y-auto lg:max-h-[calc(100%-80px)]">
        {selectedConversation || (directChatMode && initialUserId) ? (
          // Show ChatHistory embedded in the drawer
          (() => {
            const conversation = conversations.find(c => c.id === selectedConversation);
            const userName = directChatMode
              ? (directUser?.name || initialUserName || "User")
              : (conversation?.other_user.name || "User");
            const userAvatar = directChatMode
              ? (directUser?.avatar || placeholderUserImg)
              : (conversation?.other_user.profile_picture_url || placeholderUserImg);
            const userBatch = directChatMode
              ? (directUser?.batch || "")
              : (conversation?.other_user.batch || "");
            const metaLoading = directChatMode ? directInitLoading : false;
            
            return (
                <ChatHistory
                  conversationId={selectedConversation || `temp-${initialUserId}`}
                  userName={userName}
                  userAvatar={userAvatar}
                  userBatch={userBatch}
                  metaLoading={metaLoading}
                  otherUserId={directChatMode ? initialUserId : undefined}
                  onConversationCreated={async (newConversationId) => {
                    setSelectedConversation(newConversationId);
                    const convs = await getConversations();
                    setConversations(convs);
                  }}
                  onBack={handleBackToList}
                />
            );
          })()
        ) : (
          // Show conversation list
          <>
            {loading ? (
              <div className="flex items-center justify-center min-h-[50vh]">
                <div className="flex flex-col items-center gap-3">
                  <Spinner className="size-12 text-accent-lm" />
                  <p className="text-md text-text-lighter-lm">Loading...</p>
                </div>
              </div>
            ) : conversations.length === 0 ? (
              <p className="lg:p-4 text-center text-text-lighter-lm">
                No conversations.
              </p>
            ) : (
              conversations.map((conv) => (
                <div key={conv.id}>
                  <MessageChannel
                    userName={conv.other_user.name}
                    userAvatar={
                      conv.other_user.profile_picture_url || placeholderUserImg
                    }
                    messagePreview={
                      conv.last_message
                        ? truncateMessage(conv.last_message.message_body)
                        : "Start a conversation"
                    }
                    isUnread={conv.unread_count > 0}
                    onClick={() => handleConversationClick(conv.id)}
                  />
                  <hr className="border-stroke-grey lg:my-1" />
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}

function MessageChannel({
  userName,
  userAvatar,
  messagePreview,
  isUnread,
  onClick,
}: ListMessages & { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center w-full justify-between lg:px-2 lg:py-4 lg:rounded-lg hover:bg-hover-lm transition duration-150 text-left"
    >
      <div className="flex items-center gap-4">
        <div className="size-10 shrink-0 rounded-full ring ring-stroke-grey overflow-hidden">
          <img src={userAvatar} className="w-full h-full object-cover" alt="" />
        </div>

        <div className="flex flex-col">
          <p
            className={`m-0 p-0 font-medium ${
              isUnread ? `text-accent-lm` : `text-text-lm`
            }`}
          >
            {userName}
          </p>
          <p
            className={`m-0 p-0 text-sm ${
              isUnread ? `text-text-lm text-md` : `text-text-lighter-lm/70`
            }`}
          >
            {messagePreview}
          </p>
        </div>
      </div>
      {isUnread && (
        <span className="size-2 bg-accent-lm rounded-full animate-pulse"></span>
      )}
    </button>
  );
}