import { useEffect, useMemo, useRef, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
// removed Input import to use native textarea
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { X } from "lucide-react";
import { cn } from "@/mockData/utils";
import {
  subscribe as chatSubscribe,
  openChatWith,
  sendMessage,
  getThreads,
  markMessagesAsRead,
  type ChatThread,
} from "@/app/pages/Messaging/backend/chatStore";
import { supabase } from "../../../../../supabase/supabaseClient";

export type MessageDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string;
  userName?: string;
  avatarSrc?: string;
};

export default function MessageDrawer({
  open,
  onOpenChange,
  userId,
  userName,
  avatarSrc,
}: MessageDrawerProps) {
  const [threads, setThreads] = useState<ChatThread[]>(() => getThreads());
  const [storeActiveUserId, setStoreActiveUserId] = useState<string | null>(
    null,
  );
  const [text, setText] = useState("");
  const [isUserOnline, setIsUserOnline] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Ensure thread and set active on open
  useEffect(() => {
    if (open && userId) {
      openChatWith(userId, userName);
      // Mark messages as read when opening the conversation
      markMessagesAsRead(userId);
    }
  }, [open, userId, userName]);

  useEffect(() => {
    const unsub = chatSubscribe(({ threads, activeUserId }) => {
      setThreads(threads);
      setStoreActiveUserId(activeUserId);
    });
    return unsub;
  }, []);

  // Track if the user we're chatting with is online
  useEffect(() => {
    if (!userId || !open) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function setupPresenceTracking() {
      try {
        channel = supabase.channel("online-users");

        channel
          .on("presence", { event: "sync" }, () => {
            const state = channel!.presenceState();
            let isOnline = false;
            Object.values(state).forEach((presences: Array<any>) => {
              presences.forEach((presence: any) => {
                if (presence.student_id === userId) {
                  isOnline = true;
                }
              });
            });
            setIsUserOnline(isOnline);
          })
          .subscribe();
      } catch (error) {
        console.error("Error tracking user presence:", error);
      }
    }

    setupPresenceTracking();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [userId, open]);

  const activeId = userId || storeActiveUserId || null;
  const activeThread = useMemo(
    () =>
      activeId ? (threads.find((t) => t.userId === activeId) ?? null) : null,
    [threads, activeId],
  );

  const adjustTextareaHeight = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const newHeight = Math.min(ta.scrollHeight, 192); // cap height
    ta.style.height = `${newHeight}px`;
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [text, activeThread]);

  const onSend = () => {
    if (!text.trim()) return;
    sendMessage(text);
    setText("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  // Combined navbar height (TopNav + BotNav) approx. 96px; adjust if needed.
  const NAVBAR_HEIGHT = 105;
  // Extra spacing below navbar so the drawer sits a bit lower
  const NAVBAR_SPACING = 15; // px

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      {/* Make DrawerContent a flex-column container and ensure it has the explicit height */}
      <DrawerContent
        className={
          "bg-primary-lm text-text-lm fixed right-0 w-95 sm:w-95 sm:max-w-95 border-l border-stroke-grey flex flex-col overflow-visible"
        }
        style={{
          top: NAVBAR_HEIGHT + NAVBAR_SPACING,
          height: `calc(100vh - ${NAVBAR_HEIGHT + NAVBAR_SPACING}px)`,
        }}
      >
        <DrawerHeader className="lg:flex-row lg:flex lg:items-center lg:justify-between lg:p-4 border-b border-stroke-grey">
          <div className="lg:flex lg:items-center lg:gap-3">
            <div className="relative">
              <Avatar className="lg:h-8 lg:w-8">
                {avatarSrc ? <AvatarImage src={avatarSrc} /> : null}
                <AvatarFallback>
                  {userName?.[0]?.toUpperCase() ?? "U"}
                </AvatarFallback>
              </Avatar>
              {isUserOnline && (
                <span className="absolute bottom-0 right-0 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500 border border-primary-lm"></span>
                </span>
              )}
            </div>
            <div className="flex flex-col">
              <DrawerTitle className="text-base lg:font-semibold">
                {activeThread ? activeThread.userName : "Messages"}
              </DrawerTitle>
              {isUserOnline && (
                <span className="text-xs text-green-500">Active now</span>
              )}
            </div>
          </div>
          <DrawerClose asChild>
            <Button variant="ghost" size="icon" className="text-text-lm">
              <X className="lg:h-5 lg:w-5" />
            </Button>
          </DrawerClose>
        </DrawerHeader>

        {/* Main column: message list (scrollable) + sticky footer */}
        <div className="flex-1 flex flex-col min-h-0">
          {!activeThread ? (
            // Threads list: scrollable
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {threads.length === 0 ? (
                <div className="text-sm text-text-lighter-lm">
                  No conversations yet
                </div>
              ) : (
                threads.map((t) => (
                  <button
                    key={t.userId}
                    onClick={() => openChatWith(t.userId, t.userName)}
                    className="w-full text-left px-3 py-2 rounded-md border border-stroke-grey hover:border-stroke-peach hover:bg-secondary-lm"
                  >
                    <div className="font-medium text-text-lm">{t.userName}</div>
                    {t.messages.length > 0 && (
                      <div className="text-xs text-text-lighter-lm mt-0.5 line-clamp-1">
                        {t.messages[t.messages.length - 1].text}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          ) : (
            <>
              {/* Message list: scrollable. Important: pb so content never hides behind the sticky footer */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2 pb-28">
                {activeThread.messages.length > 0 ? (
                  activeThread.messages.map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        // preserve newlines and wrap long words
                        "max-w-[75%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words",
                        m.from === "me"
                          ? "ml-auto bg-message-user-lm text-primary-lm"
                          : "mr-auto bg-message-other-lm text-text-lm",
                      )}
                    >
                      {m.text}
                      {m.from === "me" && m.status && (
                        <div className="mt-1 text-[10px] text-text-lighter-lm opacity-70">
                          {m.status === "seen" ? "Seen" : "Sent"}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-text-lighter-lm">
                    Start the conversation…
                  </div>
                )}
              </div>

              {/* Sticky footer: will remain visible even when the list scrolls */}
              <div className="sticky bottom-0 z-30 border-t border-stroke-grey p-3 bg-primary-lm backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <textarea
                    ref={textareaRef}
                    autoFocus
                    placeholder={`Message ${activeThread.userName}`}
                    value={text}
                    onChange={(e) => {
                      setText(e.target.value);
                      const ta = textareaRef.current;
                      if (!ta) return;
                      ta.style.height = "auto";
                      ta.style.height = `${Math.min(ta.scrollHeight, 192)}px`;
                    }}
                    onKeyDown={(e) => {
                      // Enter sends, Shift+Enter adds newline
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        onSend();
                      }
                    }}
                    rows={1}
                    className="bg-secondary-lm text-text-lm w-full min-h-[36px] max-h-48 overflow-auto resize-none rounded-md px-3 py-2"
                  />
                  <Button
                    onClick={onSend}
                    className="bg-accent-lm text-primary-lm"
                  >
                    Send
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
