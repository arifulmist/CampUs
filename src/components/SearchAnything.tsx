import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { mockUsers } from "@/mockData/mockUsers";
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
    <div className="lg:relative">
      <div className="lg:flex lg:px-3 lg:py-1 lg:border border-accent-lm lg:rounded-full bg-primary-lm">
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
        <div className="lg:absolute lg:left-0 lg:right-0 lg:mt-1 lg:rounded-md lg:border border-stroke-grey bg-primary-lm lg:shadow lg:z-30">
          {results.length === 0 && (
            <div className="lg:px-3 lg:py-2 text-sm text-text-lighter-lm">
              No matches
            </div>
          )}
          {results.map((u) => (
            <button
              key={u.id}
              onClick={() => goToProfile(u.id)}
              className="lg:flex lg:w-full lg:items-center lg:gap-2 lg:px-3 lg:py-2 text-left hover:bg-hover-lm"
            >
              <img
                src={u.avatar}
                className="lg:h-6 lg:w-6 lg:rounded-full lg:border border-stroke-peach"
              />
              <div className="lg:flex-1">
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
