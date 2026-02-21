import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import searchIcon from "../assets/icons/search_icon.svg";

export function SearchAnything() {
  const navigate = useNavigate();
  const location = useLocation();

  // read query from URL if present
  const params = new URLSearchParams(location.search);
  const initialQuery = params.get("q") ?? "";

  const [query, setQuery] = useState(initialQuery);

  // keep input synced when URL changes
  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const goToSearchPage = () => {
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
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
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") goToSearchPage();
          }}
        />
        <img
          src={searchIcon}
          onClick={goToSearchPage}
          className="cursor-pointer"
        />
      </div>
    </div>
  );
}
