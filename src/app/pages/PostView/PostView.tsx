import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { supabase } from "../../../../supabase/supabaseClient";

type Props = {
  type: string;
};

type AllPostRow = {
  post_id: string;
  type: string;
  title: string;
  description: string;
  created_at: string | null;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const rec = error as Record<string, unknown>;
    const msg = rec.message;
    const details = rec.details;
    const hint = rec.hint;
    const code = rec.code;

    const parts: string[] = [];
    if (typeof msg === "string" && msg.trim()) parts.push(msg.trim());
    if (typeof details === "string" && details.trim()) parts.push(details.trim());
    if (typeof hint === "string" && hint.trim()) parts.push(hint.trim());
    if (typeof code === "string" && code.trim()) parts.push(`Code: ${code.trim()}`);
    if (parts.length) return parts.join(" — ");
  }
  return "Unexpected error";
}

export function PostView({ type }: Props) {
  const { postId } = useParams();
  const [post, setPost] = useState<AllPostRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!postId) return;
      setLoading(true);
      setError("");
      try {
        const { data, error: fetchError } = await supabase
          .from("all_posts")
          .select("post_id,type,title,description,created_at")
          .eq("post_id", postId)
          .maybeSingle();
        if (fetchError) throw fetchError;

        if (!alive) return;
        setPost((data as unknown as AllPostRow | null) ?? null);
      } catch (e: unknown) {
        if (!alive) return;
        setError(getErrorMessage(e));
        setPost(null);
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [postId]);

  return (
    <div className="lg:my-10 lg:px-10 lg:w-full flex lg:justify-center">
      <div className="lg:w-[70vw]">
        <div className="lg:flex lg:items-center lg:justify-between lg:mb-4">
          <h2 className="text-lg lg:font-bold text-text-lm">Post</h2>
          <Link
            to={`/${type}`}
            className="text-sm text-accent-lm hover:underline"
          >
            Back to {type}
          </Link>
        </div>

        <div className="lg:rounded-xl lg:border border-stroke-grey bg-primary-lm lg:p-6">
          {loading ? (
            <p className="text-sm text-text-lighter-lm">Loading…</p>
          ) : error ? (
            <p className="text-sm text-accent-lm">{error}</p>
          ) : !post ? (
            <p className="text-sm text-text-lighter-lm">Post not found.</p>
          ) : (
            <>
              <div className="text-xs text-text-lighter-lm">{post.type}</div>
              <h3 className="lg:mt-1 lg:font-semibold text-text-lm">
                {post.title}
              </h3>
              <p className="lg:mt-3 text-sm text-text-lighter-lm lg:whitespace-pre-wrap">
                {post.description}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default PostView;
