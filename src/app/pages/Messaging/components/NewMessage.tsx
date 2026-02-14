import { useEffect, useMemo, useRef, useState } from "react";
import placeholderUserImg from "@/assets/images/placeholderUser.png";
import { Spinner } from "@/components/ui/spinner";
import { supabase } from "../../../../../supabase/supabaseClient";

export type NewMessageUser = {
  auth_uid: string;
  name: string;
  profile_picture_url?: string;
};

type NewMessageProps = {
  currentUserId: string;
  onSelectUser: (user: NewMessageUser) => void;
};

export function NewMessage({ currentUserId, onSelectUser }: NewMessageProps) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<NewMessageUser[]>([]);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<number | null>(null);

  const trimmedQuery = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    async function loadUsers(search: string) {
      setLoading(true);
      try {
        let infoQuery = supabase
          .from("user_info")
          .select("auth_uid,name")
          .neq("auth_uid", currentUserId)
          .limit(10);

        if (search) {
          infoQuery = infoQuery.ilike("name", `%${search}%`);
        }

        const { data: infoData, error: infoError } = await infoQuery;
        if (infoError) throw infoError;

        const authUids = (infoData ?? []).map((u) => u.auth_uid);

        const { data: profileData } = await supabase
          .from("user_profile")
          .select("auth_uid,profile_picture_url")
          .in("auth_uid", authUids);

        const profileMap = new Map<string, string>();
        (profileData ?? []).forEach((p) => {
          if (p?.auth_uid && p.profile_picture_url) profileMap.set(p.auth_uid, p.profile_picture_url);
        });

        const merged: NewMessageUser[] = (infoData ?? []).map((u) => ({
          auth_uid: u.auth_uid,
          name: u.name,
          profile_picture_url: profileMap.get(u.auth_uid) || undefined,
        }));

        setUsers(merged);
      } catch (e) {
        console.error("Failed to load users for New Message:", e);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    }

    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      loadUsers(trimmedQuery);
    }, 200);

    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [trimmedQuery, currentUserId]);

  return (
    <div className="flex flex-col gap-3 lg:mt-4">
      <div className="flex items-center gap-2">
        <label className="text-text-lm shrink-0">To:</label>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type a name"
          className="bg-secondary-lm border border-stroke-grey rounded-md text-text-lm px-2 py-2 placeholder:text-text-lighter-lm/60 flex-1 focus:outline-none focus:border-accent-lm disabled:opacity-50 text-sm"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="flex flex-col items-center gap-3">
            <Spinner className="size-12 text-accent-lm" />
            <p className="text-md text-text-lighter-lm">Loading...</p>
          </div>
        </div>
      ) : users.length === 0 ? (
        <p className="lg:p-4 text-center text-text-lighter-lm">No users found.</p>
      ) : (
        <div className="flex flex-col">
          {users.map((u) => (
            <button
              key={u.auth_uid}
              onClick={() => onSelectUser(u)}
              className="flex items-center gap-4 w-full px-2 py-3 rounded-lg hover:bg-hover-lm transition duration-150 text-left"
            >
              <div className="size-10 shrink-0 rounded-full ring ring-stroke-grey overflow-hidden">
                <img
                  src={u.profile_picture_url || placeholderUserImg}
                  className="w-full h-full object-cover"
                  alt=""
                />
              </div>
              <p className="m-0 p-0 text-text-lm font-medium">{u.name}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
