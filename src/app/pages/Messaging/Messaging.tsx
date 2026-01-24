"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { cn } from "@/mockData/utils";
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
    <div className="lg:grid lg:grid-cols-1 md:grid-cols-[240px_520px] lg:gap-4 lg:p-4 lg:min-h-[70vh] md:max-w-200 md:ml-auto">
      {/* Sidebar */}
      <aside className="lg:rounded-xl lg:border border-stroke-grey bg-secondary-lm lg:overflow-hidden">
        <div className="lg:p-3 border-b border-stroke-grey lg:font-semibold text-accent-lm">
          Messages
        </div>
        <div className="lg:flex lg:flex-col">
          {threads.length === 0 ? (
            <div className="lg:p-3 text-sm text-text-lighter-lm">
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
                <span className="lg:font-medium text-text-lm lg:truncate">
                  {t.userName}
                </span>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Right column placeholder */}
      <section className="lg:rounded-xl lg:border border-stroke-grey bg-primary-lm lg:flex lg:flex-col">
        <div className="lg:flex-1 lg:p-6 text-sm text-text-lighter-lm">
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
