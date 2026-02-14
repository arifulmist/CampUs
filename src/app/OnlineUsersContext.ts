import { createContext, useContext } from "react";

export type OnlineUsersContextValue = {
  onlineUserIds: Set<string>;
};

export const OnlineUsersContext = createContext<OnlineUsersContextValue | null>(null);

export function useOnlineUsers() {
  const ctx = useContext(OnlineUsersContext);
  if (!ctx) throw new Error("useOnlineUsers must be used within OnlineUsersProvider");
  return ctx;
}
