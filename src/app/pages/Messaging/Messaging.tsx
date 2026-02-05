"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { cn } from "@/mockData/utils";
import {
  subscribe as chatSubscribe,
  getThreads,
  getActiveUserId,
  openChatWith,
  setupRealtimeSubscription,
  type ChatThread,
} from "@/app/pages/Messaging/backend/chatStore";
import MessageDrawer from "@/app/pages/Messaging/components/MessageDrawer";
import { supabase } from "../../../../supabase/supabaseClient";

export function Messaging() {
  const [threads, setThreads] = useState<ChatThread[]>(() => getThreads());
  const [activeUserId, setActiveUserId] = useState<string | null>(() =>
    getActiveUserId(),
  );
  const [isMsgOpen, setIsMsgOpen] = useState(false);
  const [msgTarget, setMsgTarget] = useState<{
    id: string | null;
    name?: string;
  } | null>(null);
  const [params] = useSearchParams();
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    const unsub = chatSubscribe(({ threads, activeUserId }) => {
      setThreads(threads);
      setActiveUserId(activeUserId);
    });
    return unsub;
  }, []);

  // Setup real-time message subscription
  useEffect(() => {
    let messageChannel: ReturnType<typeof supabase.channel> | null = null;

    async function setupMessages() {
      messageChannel = await setupRealtimeSubscription();
    }

    setupMessages();

    return () => {
      if (messageChannel) {
        supabase.removeChannel(messageChannel);
      }
    };
  }, []);

  // Track online presence using Supabase real-time
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let presenceInterval: number | null = null;

    async function setupPresence() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // Get current user's student_id
        const { data: userInfo } = await supabase
          .from("user_info")
          .select("student_id")
          .eq("auth_uid", user.id)
          .single();

        if (userInfo?.student_id) {
          // Create a presence channel
          channel = supabase.channel("online-users");

          channel
            .on("presence", { event: "sync" }, () => {
              const state = channel!.presenceState();
              const online = new Set<string>();
              Object.values(state).forEach((presences: any) => {
                presences.forEach((presence: any) => {
                  if (presence.student_id) {
                    online.add(presence.student_id);
                  }
                });
              });
              setOnlineUsers(online);
            })
            .subscribe(async (status) => {
              if (status === "SUBSCRIBED") {
                // Track presence
                await channel!.track({
                  student_id: userInfo.student_id,
                  online_at: new Date().toISOString(),
                });

                // Update presence every 30 seconds
                presenceInterval = window.setInterval(async () => {
                  await channel!.track({
                    student_id: userInfo.student_id,
                    online_at: new Date().toISOString(),
                  });
                }, 30000);
              }
            });
        }
      } catch (error) {
        console.error("Error setting up presence:", error);
      }
    }

    setupPresence();

    return () => {
      if (presenceInterval) window.clearInterval(presenceInterval);
      if (channel) {
        channel.untrack();
        supabase.removeChannel(channel);
      }
    };
  }, []);

  // Deep link: /messaging?user=<id>&name=<name>
  useEffect(() => {
    const userId = params.get("user");
    const userName = params.get("name");
    if (userId) {
      // Open chat with this user
      openChatWith(userId, userName || "User");
      setMsgTarget({ id: userId, name: userName || "User" });
      setIsMsgOpen(true);
    }
  }, [params]);

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
                  activeUserId === t.userId ? "bg-stroke-peach/20" : "",
                )}
              >
                <div className="flex items-center gap-2 flex-1">
                  <span className="lg:font-medium text-text-lm lg:truncate">
                    {t.userName}
                  </span>
                  {onlineUsers.has(t.userId) && (
                    <div className="relative flex items-center">
                      <span className="flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                    </div>
                  )}
                </div>
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
