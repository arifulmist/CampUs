import { useEffect, useState } from "react";
import { supabase } from "@/supabase/supabaseClient";

interface Liker {
  user_id: string;
  name: string;
}

interface LikedByTextProps {
  postId: string;
  likeCount: number;
}

/**
 * Displays a Facebook/Instagram-style "liked by" line.
 *
 * - ≤ 5 likes  → "A, B, C, D and E liked this"
 * - > 5 likes  → "A, B and 15 others liked this"
 */
export function LikedByText({ postId, likeCount }: LikedByTextProps) {
  const [likers, setLikers] = useState<Liker[]>([]);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    if (likeCount <= 0) {
      setLikers([]);
      setFetched(true);
      return;
    }

    let alive = true;

    // For ≤ 5 we need all names; for > 5 we only need the 2 most recent.
    const limit = likeCount <= 5 ? 5 : 2;

    (async () => {
      const { data, error } = await supabase.rpc("get_post_likers", {
        p_post_id: postId,
        p_limit: limit,
      });

      if (!alive) return;

      if (error) {
        console.error("Failed to fetch likers:", error);
        setFetched(true);
        return;
      }

      setLikers(
        (data as Liker[] | null)?.map((d) => ({
          user_id: d.user_id,
          name: d.name,
        })) ?? [],
      );
      setFetched(true);
    })();

    return () => {
      alive = false;
    };
  }, [postId, likeCount]);

  if (likeCount <= 0 || !fetched || likers.length === 0) return null;

  const names = likers.map((l) => l.name);

  return (
    <p className="text-sm text-text-lighter-lm mt-1 truncate">
      <span className="font-semibold">
        {likeCount <= 5
          ? formatNamesAsBold(names)
          : formatTopNamesWithOthers(names, likeCount)}
      </span>
    </p>
  );
}

/** Renders names with bold styling for ≤ 5 likes */
function formatNamesAsBold(names: string[]) {
  if (names.length === 1) {
    return (
      <>
        <span className="font-semibold text-text-lm">{names[0]}</span>
        <span className="font-normal"> liked this</span>
      </>
    );
  }

  const allButLast = names.slice(0, -1);
  const last = names[names.length - 1];

  return (
    <>
      {allButLast.map((n, i) => (
        <span key={n + i}>
          <span className="font-semibold text-text-lm">{n}</span>
          {i < allButLast.length - 1 ? ", " : ""}
        </span>
      ))}
      <span className="font-normal"> and </span>
      <span className="font-semibold text-text-lm">{last}</span>
      <span className="font-normal"> liked this</span>
    </>
  );
}

/** Renders "A, B and N others liked this" for > 5 likes */
function formatTopNamesWithOthers(names: string[], totalCount: number) {
  const othersCount = totalCount - names.length;

  return (
    <>
      {names.map((n, i) => (
        <span key={n + i}>
          <span className="font-semibold text-text-lm">{n}</span>
          {i < names.length - 1 ? ", " : ""}
        </span>
      ))}
      <span className="font-normal"> and </span>
      <span className="font-semibold text-text-lm">
        {othersCount} {othersCount === 1 ? "other" : "others"}
      </span>
      <span className="font-normal"> liked this</span>
    </>
  );
}
