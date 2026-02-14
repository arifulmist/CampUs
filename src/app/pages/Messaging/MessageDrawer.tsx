import { useEffect, useLayoutEffect, useRef, useState } from "react";
import placeholderUserImg from "@/assets/images/placeholderUser.png";
import { Spinner } from "@/components/ui/spinner";
import { LucideArrowLeft, LucidePlus } from "lucide-react";
import type { chatUser } from "./components/ChatHistory";
import { ChatHistory } from "./components/ChatHistory";
import { NewMessage, type NewMessageUser } from "./components/NewMessage";
import messageEmptyState from "@/assets/images/noMessage.svg";
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
  onlineStatus?: boolean;
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
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(() => new Set());
  const [directChatMode, setDirectChatMode] = useState(false); // Track if opening direct chat
  const [directInitLoading, setDirectInitLoading] = useState(false);
  const [drawerView, setDrawerView] = useState<"list" | "newMessage">("list");
  const [directTargetUser, setDirectTargetUser] = useState<NewMessageUser | null>(null);
  const [conversationSearch, setConversationSearch] = useState("");
  const [directUser, setDirectUser] = useState<{
    name: string;
    avatar: string;
    batch: string;
  } | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const presenceIntervalRef = useRef<number | null>(null);
  const refreshTimeoutRef = useRef<number | null>(null);

  const activeTargetUserId = initialUserId || directTargetUser?.auth_uid || null;
  const activeTargetUserName = initialUserName || directTargetUser?.name || undefined;

  // Get current user ID
  useEffect(() => {
    async function getCurrentUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    }
    getCurrentUser();
  }, []);

  // Track online presence (Supabase Presence)
  useEffect(() => {
    if (!open) return;
    if (!currentUserId) return;

    // Clean up any previous channel/interval
    if (presenceIntervalRef.current) {
      window.clearInterval(presenceIntervalRef.current);
      presenceIntervalRef.current = null;
    }
    if (presenceChannelRef.current) {
      supabase.removeChannel(presenceChannelRef.current);
      presenceChannelRef.current = null;
    }

    const channel = supabase.channel("online-users", {
      config: {
        presence: { key: currentUserId },
      },
    });
    presenceChannelRef.current = channel;

    channel.on("presence", { event: "sync" }, () => {
      type PresencePayload = { auth_uid?: string } & Record<string, unknown>;
      const state = channel.presenceState() as Record<string, PresencePayload[]>;
      const online = new Set<string>();

      // Keys in presenceState are presence keys; we use auth uid.
      Object.keys(state).forEach((key) => online.add(key));

      // Also accept auth_uid in payload for robustness.
      Object.values(state).forEach((presences) => {
        presences.forEach((presence) => {
          if (typeof presence.auth_uid === "string") online.add(presence.auth_uid);
        });
      });

      setOnlineUserIds(online);
    });

    channel.subscribe(async (status) => {
      if (status !== "SUBSCRIBED") return;
      await channel.track({ auth_uid: currentUserId, online_at: new Date().toISOString() });
      presenceIntervalRef.current = window.setInterval(async () => {
        await channel.track({ auth_uid: currentUserId, online_at: new Date().toISOString() });
      }, 30_000);
    });

    return () => {
      if (presenceIntervalRef.current) {
        window.clearInterval(presenceIntervalRef.current);
        presenceIntervalRef.current = null;
      }
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current);
        presenceChannelRef.current = null;
      }
      setOnlineUserIds(new Set());
    };
  }, [open, currentUserId]);

  // Clear any previous chat header/data BEFORE paint when switching to a new profile target.
  useLayoutEffect(() => {
    if (!open) return;
    if (!activeTargetUserId) return;
    if (!currentUserId) return;
    if (activeTargetUserId === currentUserId) return;

    setDirectInitLoading(true);
    setDirectChatMode(true);
    setSelectedConversation(null);
    setDirectUser(null);
  }, [open, activeTargetUserId, currentUserId]);

  // Handle initial user conversation opening (async fetch)
  useEffect(() => {
    let cancelled = false;

    async function openInitialConversation() {
      if (!open || !activeTargetUserId || !currentUserId || activeTargetUserId === currentUserId) return;

      // Load direct user's meta (avatar + batch) for the header
      try {
        const [infoRes, profileRes] = await Promise.all([
          supabase
            .from("user_info")
            .select("name,batch,department,departments_lookup(department_name)")
            .eq("auth_uid", activeTargetUserId)
            .maybeSingle(),
          supabase
            .from("user_profile")
            .select("profile_picture_url")
            .eq("auth_uid", activeTargetUserId)
            .maybeSingle(),
        ]);

        if (cancelled) return;

        const displayName = infoRes.data?.name?.trim() || activeTargetUserName || "User";
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
          name: activeTargetUserName || "User",
          avatar: placeholderUserImg,
          batch: "",
        });
      }

      try {
        // Only open an existing conversation; do not create one until first message is sent
        const conversationId = await getExistingConversationId(activeTargetUserId);
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
  }, [open, activeTargetUserId, activeTargetUserName, currentUserId]);

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

    if (open && !activeTargetUserId) { // Only load when not opening direct chat
      loadConversations();
    }
  }, [open, activeTargetUserId, directChatMode]);

  // Subscribe to real-time conversation updates
  useEffect(() => {
    if (!open) return;
    if (!currentUserId) return;

    async function refreshConversations() {
      const convs = await getConversations();
      setConversations(convs);
    }

    function queueRefresh() {
      if (refreshTimeoutRef.current) return;
      refreshTimeoutRef.current = window.setTimeout(async () => {
        refreshTimeoutRef.current = null;
        await refreshConversations();
      }, 150);
    }

    const unsubscribe = subscribeToConversations(queueRefresh);

    return () => {
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
      unsubscribe();
    };
  }, [open, currentUserId]);

  // Fallback: while the drawer is open and we're on the conversation list, periodically refresh.
  // This keeps the list responsive even if realtime events are delayed/missed.
  useEffect(() => {
    if (!open) return;
    if (!currentUserId) return;
    if (selectedConversation) return;

    const intervalId = window.setInterval(async () => {
      const convs = await getConversations();
      setConversations(convs);
    }, 3000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [open, currentUserId, selectedConversation]);

  // Handle click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Element | null;
      // Dialogs render in a portal outside the drawer. Don't treat dialog interactions as "outside" clicks.
      if (target?.closest?.('[data-slot="dialog-content"], [data-slot="dialog-overlay"], [data-slot="dialog-portal"]')) {
        return;
      }

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
    let timeoutId: number | undefined;
    if (!open) {
      timeoutId = setTimeout(() => {
        setSelectedConversation(null);
        setDirectChatMode(false); // Reset direct chat mode
        setDirectInitLoading(false);
        setDirectUser(null);
        setDirectTargetUser(null);
        setDrawerView("list");
        setConversationSearch("");
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
    setDirectTargetUser(null);
    setDrawerView("list");
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

  const getPreviewText = (raw: string) => {
    const IMAGE_PREFIX = "__image__:";
    if (raw.startsWith(IMAGE_PREFIX)) return "Image";
    return truncateMessage(raw);
  };

  const normalizedConversationSearch = conversationSearch.trim().toLowerCase();
  const filteredConversations = !normalizedConversationSearch
    ? conversations
    : conversations.filter((conv) => {
        const name = (conv.other_user.name || "").toLowerCase();
        return name.includes(normalizedConversationSearch);
      });

  if (!open) return null;

  const isChatView = !!(selectedConversation || (directChatMode && activeTargetUserId));
  const isListView = !isChatView && drawerView === "list";

  return (
    <div
      ref={drawerRef}
      className="lg:h-screen bg-primary-lm lg:w-[25vw] lg:px-4 lg:py-5 fixed top-30 right-0 bottom-0 border border-stroke-grey lg:rounded-md lg:rounded-b-none z-50"
    >
      {drawerView === "newMessage" && !isChatView ? (
        <div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDrawerView("list")}
              className="cursor-pointer"
            >
              <LucideArrowLeft className="text-accent-lm" />
            </button>
            <h5 className="text-accent-lm font-header font-semibold m-0">New Message</h5>
          </div>
          <hr className="border-accent-lm lg:mt-3 lg:mb-1" />
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between">
            <h5 className="text-accent-lm font-header font-semibold m-0">Messages</h5>
            {isListView && (
              <button
                type="button"
                onClick={() => setDrawerView("newMessage")}
                className="cursor-pointer"
                aria-label="New message"
              >
                <LucidePlus className="text-accent-lm hover:text-hover-btn-lm transition duration-150" />
              </button>
            )}
          </div>
          <hr className="border-accent-lm lg:mt-3 lg:mb-1" />
        </div>
      )}

      {/* Content Area - either Chat History or Conversation List */}
      <div className="lg:overflow-y-auto lg:max-h-[calc(100%-80px)]">
        {isChatView ? (
          // Show ChatHistory embedded in the drawer
          (() => {
            const conversation = conversations.find(c => c.id === selectedConversation);
            const userName = directChatMode
              ? (directUser?.name || activeTargetUserName || "User")
              : (conversation?.other_user.name || "User");
            const userAvatar = directChatMode
              ? (directUser?.avatar || placeholderUserImg)
              : (conversation?.other_user.profile_picture_url || placeholderUserImg);
            const userBatch = directChatMode
              ? (directUser?.batch || "")
              : (conversation?.other_user.batch || "");
            const metaLoading = directChatMode ? directInitLoading : false;
            const otherId = directChatMode ? activeTargetUserId : conversation?.other_user.auth_uid;
            const onlineStatus = otherId ? onlineUserIds.has(otherId) : undefined;
            
            return (
                <ChatHistory
                  conversationId={selectedConversation || `temp-${activeTargetUserId}`}
                  userName={userName}
                  userAvatar={userAvatar}
                  userBatch={userBatch}
                  onlineStatus={onlineStatus}
                  metaLoading={metaLoading}
                  otherUserId={directChatMode ? activeTargetUserId : undefined}
                  onConversationCreated={async (newConversationId) => {
                    setSelectedConversation(newConversationId);
                    const convs = await getConversations();
                    setConversations(convs);
                  }}
                  onBack={handleBackToList}
                />
            );
          })()
        ) : drawerView === "newMessage" ? (
          currentUserId ? (
            <NewMessage
              currentUserId={currentUserId}
              onSelectUser={async (user) => {
                setDrawerView("list");
                setDirectTargetUser(user);
                setDirectChatMode(true);
                setDirectInitLoading(true);
                setSelectedConversation(null);
                setDirectUser(null);

                const conversationId = await getExistingConversationId(user.auth_uid);
                if (conversationId) setSelectedConversation(conversationId);

                const convs = await getConversations();
                setConversations(convs);
                setDirectInitLoading(false);
              }}
            />
          ) : (
            <div className="flex items-center justify-center min-h-[50vh]">
              <div className="flex flex-col items-center gap-3">
                <Spinner className="size-12 text-accent-lm" />
                <p className="text-md text-text-lighter-lm">Loading...</p>
              </div>
            </div>
          )
        ) : (
          // Show conversation list
          <>
            <div className="lg:py-2 lg:mt-2">
              <input
                type="text"
                value={conversationSearch}
                onChange={(e) => setConversationSearch(e.target.value)}
                placeholder="Search conversations..."
                disabled={loading}
                className="bg-secondary-lm border border-stroke-grey lg:rounded-md rounded-md text-text-lm lg:px-2 lg:py-2 px-2 py-2 placeholder:text-text-lighter-lm/60 w-full focus:outline-none focus:border-accent-lm disabled:opacity-50 text-sm"
              />
            </div>

            {loading ? (
              <div className="flex items-center justify-center min-h-[50vh]">
                <div className="flex flex-col items-center gap-3">
                  <Spinner className="size-12 text-accent-lm" />
                  <p className="text-md text-text-lighter-lm">Loading...</p>
                </div>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center lg:mt-10">
                <img src={messageEmptyState} className="lg:size-30"/>
                <p className="lg:m-0 lg:p-0 text-center text-text-lighter-lm">
                No conversations.
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <div key={conv.id}>
                  <MessageChannel
                    userName={conv.other_user.name}
                    userAvatar={
                      conv.other_user.profile_picture_url || placeholderUserImg
                    }
                    onlineStatus={onlineUserIds.has(conv.other_user.auth_uid)}
                    messagePreview={
                      conv.last_message
                        ? getPreviewText(conv.last_message.message_body)
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
  onlineStatus,
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
        <div className="relative size-10 shrink-0 rounded-full ring ring-stroke-grey overflow-visible">
          <div className="w-full h-full rounded-full overflow-hidden">
            <img src={userAvatar} className="w-full h-full object-cover" alt="" />
          </div>
          {onlineStatus && (
            <span className="absolute bottom-0 right-0 size-3 rounded-full bg-online-indicator ring-2 ring-primary-lm" />
          )}
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