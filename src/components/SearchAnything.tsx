import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { mockUsers } from "@/lib/mockUsers";
import searchIcon from "../assets/icons/search_icon.svg";

export function SearchAnything() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return mockUsers.filter((u) => u.name.toLowerCase().includes(q));
  }, [query]);

  const goToProfile = (userId: string) => {
    setQuery("");
    navigate(`/profile/${userId}`);
  };

  return (
    <div className="relative">
      <div className="flex px-3 py-1 border border-accent-lm rounded-full bg-primary-lm">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Anything"
          className="text-accent-lm outline-none bg-transparent"
        />
        <img src={searchIcon} />
      </div>
      {query && (
        <div className="absolute left-0 right-0 mt-1 rounded-md border border-stroke-grey bg-primary-lm shadow z-30">
          {results.length === 0 && (
            <div className="px-3 py-2 text-sm text-text-lighter-lm">
              No matches
            </div>
          )}
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
        </div>
      )}
    </div>
  );
}
