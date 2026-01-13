"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  subscribe as chatSubscribe,
  getThreads,
  getActiveUserId,
  openChatWith,
  type ChatThread,
} from "@/app/pages/Messaging/backend/chatStore";
import MessageDrawer from "@/app/pages/Messaging/components/MessageDrawer";

export function Messaging() {
  const [threads, setThreads] = useState<ChatThread[]>(() => getThreads());
  const [activeUserId, setActiveUserId] = useState<string | null>(() =>
    getActiveUserId()
  );
  const [isMsgOpen, setIsMsgOpen] = useState(false);
  const [msgTarget, setMsgTarget] = useState<{
    id: string | null;
    name?: string;
  } | null>(null);
  const [params] = useSearchParams();

  useEffect(() => {
    const unsub = chatSubscribe(({ threads, activeUserId }) => {
      setThreads(threads);
      setActiveUserId(activeUserId);
    });
    return unsub;
  }, []);

  // Deep link: /messages?user=<id>
  useEffect(() => {
    const user = params.get("user");
    if (user) {
      setMsgTarget({ id: user });
      setIsMsgOpen(true);
    }
  }, [params]);

  const activeThread = useMemo(
    () => threads.find((t) => t.userId === activeUserId) ?? null,
    [threads, activeUserId]
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-[240px_520px] gap-4 p-4 min-h-[70vh] md:max-w-200 md:ml-auto">
      {/* Sidebar */}
      <aside className="rounded-xl border border-stroke-grey bg-secondary-lm overflow-hidden">
        <div className="p-3 border-b border-stroke-grey font-semibold text-accent-lm">
          Messages
        </div>
        <div className="flex flex-col">
          {threads.length === 0 ? (
            <div className="p-3 text-sm text-text-lighter-lm">
              No chats yet.
            </div>
          ) : (
            threads.map((t) => (
              <button
                key={t.userId}
                onClick={() => {
                  setMsgTarget({ id: t.userId, name: t.userName });
                  setIsMsgOpen(true);
                }}
                className={cn(
                  "flex items-center justify-between px-3 py-2 text-left rounded-md border border-stroke-grey transition",
                  "hover:border-stroke-peach hover:bg-secondary-lm",
                  activeUserId === t.userId ? "bg-stroke-peach/20" : ""
                )}
              >
                <span className="font-medium text-text-lm truncate">
                  {t.userName}
                </span>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Right column placeholder */}
      <section className="rounded-xl border border-stroke-grey bg-primary-lm flex flex-col">
        <div className="flex-1 p-6 text-sm text-text-lighter-lm">
          Select a conversation to open the drawer.
        </div>
      </section>

      {isMsgOpen && (
        <MessageDrawer
          open={isMsgOpen}
          onOpenChange={setIsMsgOpen}
          userId={msgTarget?.id || undefined}
          userName={msgTarget?.name || ""}
          avatarSrc={undefined}
        />
      )}
    </div>
  );
}
