import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { mockUsers } from "@/lib/mockUsers";

export function UserSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return mockUsers.filter((u) => u.name.toLowerCase().includes(q));
  }, [query]);

  useEffect(() => {
    setOpen(results.length > 0);
  }, [results.length]);

  const goToProfile = (userId: string) => {
    setOpen(false);
    setQuery("");
    navigate(`/profile/${userId}`);
  };

  return (
    <div className="relative w-64">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search users..."
        className="w-full h-9 rounded-md border border-stroke-grey bg-primary-lm px-3 text-text-lm placeholder:text-text-lighter-lm"
      />
      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-stroke-grey bg-primary-lm shadow">
          {results.map((u) => (
            <button
              key={u.id}
              onClick={() => goToProfile(u.id)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-hover-lm"
            >
              <img
                src={u.avatar}
                className="h-6 w-6 rounded-full border border-stroke-peach"
              />
              <div className="flex-1">
                <div className="text-sm text-text-lm">{u.name}</div>
                <div className="text-xs text-text-lighter-lm">
                  {u.department}
                </div>
              </div>
            </button>
          ))}
          {results.length === 0 && (
            <div className="px-3 py-2 text-sm text-text-lighter-lm">
              No matches
            </div>
          )}
        </div>
      )}
    </div>
  );
}
