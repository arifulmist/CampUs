import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabase/supabaseClient";
import EventPost from "./components/EventPost";
import type { EventPostType } from "./components/EventPost";
import CreateEventModal from "./components/CreateEventModal/CreateEventModal";
import { CategoryFilter } from "@/app/pages/CollabHub/components/CategoryFilter";
import type { Category } from "@/app/pages/CollabHub/components/Category";
import { toast } from "react-hot-toast";
import postEmptyState from "@/assets/images/noPost.svg";
import { Loading } from "../Fallback/Loading";
import { fetchAttachmentUrlsByPostIds, normalizeAttachmentUrls } from "@/utils/postAttachments";

export function Events() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<EventPostType[]>([]);
  const [categories, setCategories] = useState<Category[]>(["all"]);
  const [filter, setFilter] = useState<Category>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const inFlightRef = useRef(false);

  const PAGE_SIZE = 20;

  async function loadEvents({ reset }: { reset: boolean }) {
    if (inFlightRef.current) return;
    if (reset) {
      setLoading(true);
      setInitialLoad(true);
      setHasMore(true);
      setPage(0);
      setPosts([]);
    } else {
      if (loadingMore || loading || !hasMore) return;
      setLoadingMore(true);
    }

    inFlightRef.current = true;

    const offset = (reset ? 0 : page) * PAGE_SIZE;
    const categoryArg = filter === "all" ? null : String(filter);

    try {
      let mappedFromRpc: EventPostType[] | null = null;
      const rpcRes = await supabase.rpc("get_events_feed_page", {
        p_limit: PAGE_SIZE,
        p_offset: offset,
        p_category: categoryArg,
      });

      if (!rpcRes.error && Array.isArray(rpcRes.data)) {
        const rows = rpcRes.data as any[];
        mappedFromRpc = rows.map((r) => {
          const dept = typeof r.author_department === "string" ? r.author_department : "";
          const batch = typeof r.author_batch === "string" ? r.author_batch : "";

          return {
            id: String(r.post_id),
            category: typeof r.category_name === "string" ? r.category_name : "Uncategorized",
            title: String(r.title ?? "Untitled"),
            author: typeof r.author_name === "string" ? r.author_name : "Unknown",
            authorAuthUid: typeof r.author_auth_uid === "string" ? r.author_auth_uid : undefined,
            dept,
            batch,
            excerpt: String(r.description ?? "").slice(0, 100),
            body: String(r.description ?? ""),
            location: typeof r.location === "string" ? r.location : null,
            eventStartDate: r.event_start_date ?? null,
            eventEndDate: r.event_end_date ?? null,
            image: r.img_url ?? null,
            likes: Number(r.like_count ?? 0),
            comments: Number(r.comment_count ?? 0),
            shares: 0,
            createdAt: typeof r.created_at === "string" ? r.created_at : "",
            // The feed UI doesn't render full segment lists; keep this empty to avoid extra work.
            segments: [],
            tags: Array.isArray(r.tags) ? r.tags : Array.isArray(r.tags?.value) ? r.tags.value : [],
          } satisfies EventPostType;
        });
      }

      if (mappedFromRpc) {
        const postIds = mappedFromRpc.map((p) => p.id);
        const attachmentMap = await fetchAttachmentUrlsByPostIds(postIds);
        const withAttachments = mappedFromRpc.map((p) => {
          const fromTable = attachmentMap.get(p.id) ?? [];
          const merged = normalizeAttachmentUrls([...fromTable, p.image ?? undefined]);
          return {
            ...p,
            images: merged.length ? merged : undefined,
            image: merged[0] ?? p.image ?? null,
          } satisfies EventPostType;
        });

        setPosts((prev) => (reset ? withAttachments : [...prev, ...withAttachments]));
        setHasMore(withAttachments.length === PAGE_SIZE);
        setPage((p) => (reset ? 1 : p + 1));
      } else {
        // Fallback: existing query/merge (kept for environments where RPC isn't deployed yet)
        const { data: events, error: eventsError } = await supabase
          .from("event_posts")
          .select(`
          post_id,
          location,
          event_start_date,
          event_end_date,
          registration_link,
          img_url,
          category_id,
          all_posts (
            post_id,
            title,
            description,
            like_count,
            comment_count,
            created_at
          ),
          events_category (
            category_name
          )
        `)
          .order("event_start_date", { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1);

        if (eventsError) {
          console.error("Error fetching events:", eventsError);
          toast.error("Failed to load events: " + (eventsError?.message ?? "See console for details"));
          // try a simpler fallback query to determine whether the nested select caused the error
          const { data: fallbackEvents, error: fallbackError } = await supabase
            .from("event_posts")
            .select(`post_id, location, event_start_date, event_end_date, img_url, category_id`)
            .order("event_start_date", { ascending: false })
            .range(offset, offset + PAGE_SIZE - 1);

          if (fallbackError) {
            console.error("Fallback fetch also failed:", fallbackError);
            toast.error("Failed to load events: " + (eventsError?.message ?? "Unknown error"));
            if (reset) setPosts([]);
            return;
          }

          // map fallback results into minimal post objects so the UI can render something
          const minimal = (fallbackEvents ?? []).map((ev: any) => ({
            id: ev.post_id,
            category: "Uncategorized",
            title: "Untitled",
            author: "Unknown",
            excerpt: "",
            body: "",
            location: ev.location,
            image: ev.img_url,
            likes: 0,
            comments: 0,
            shares: 0,
            createdAt: "",
            segments: [],
            tags: [],
          }));

          setPosts(minimal);
          setHasMore(false);
          return;
        }

        const eventIds = (events ?? [])
          .map((ev: any) => ev?.post_id)
          .filter((id: any) => typeof id === "string") as string[];

        const [{ data: segments }, { data: owners }, { data: tags }] = await Promise.all([
          eventIds.length
            ? supabase
                .from("event_segment")
                .select(
                  `segment_id, post_id, segment_title, segment_description, segment_start_date, segment_end_date, segment_start_time, segment_end_time, segment_location`
                )
                .in("post_id", eventIds)
            : Promise.resolve({ data: [], error: null } as any),
          eventIds.length
            ? supabase.from("user_posts").select("post_id, auth_uid").in("post_id", eventIds)
            : Promise.resolve({ data: [], error: null } as any),
          eventIds.length
            ? supabase.from("post_tags").select("post_id, skill_id").in("post_id", eventIds)
            : Promise.resolve({ data: [], error: null } as any),
        ]);

        const skillIds = Array.from(
          new Set((tags ?? []).map((t: any) => t?.skill_id).filter((id: any) => typeof id === "number"))
        ) as number[];
        const { data: skills } = skillIds.length
          ? await supabase.from("skills_lookup").select("id, skill").in("id", skillIds)
          : ({ data: [] } as any);

        const ownerIds = Array.from(
          new Set((owners ?? []).map((o: any) => o?.auth_uid).filter((id: any) => typeof id === "string"))
        ) as string[];
        const { data: users } = ownerIds.length
          ? await supabase.from("user_info").select("auth_uid, name, department, batch").in("auth_uid", ownerIds)
          : ({ data: [] } as any);

        const deptIds = Array.from(
          new Set((users ?? []).map((u: any) => u?.department).filter((d: any) => typeof d === "string"))
        ) as string[];
        const { data: departments } = deptIds.length
          ? await supabase.from("departments_lookup").select("dept_id, department_name").in("dept_id", deptIds)
          : ({ data: [] } as any);

        const mergedOwners = (owners ?? []).map((o: any) => ({
          ...o,
          user_info: (users ?? []).find((u: any) => u.auth_uid === o.auth_uid) ?? null,
        }));

        const mergedTags = (tags ?? []).map((t: any) => ({
          ...t,
          name: (skills ?? []).find((s: any) => s.id === t.skill_id)?.skill ?? "",
        }));

        const mergedPosts = (events ?? []).map((ev: any) => {
          const owner = mergedOwners.find((o: any) => o.post_id === ev.post_id);
          const userInfo = owner?.user_info;

          const deptName = departments?.find((d: any) => d.dept_id === userInfo?.department)?.department_name;
          const postData = ev.all_posts;

          return {
            id: ev.post_id,
            category: ev.events_category?.category_name ?? "Uncategorized",
            title: postData?.title ?? "Untitled",
            author: userInfo?.name ?? "Unknown",
            authorAuthUid: typeof owner?.auth_uid === "string" ? owner.auth_uid : undefined,
            dept: deptName ?? "",
            batch: userInfo?.batch ?? "",
            excerpt: postData?.description?.slice(0, 100) ?? "",
            body: postData?.description ?? "",
            location: ev.location,
            eventStartDate: ev.event_start_date ?? null,
            eventEndDate: ev.event_end_date ?? null,
            image: ev.img_url,
            likes: postData?.like_count ?? 0,
            comments: postData?.comment_count ?? 0,
            shares: 0,
            createdAt: postData?.created_at ?? "",
            segments: (segments ?? [])
              .filter((seg: any) => seg.post_id === ev.post_id)
              .map((seg: any) => ({
                id: seg.segment_id,
                name: seg.segment_title,
                description: seg.segment_description,
                startDate: seg.segment_start_date,
                endDate: seg.segment_end_date,
                startTime: seg.segment_start_time,
                endTime: seg.segment_end_time,
                location: seg.segment_location,
              })),
            tags: mergedTags
              .filter((t: any) => t.post_id === ev.post_id)
              .map((t: any) => ({
                skill_id: t.skill_id,
                name: t.name,
              })),
          };
        });

        const mergedIds = mergedPosts.map((p: any) => String(p.id));
        const attachmentMap = await fetchAttachmentUrlsByPostIds(mergedIds);
        const mergedWithAttachments = mergedPosts.map((p: any) => {
          const fromTable = attachmentMap.get(String(p.id)) ?? [];
          const merged = normalizeAttachmentUrls([...fromTable, p.image ?? undefined]);
          return {
            ...p,
            images: merged.length ? merged : undefined,
            image: merged[0] ?? p.image ?? null,
          };
        });

        const visible = filter === "all"
          ? mergedWithAttachments
          : mergedWithAttachments.filter((p: any) => p.category === filter);
        setPosts((prev) => (reset ? visible : [...prev, ...visible]));
        setHasMore((events ?? []).length === PAGE_SIZE);
        setPage((p) => (reset ? 1 : p + 1));
      }
    } catch (err) {
      console.error(err);
      toast.error("Error loading events");
      if (reset) setPosts([]);
    } finally {
      inFlightRef.current = false;
      setLoading(false);
      setLoadingMore(false);
      setInitialLoad(false);
    }
  }

  // Fetch categories
  async function loadCategories() {
    const { data, error } = await supabase.from("events_category").select("category_name");
    if (error) {
      console.error("Error fetching categories:", error);
      return;
    }
    if (data) {
      setCategories(["all", ...data.map((c: any) => c.category_name as Category)]);
    }
  }

  useEffect(() => {
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadEvents({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    if (!hasMore) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;
        void loadEvents({ reset: false });
      },
      { root: null, rootMargin: "400px", threshold: 0 }
    );

    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loadingMore, loading, page]);

  const filtered = useMemo(() => posts, [posts]);

  // Handle modal create
  async function handleCreate() {
    await loadEvents({ reset: true });
  }

  return (
    <div className="lg:min-h-screen">
      <div className="lg:flex lg:gap-10 lg:h-full lg:w-full lg:p-10">
        {/* LEFT: Posts */}
        <div className="lg:flex lg:flex-col lg:gap-10 lg:h-full bg-primary-lm lg:p-10 lg:rounded-2xl border border-stroke-grey">
          <button
            onClick={() => setModalOpen(true)}
            className="lg:w-full lg:rounded-lg lg:border border-stroke-grey bg-secondary-lm lg:px-4 lg:py-3 text-left text-accent-lm hover:bg-[#FFF4EE]"
          >
            Click to announce an event here
          </button>

          <div className="lg:flex lg:items-center lg:justify-center">
            <div className="lg:w-[60vw] flex flex-col lg:gap-10">
              {loading ? (
                <Loading />
              ) : filtered.length === 0 ? (
                <div className="lg:flex flex-col lg:items-center lg:justify-center lg:min-h-50 border-stroke-grey">
                  <img src={postEmptyState} className="lg:size-50"></img>
                  <p className="text-text-lighter-lm text-lg">No posts in this category</p>
                </div>
              ) : (
                filtered.map((p) => (
                  <EventPost
                    key={p.id}
                    post={p}
                    truncateContentAt={200}
                    onClick={() => navigate(`/events/${p.id}`)}
                  />
                ))
              )}

              {loadingMore ? (
                <div className="lg:flex lg:items-center lg:justify-center lg:py-4">
                  <p className="text-text-lighter-lm">Loading more…</p>
                </div>
              ) : null}

              <div ref={sentinelRef} />
            </div>
          </div>
        </div>

        {/* RIGHT: Categories */}
        <CategoryFilter categories={categories} selected={filter} onChange={setFilter} />
      </div>

      <CreateEventModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}

export default Events;
