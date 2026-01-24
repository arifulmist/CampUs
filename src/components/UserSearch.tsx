import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { mockUsers } from "@/mockData/mockUsers";

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
    <div className="lg:relative lg:w-64">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search users..."
        className="lg:w-full lg:h-9 lg:rounded-md lg:border border-stroke-grey bg-primary-lm lg:px-3 text-text-lm placeholder:text-text-lighter-lm"
      />
      {open && (
        <div className="lg:absolute lg:z-20 lg:mt-1 lg:w-full lg:rounded-md lg:border border-stroke-grey bg-primary-lm lg:shadow">
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
          {results.length === 0 && (
            <div className="lg:px-3 lg:py-2 text-sm text-text-lighter-lm">
              No matches
            </div>
          )}
        </div>
      )}
    </div>
  );
}
