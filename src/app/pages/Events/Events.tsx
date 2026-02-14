import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabase/supabaseClient";
import EventPost from "./components/EventPost";
import type { EventPostType } from "./components/EventPost";
import CreateEventModal from "./components/CreateEventModal/CreateEventModal";
import { CategoryFilter } from "@/app/pages/CollabHub/components/CategoryFilter";
import type { Category } from "@/app/pages/CollabHub/components/Category";
import { toast } from "react-hot-toast";
import postEmptyState from "@/assets/images/noPost.svg";

export function Events() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<EventPostType[]>([]);
  const [categories, setCategories] = useState<Category[]>(["all"]);
  const [filter, setFilter] = useState<Category>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch all events and merge related data
  async function loadEvents() {
    setLoading(true);

    try {
      // Fetch event posts
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
            type,
            title,
            description,
            author_id,
            like_count,
            comment_count,
            created_at
          ),
          events_category (
            category_id,
            category_name
          )
        `)
        .order("event_start_date", { ascending: false });

      if (eventsError) {
        console.error("Error fetching events:", eventsError);
        toast.error("Failed to load events: " + (eventsError?.message ?? "See console for details"));
        // try a simpler fallback query to determine whether the nested select caused the error
        const { data: fallbackEvents, error: fallbackError } = await supabase
          .from("event_posts")
          .select(`post_id, location, event_start_date, event_end_date, img_url, category_id`)
          .order("event_start_date", { ascending: false });

        if (fallbackError) {
          console.error("Fallback fetch also failed:", fallbackError);
          toast.error("Failed to load events: " + (eventsError?.message ?? "Unknown error"));
          setPosts([]);
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
        return;
      }

      // Fetch related tables
      const [{ data: segments }, { data: owners }, { data: users }, { data: tags }, { data: skills }] =
        await Promise.all([
          supabase.from("event_segment").select(`
            segment_id,
            post_id,
            segment_title,
            segment_description,
            segment_start_date,
            segment_end_date,
            segment_start_time,
            segment_end_time,
            segment_location
          `),
          supabase.from("user_posts").select("post_id, auth_uid"),
          supabase.from("user_info").select("auth_uid, name, department, batch"),
          supabase.from("post_tags").select("post_id, skill_id"),
          supabase.from("skills_lookup").select("id, skill"),
        ]);

  const { data: departments } = await supabase
  .from("departments_lookup")
  .select("dept_id, department_name");

   const mergedOwners = (owners ?? []).map((o: any) => ({
        ...o,
        user_info: (users ?? []).find((u: any) => u.auth_uid === o.auth_uid) ?? null,
      }));

      // Merge tags with skills_lookup
      const mergedTags = (tags ?? []).map((t: any) => ({
        ...t,
        name: (skills ?? []).find((s: any) => s.id === t.skill_id)?.skill ?? "",
      }));


const mergedPosts = (events ?? []).map((ev: any) => {
  const owner = mergedOwners.find((o: any) => o.post_id === ev.post_id);
  const userInfo = owner?.user_info;

  const deptName = departments?.find(
    (d: any) => d.dept_id === userInfo?.department
  )?.department_name;

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

     
 

      setPosts(mergedPosts);
    } catch (err) {
      console.error(err);
      toast.error("Error loading events");
      setPosts([]);
    } finally {
      setLoading(false);
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

  // Top-level useEffect to load data once
  useEffect(() => {
    loadEvents();
    loadCategories();
  }, []);

  // Filter posts by selected category
  const filtered = useMemo(() => {
    if (filter === "all") return posts;
    return posts.filter((p) => p.category === filter);
  }, [posts, filter]);

  // Handle modal create
  async function handleCreate() {
    await loadEvents();
  }

  return (
    <div className="lg:min-h-screen bg-background-lm">
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
                <p>Loading events...</p>
              ) : filtered.length === 0 ? (
                <div className="lg:flex flex-col lg:items-center lg:justify-center lg:min-h-50 border-stroke-grey">
                  <img src={postEmptyState} className="lg:size-50"></img>
                  <p className="text-text-lighter-lm text-lg">No posts in this category</p>
                </div>
              ) : (
                filtered.map((p) => (
                  <EventPost key={p.id} post={p} onClick={() => navigate(`/events/${p.id}`)} />
                ))
              )}
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
