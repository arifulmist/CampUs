"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  subscribe as chatSubscribe,
  openChatWith,
  sendMessage,
  getThreads,
  type ChatThread,
} from "@/app/pages/Messaging/backend/chatStore";

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
    null
  );
  const [text, setText] = useState("");

  // Ensure thread and set active on open
  useEffect(() => {
    if (open && userId) {
      openChatWith(userId, userName);
    }
  }, [open, userId, userName]);

  useEffect(() => {
    const unsub = chatSubscribe(({ threads, activeUserId }) => {
      setThreads(threads);
      setStoreActiveUserId(activeUserId);
    });
    return unsub;
  }, []);

  const activeId = userId || storeActiveUserId || null;
  const activeThread = useMemo(
    () =>
      activeId ? threads.find((t) => t.userId === activeId) ?? null : null,
    [threads, activeId]
  );

  const onSend = () => {
    if (!text.trim()) return;
    sendMessage(text);
    setText("");
  };

  // Combined navbar height (TopNav + BotNav) approx. 96px; adjust if needed.
  const NAVBAR_HEIGHT = 105;
  // Extra spacing below navbar so the drawer sits a bit lower
  const NAVBAR_SPACING = 15; // px

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent
        className={
          "bg-primary-lm text-text-lm fixed right-0 w-95 sm:w-95 sm:max-w-95 border-l border-stroke-grey"
        }
        style={{
          top: NAVBAR_HEIGHT + NAVBAR_SPACING,
          height: `calc(100vh - ${NAVBAR_HEIGHT + NAVBAR_SPACING}px)`,
        }}
      >
        <DrawerHeader className="flex-row flex items-center justify-between p-4 border-b border-stroke-grey">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              {avatarSrc ? <AvatarImage src={avatarSrc} /> : null}
              <AvatarFallback>
                {userName?.[0]?.toUpperCase() ?? "U"}
              </AvatarFallback>
            </Avatar>
            <DrawerTitle className="text-base font-semibold">
              {activeThread ? activeThread.userName : "Messages"}
            </DrawerTitle>
          </div>
          <DrawerClose asChild>
            <Button variant="ghost" size="icon" className="text-text-lm">
              <X className="h-5 w-5" />
            </Button>
          </DrawerClose>
        </DrawerHeader>

        <div className="flex flex-col h-full">
          {!activeThread ? (
            <div className="p-3 space-y-2 overflow-y-auto">
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
              <div className="flex-1 p-3 space-y-2 overflow-y-auto">
                {activeThread.messages.length > 0 ? (
                  activeThread.messages.map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        "max-w-[75%] rounded-lg px-3 py-2 text-sm",
                        m.from === "me"
                          ? "ml-auto bg-message-user-lm text-primary-lm"
                          : "mr-auto bg-message-other-lm text-text-lm"
                      )}
                    >
                      {m.text}
                      {"status" in m && m.from === "me" ? (
                        <div className="mt-1 text-[10px] text-text-lighter-lm">
                          pending
                        </div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-text-lighter-lm">
                    Start the conversation…
                  </div>
                )}
              </div>
              <div className="border-t border-stroke-grey p-3 flex items-center gap-2">
                <Input
                  autoFocus
                  placeholder={`Message ${activeThread.userName}`}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onSend();
                  }}
                  className="bg-secondary-lm text-text-lm"
                />
                <Button
                  onClick={onSend}
                  className="bg-accent-lm text-primary-lm"
                >
                  Send
                </Button>
              </div>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
