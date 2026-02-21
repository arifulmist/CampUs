import { PostBody } from "@/components/PostBody.tsx";
import { UpcomingEvents } from "@/components/UpcomingEvents.tsx";
import { useEffect, useState } from "react";
import { supabase } from "@/supabase/supabaseClient";
import { Link } from "react-router-dom";

export function Home() {
  const [authUid, setAuthUid] = useState<string | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<any[]>([]);
  const [popularPosts, setPopularPosts] = useState<any[]>([]);
  const [hasSkillsOrInterests, setHasSkillsOrInterests] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (!mounted) return;
      if (userError) console.error("Error fetching user:", userError);
      const uid = userData?.user?.id ?? null;
      setAuthUid(uid);
      console.log("Logged in user:", uid);

      // --- Lost & Found (embed user_profile only) ---
      const { data: lostFound, error: lfError } = await supabase
        .from("all_posts")
        .select(`
          post_id,
          type,
          title,
          description,
          created_at,
          author_id,
          like_count,
          comment_count,
          author_id(user_profile(profile_picture_url, bio))
        `)
        .eq("type", "LostFound")
        .order("created_at", { ascending: false });

      if (lfError) console.error("Lost & Found error:", lfError);
      console.log("Lost & Found posts:", lostFound);

      let personalized: any[] = [];
      if (uid) {
        const { data: skills } = await supabase
          .from("user_skills")
          .select("skill_id")
          .eq("auth_uid", uid);
        console.log("User skills:", skills);

        const { data: interests } = await supabase
          .from("user_interests")
          .select("interest_id")
          .eq("auth_uid", uid);
        console.log("User interests:", interests);

        const skillIds = skills?.map((s) => s.skill_id) ?? [];
        const interestIds = interests?.map((i) => i.interest_id) ?? [];
        const combinedIds = [...new Set([...skillIds, ...interestIds])];

        setHasSkillsOrInterests(combinedIds.length > 0);
        console.log("Combined skill/interest IDs:", combinedIds);

        if (combinedIds.length > 0) {
          const { data: taggedPosts, error: tpError } = await supabase
            .from("post_tags")
            .select(`
              post_id,
              all_posts(
                post_id,
                type,
                title,
                description,
                created_at,
                author_id,
                like_count,
                comment_count,
                author_id(user_profile(profile_picture_url))
              )
            `)
            .in("skill_id", combinedIds);

          if (tpError) console.error("Tagged posts error:", tpError);
          console.log("Tagged posts:", taggedPosts);

          personalized = taggedPosts?.map((t) => t.all_posts) ?? [];
        }
      }

      const mergedRelated = [
        ...(lostFound ?? []),
        ...personalized,
      ];

      const uniqueRelated = new Map<string, any>();
      for (const post of mergedRelated) {
        uniqueRelated.set(post.post_id, post);
      }

      const sortedRelated = Array.from(uniqueRelated.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      console.log("Final related posts:", sortedRelated);
      setRelatedPosts(sortedRelated);

      // --- Most Popular (embed user_profile only) ---
      const { data: popular, error: popError } = await supabase
        .from("all_posts")
        .select(`
          post_id,
          type,
          title,
          description,
          created_at,
          author_id,
          like_count,
          comment_count,
          author_id(user_profile(profile_picture_url))
        `)
        .order("like_count", { ascending: false })
        .order("comment_count", { ascending: false })
        .limit(10);

      if (popError) console.error("Popular posts error:", popError);
      console.log("Popular posts:", popular);

      setPopularPosts(popular ?? []);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Helper to build correct URL
  const buildUrl = (p: any) => {
    const type = p.type.toLowerCase();
    if (type === "lostfound") return `/lost-and-found/${p.post_id}`;
    if (type === "event") return `/events/${p.post_id}`;
    return `/${type}/${p.post_id}`;
  };

  return (
    <div className="lg:flex lg:gap-10 lg:h-full lg:w-full lg:p-10 lg:animate-fade-in justify-center items-start">
      <div className="bg-primary-lm border border-stroke-grey lg:rounded-xl lg:p-10 flex flex-col gap-10 lg:w-[70vw]">

        {/* Related Posts */}
        <h2 className="text-lg font-bold">Related Posts</h2>
        {!hasSkillsOrInterests && relatedPosts.length === 0 && (
          <div className="text-gray-500">
            Add skills and interests to see related posts here.
          </div>
        )}
        {relatedPosts.length === 0 && hasSkillsOrInterests && (
          <div className="text-gray-500">No related posts found</div>
        )}
        {relatedPosts.map((p) => (
          <Link key={p.post_id} to={buildUrl(p)} className="block hover:bg-gray-50 rounded-lg">
            <PostBody
              title={p.title}
              user={{
                name: null,
                batch: null,
                imgURL: p.author_id?.user_profile?.profile_picture_url ?? null,
                userId: p.author_id,
              }}
              content={{ text: p.description }}
            />
          </Link>
        ))}

        {/* Most Popular */}
        <h2 className="text-lg font-bold mt-8">Most Popular</h2>
        {popularPosts.length === 0 && (
          <div className="text-gray-500">No popular posts yet</div>
        )}
        {popularPosts.map((p) => (
          <Link key={p.post_id} to={buildUrl(p)} className="block hover:bg-gray-50 rounded-lg">
            <PostBody
              title={p.title}
              user={{
                name: null,
                batch: null,
                imgURL: p.author_id?.user_profile?.profile_picture_url ?? null,
                userId: p.author_id,
              }}
              content={{
                text: `${p.description}\n\n👍 ${p.like_count ?? 0} • 💬 ${p.comment_count ?? 0}`,
              }}
            />
          </Link>
        ))}
      </div>

      <div className="lg:w-[20vw]">
        <UpcomingEvents />
      </div>
    </div>
  );
}
