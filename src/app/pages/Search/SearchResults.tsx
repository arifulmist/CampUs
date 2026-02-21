import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { supabase } from "@/supabase/supabaseClient";
import useDebounce from "@/hooks/useDebounce";

function useQueryParam(key: string) {
  const { search } = useLocation();
  return new URLSearchParams(search).get(key) ?? "";
}

function highlight(text: string, query: string) {
  if (!query) return text;
  const regex = new RegExp(`(${query})`, "gi");
  return text.replace(regex, "<mark>$1</mark>");
}

export default function SearchResults() {
  const q = useQueryParam("q").trim();
  const debouncedQ = useDebounce(q, 300);
  const navigate = useNavigate();

  const [tab, setTab] = useState<"people" | "posts">("people");
  const [people, setPeople] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!debouncedQ) return;

    const fetchData = async () => {
      setLoading(true);

      if (tab === "people") {
        const { data } = await supabase
          .from("user_info")
          .select("auth_uid,name,student_id,department,batch")
          .ilike("name", `%${debouncedQ}%`)
          .limit(10);
        setPeople(data ?? []);
      }

      if (tab === "posts") {
        // --- Title search ---
        const { data: postsByTitle } = await supabase
          .from("all_posts")
          .select("post_id, type, title, description, author_id")
          .ilike("title", `%${debouncedQ}%`)
          .limit(10);

        // --- Description search ---
        const { data: postsByDesc } = await supabase
          .from("all_posts")
          .select("post_id, type, title, description, author_id")
          .ilike("description", `%${debouncedQ}%`)
          .limit(10);

        // --- Author search ---
        const { data: authors } = await supabase
          .from("user_info")
          .select("auth_uid, name, student_id")
          .ilike("name", `%${debouncedQ}%`);

        let postsByAuthor: any[] = [];
        if (authors?.length) {
          const authorIds = authors.map((a) => a.auth_uid);
          const { data } = await supabase
            .from("all_posts")
            .select("post_id, type, title, description, author_id")
            .in("author_id", authorIds)
            .limit(10);
          postsByAuthor = data ?? [];
        }

        // --- Merge & deduplicate ---
        const mergedPosts = [
          ...(postsByTitle ?? []),
          ...(postsByDesc ?? []),
          ...(postsByAuthor ?? []),
        ];

        const uniquePosts = new Map<string, any>();
        for (const post of mergedPosts) {
          uniquePosts.set(post.post_id, post);
        }

        const finalPosts = Array.from(uniquePosts.values());
        console.log("finalPosts", finalPosts); // Debug

        setPosts(finalPosts);
      }

      setLoading(false);
    };

    fetchData();
  }, [debouncedQ, tab]);

  // Helper to build correct URL
  const buildUrl = (p: any) => {
    const type = p.type.toLowerCase();
    if (type === "lostfound") return `/lost-and-found/${p.post_id}`;
    if (type === "event") return `/events/${p.post_id}`;
    return `/${type}/${p.post_id}`;
  };

  return (
    <div className="p-10 w-full h-full bg-primary-lm lg:rounded-2xl lg:m-10">
      <h1 className="text-xl font-semibold font-header text-text-lm">Search Results for "{q}"</h1>

      {/* Tabs */}
      <div className="flex mt-4 border-b border-b-stroke-grey">
        <button
          className={`lg:p-2 ${tab === "people" ? "border-b-2 border-accent-lm text-accent-lm bg-hover-lm" : "text-text-lighter-lm/80"}`}
          onClick={() => setTab("people")}
        >
          People
        </button>
        <button
          className={`lg:p-2 ${tab === "posts" ? "border-b-2 border-accent-lm text-accent-lm bg-hover-lm" : "text-text-lighter-lm/80"}`}
          onClick={() => setTab("posts")}
        >
          Posts
        </button>
      </div>

      {loading && <div className="mt-4">Loading…</div>}

      {!loading && tab === "people" && (
        <div className="mt-4 space-y-2">
          {people.length === 0 && <div>No people found</div>}
          {people.map((u) => (
            <button
              key={u.auth_uid}
              onClick={() => navigate(`/profile/${u.student_id}`)}
              className="block p-2 border rounded hover:bg-hover"
            >
              <div dangerouslySetInnerHTML={{ __html: highlight(u.name, debouncedQ) }} />
              <div className="text-sm text-accent-lm">
                {u.department}{u.batch ? `-${u.batch}` : ""}
              </div>
            </button>
          ))}
        </div>
      )}

      {!loading && tab === "posts" && (
        <div className="mt-4 space-y-4">
          {posts.length === 0 && <div>No posts found</div>}
          {posts.map((p) => {
            const url = buildUrl(p);

            return (
              <button
                key={p.post_id}
                onClick={() => navigate(url)}
                className="block p-3 border rounded hover:bg-hover text-left"
              >
                <div
                  className="font-semibold"
                  dangerouslySetInnerHTML={{ __html: highlight(p.title, debouncedQ) }}
                />
                <div
                  className="text-sm text-gray-700"
                  dangerouslySetInnerHTML={{ __html: highlight(p.description, debouncedQ) }}
                />
                <div className="text-xs text-gray-500 mt-1">
                  By {p.author_id} • {p.type}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
