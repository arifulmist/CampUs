import { useEffect, useRef, useState } from "react";
import placeholderUserImg from "@/assets/images/placeholderUser.png";
import messageEmptyState from "@/assets/images/noMessage2.svg";
import { Spinner } from "@/components/ui/spinner";
import { LucideArrowLeft, LucidePlus } from "lucide-react";
import { ChatHistory } from "./components/ChatHistory";
import { NewMessage } from "./components/NewMessage";
import { useOnlineUsers } from "@/app/OnlineUsersContext";
import {
  getConversations,
  getExistingConversationId,
  markMessagesAsRead,
  subscribeToConversations,
  type Conversation,
} from "./utils/messagingUtils";
import { supabase } from "@/supabase/supabaseClient";

export type MessageDrawerProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  messageButtonRef?: React.RefObject<HTMLButtonElement>;
  initialUserId?: string | null;
  initialUserName?: string;
};

type DirectUserMeta = {
  name: string;
  avatar: string;
  batch: string;
};

type ListMessages = {
  userName: string;
  userAvatar: string;
  onlineStatus: boolean;
  messagePreview: string;
  isUnread: boolean;
};

export function MessageDrawer({
  open,
  onOpenChange,
  messageButtonRef,
  initialUserId,
  initialUserName,
}: MessageDrawerProps) {
  // Match NotificationsDrawer sizing/offset so the drawer height is explicit.
  const NAVBAR_HEIGHT = 105;
  const NAVBAR_SPACING = 15;

  const drawerRef = useRef<HTMLDivElement>(null);
  const refreshTimeoutRef = useRef<number | null>(null);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const [drawerView, setDrawerView] = useState<"list" | "newMessage">("list");
  const [conversationSearch, setConversationSearch] = useState("");

  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);

  const [directChatMode, setDirectChatMode] = useState(false);
  const [directInitLoading, setDirectInitLoading] = useState(false);
  const [directUser, setDirectUser] = useState<DirectUserMeta | null>(null);

  const [manualTargetUser, setManualTargetUser] = useState<{ id: string; name: string } | null>(
    null
  );

  const { onlineUserIds } = useOnlineUsers();

  const activeTargetUserId = initialUserId ?? manualTargetUser?.id ?? null;
  const activeTargetUserName = initialUserId
    ? initialUserName ?? ""
    : manualTargetUser?.name || initialUserName || "";

  // Fetch current auth user id
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      setCurrentUserId(user?.id ?? null);
    }

    loadUser();

    return () => {
      cancelled = true;
    };
  }, [open]);

  // Direct-open: open a chat with an initial user (without creating a conversation until first send)
  useEffect(() => {
    if (!open) return;
    const targetUserId = activeTargetUserId;
    if (!targetUserId) return;
    if (!currentUserId) return;

    let cancelled = false;

    async function openInitialConversation() {
      const targetId = targetUserId;
      if (!targetId) return;

      setDrawerView("list");
      setConversationSearch("");
      setDirectChatMode(true);
      setDirectInitLoading(true);
      setSelectedConversation(null);
      setDirectUser(null);

      try {
        const [infoRes, profileRes] = await Promise.all([
          supabase
            .from("user_info")
            .select("name,batch,department,departments_lookup(department_name)")
            .eq("auth_uid", targetId)
            .maybeSingle(),
          supabase
            .from("user_profile")
            .select("profile_picture_url")
            .eq("auth_uid", targetId)
            .maybeSingle(),
        ]);

        if (cancelled) return;

        const infoData = infoRes.data as
          | {
              name?: string | null;
              batch?: number | null;
              department?: string | null;
              departments_lookup?: { department_name?: string | null } | null;
            }
          | null
          | undefined;

        const displayName = infoData?.name?.trim() || activeTargetUserName || "User";
        const deptName =
          infoData?.departments_lookup?.department_name || infoData?.department || "";
        const batchValue = infoData?.batch ?? null;
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
        const conversationId = await getExistingConversationId(targetId);
        if (!cancelled && conversationId) setSelectedConversation(conversationId);

        const convs = await getConversations();
        if (!cancelled) setConversations(convs);
      } catch (error) {
        console.error("Error in openInitialConversation:", error);
        if (!cancelled) {
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

  // Fetch conversations when opened normally (not direct-open)
  useEffect(() => {
    if (!open) return;
    if (activeTargetUserId) return;

    let cancelled = false;

    async function loadConversations() {
      setLoading(true);
      try {
        const convs = await getConversations();
        if (!cancelled) setConversations(convs);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadConversations();

    return () => {
      cancelled = true;
    };
  }, [open, activeTargetUserId]);

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

  // Polling fallback while the conversation list is visible
  useEffect(() => {
    if (!open) return;
    if (!currentUserId) return;
    if (selectedConversation) return;
    if (directChatMode && activeTargetUserId) return;
    if (drawerView !== "list") return;

    const intervalId = window.setInterval(async () => {
      const convs = await getConversations();
      setConversations(convs);
    }, 3000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    open,
    currentUserId,
    selectedConversation,
    directChatMode,
    activeTargetUserId,
    drawerView,
  ]);

  // Handle click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Element | null;
      // Dialogs render in a portal outside the drawer. Don't treat dialog interactions as "outside" clicks.
      if (
        target?.closest?.(
          '[data-slot="dialog-content"], [data-slot="dialog-overlay"], [data-slot="dialog-portal"]'
        )
      ) {
        return;
      }

      // If an image preview overlay is open, ignore outside clicks so preview controls don't close the drawer.
      if ((window as any).__campusImagePreviewOpen) {
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

  // Reset state when drawer closes
  useEffect(() => {
    let timeoutId: number | undefined;
    if (!open) {
      timeoutId = window.setTimeout(() => {
        setSelectedConversation(null);
        setDirectChatMode(false);
        setDirectInitLoading(false);
        setDirectUser(null);
        setManualTargetUser(null);
        setDrawerView("list");
        setConversationSearch("");
        const event = new CustomEvent("campus:clearMessage");
        window.dispatchEvent(event);
      }, 0);
    }
    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [open]);

  const handleConversationClick = async (conversationId: string) => {
    setManualTargetUser(null);
    setDirectChatMode(false);
    setDirectUser(null);
    setSelectedConversation(conversationId);

    // Optimistically clear this conversation's unread state immediately.
    setConversations((prev) =>
      (prev ?? []).map((c) => (c.id === conversationId ? { ...c, unread_count: 0 } : c))
    );

    await markMessagesAsRead(conversationId);
    const convs = await getConversations();
    setConversations(convs);
  };

  const handleBackToList = async () => {
    setSelectedConversation(null);
    setDirectChatMode(false);
    setDirectUser(null);
    setManualTargetUser(null);
    setDrawerView("list");
    setLoading(true);
    try {
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
      className={`bg-primary-lm lg:w-[25vw] fixed right-0 border border-stroke-grey lg:rounded-md lg:rounded-b-none z-50 flex flex-col overflow-hidden ${!open ? "animate-slide-out-from-right" : "animate-slide-in-from-right"}`}
      style={{
        top: NAVBAR_HEIGHT + NAVBAR_SPACING,
        height: `calc(100vh - ${NAVBAR_HEIGHT + NAVBAR_SPACING}px)`,
      }}
    >
      {isChatView ? (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {(() => {
            const conversation = conversations.find((c) => c.id === selectedConversation);
            const userName = directChatMode
              ? directUser?.name || activeTargetUserName || "User"
              : conversation?.other_user.name || "User";
            const userAvatar = directChatMode
              ? directUser?.avatar || placeholderUserImg
              : conversation?.other_user.profile_picture_url || placeholderUserImg;
            const userBatch = directChatMode
              ? directUser?.batch || ""
              : conversation?.other_user.batch || "";
            const metaLoading = directChatMode ? directInitLoading : false;

            const otherId = directChatMode ? activeTargetUserId : conversation?.other_user.auth_uid;
            const onlineStatus = otherId ? onlineUserIds.has(otherId) : undefined;

            return (
              <ChatHistory
                conversationId={
                  selectedConversation || (activeTargetUserId ? `temp-${activeTargetUserId}` : "loading")
                }
                userName={userName}
                userAvatar={userAvatar}
                userBatch={userBatch}
                onlineStatus={onlineStatus}
                metaLoading={metaLoading}
                otherUserId={otherId ?? undefined}
                onConversationCreated={async (newConversationId) => {
                  setSelectedConversation(newConversationId);
                  const convs = await getConversations();
                  setConversations(convs);
                }}
                onConversationDeleted={(deletedConversationId) => {
                  setConversations((prev) => (prev ?? []).filter((c) => c.id !== deletedConversationId));
                  if (selectedConversation === deletedConversationId) {
                    setSelectedConversation(null);
                  }
                }}
                onBack={handleBackToList}
              />
            );
          })()}
        </div>
      ) : (
        <div className="lg:px-4 lg:py-5 flex flex-col h-full min-h-0">
          {drawerView === "newMessage" ? (
            <div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setDrawerView("list")} className="cursor-pointer">
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
                    <LucidePlus className="text-accent-lm hover:text-hover-btn-lm duration-150" />
                  </button>
                )}
              </div>
              <hr className="border-accent-lm lg:mt-3 lg:mb-1" />
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-y-auto">
            {drawerView === "newMessage" ? (
              currentUserId ? (
                <NewMessage
                  currentUserId={currentUserId}
                  onSelectUser={async (user) => {
                    setDrawerView("list");
                    setConversationSearch("");
                    setSelectedConversation(null);
                    setManualTargetUser({ id: user.auth_uid, name: user.name });
                    setDirectChatMode(true);
                    setDirectInitLoading(true);
                    setDirectUser(null);
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
              <>
                <div className="lg:py-2 py-2">
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
                    <img src={messageEmptyState} className="lg:size-30" alt="" />
                    <p className="lg:m-0 lg:p-0 text-center text-text-lighter-lm">No conversations.</p>
                  </div>
                ) : (
                  filteredConversations.map((conv, index) => (
                    <div key={conv.id}>
                      <MessageChannel
                        userName={conv.other_user.name}
                        userAvatar={conv.other_user.profile_picture_url || placeholderUserImg}
                        onlineStatus={onlineUserIds.has(conv.other_user.auth_uid)}
                        messagePreview={
                          conv.last_message
                            ? getPreviewText(conv.last_message.message_body)
                            : "Start a conversation"
                        }
                        isUnread={conv.unread_count > 0}
                        onClick={() => handleConversationClick(conv.id)}
                      />
                      {index < filteredConversations.length - 1 && (
                        <hr className="border-stroke-grey lg:my-1" />
                      )}
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        </div>
      )}
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
      className={`flex items-center w-full justify-between lg:px-2 lg:py-4 lg:rounded-lg hover:bg-hover-lm transition duration-150 text-left ${isUnread && "bg-hover-lm"}`}
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
          <p className={`m-0 p-0 font-medium ${isUnread ? "text-accent-lm" : "text-text-lm"}`}>
            {userName}
          </p>
          <p
            className={`m-0 p-0 text-sm ${
              isUnread ? "text-text-lm font-medium" : "text-text-lighter-lm/70"
            }`}
          >
            {messagePreview}
          </p>
        </div>
      </div>
      {isUnread && <span className="size-2 bg-accent-lm rounded-full animate-pulse"></span>}
    </button>
  );
}
