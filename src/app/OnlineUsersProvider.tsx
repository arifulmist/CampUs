import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../supabase/supabaseClient";
import { OnlineUsersContext } from "./OnlineUsersContext";

export function OnlineUsersProvider({ children }: { children: React.ReactNode }) {
  const [authUid, setAuthUid] = useState<string | null>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const presenceIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAuthUid() {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      const nextAuthUid = data.user?.id ?? null;
      setAuthUid(nextAuthUid);
      if (!nextAuthUid) setOnlineUserIds(new Set());
    }

    loadAuthUid();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextAuthUid = session?.user?.id ?? null;
      setAuthUid(nextAuthUid);
      if (!nextAuthUid) setOnlineUserIds(new Set());
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authUid) return;

    let cancelled = false;

    async function setupPresence() {
      try {
        const channel = supabase.channel("online-users", {
          config: {
            presence: { key: authUid },
          },
        });

        channelRef.current = channel;

        channel
          .on("presence", { event: "sync" }, () => {
            const state = channel.presenceState?.() ?? {};
            const online = new Set<string>();

            Object.values(state).forEach((presences) => {
              (presences as Array<Record<string, unknown>>).forEach((presence) => {
                const id = presence.auth_uid;
                if (typeof id === "string") online.add(id);
              });
            });

            if (!cancelled) setOnlineUserIds(online);
          })
          .subscribe(async (status) => {
            if (status !== "SUBSCRIBED" || cancelled) return;

            await channel.track({
              auth_uid: authUid,
              online_at: new Date().toISOString(),
            });

            // Keep presence fresh; if the tab is closed, the websocket drops and presence disappears.
            presenceIntervalRef.current = window.setInterval(async () => {
              try {
                await channel.track({
                  auth_uid: authUid,
                  online_at: new Date().toISOString(),
                });
              } catch {
                // ignore
              }
            }, 30000);
          });
      } catch (error) {
        console.error("Error setting up global presence:", error);
      }
    }

    setupPresence();

    return () => {
      cancelled = true;

      if (presenceIntervalRef.current) {
        window.clearInterval(presenceIntervalRef.current);
        presenceIntervalRef.current = null;
      }

      const channel = channelRef.current;
      channelRef.current = null;
      if (channel) {
        try {
          channel.untrack();
        } catch {
          // ignore
        }
        supabase.removeChannel(channel);
      }
    };
  }, [authUid]);

  const value = useMemo(() => ({ onlineUserIds }), [onlineUserIds]);

  return <OnlineUsersContext.Provider value={value}>{children}</OnlineUsersContext.Provider>;
}
