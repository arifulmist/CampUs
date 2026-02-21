import { ButtonCTA } from "./ButtonCTA";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/supabase/supabaseClient";
import { formatDateToLocale } from "@/utils/datetime";

type UpcomingRow = {
  post_id: string;
  event_posts:
    | {
        post_id: string;
        event_start_date: string | null;
        all_posts: { title: string | null } | null;
      }
    | null;
};

export function UpcomingEvents() {
  const [events, setEvents] = useState<Array<{ postId: string; title: string; startDate: string | null }>>([]);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!alive) return;
        if (!user) {
          setEvents([]);
          return;
        }

        const { data, error } = await supabase
          .from("user_upcoming_events")
          .select(
            "post_id, event_posts:event_posts!user_upcoming_events_post_id_fkey(post_id,event_start_date,all_posts(title))"
          )
          .eq("user_id", user.id);

        if (!alive) return;
        if (error) throw error;

        const rows = (data ?? []) as unknown as UpcomingRow[];
        const mapped = rows
          .map((r) => {
            const postId = r.post_id;
            const ev = r.event_posts;
            const title = ev?.all_posts?.title ?? null;
            if (typeof postId !== "string" || typeof title !== "string" || !title.trim()) return null;
            return { postId, title, startDate: ev?.event_start_date ?? null };
          })
          .filter(Boolean) as Array<{ postId: string; title: string; startDate: string | null }>;

        setEvents(mapped);
      } catch (e) {
        console.error(e);
        if (alive) setEvents([]);
      }
    }

    const handler = () => void load();
    window.addEventListener("campus:upcoming_events_changed", handler as EventListener);
    void load();
    return () => {
      alive = false;
      window.removeEventListener("campus:upcoming_events_changed", handler as EventListener);
    };
  }, []);

  return (
    <div className="lg:flex lg:flex-col lg:justify-between lg:w-full lg:h-fit lg:max-h-60 bg-primary-lm border border-stroke-grey lg:rounded-2xl lg:overflow-hidden">
      <div className="lg:p-3 border border-t-0 border-l-0 border-r-0 border-b-stroke-grey">
        <h6 className="lg:font-[Poppins] lg:font-semibold text-text-lm">
          Upcoming Events
        </h6>
      </div>
      <div className="lg:p-4 lg:flex-1 lg:min-h-0 lg:overflow-y-auto lg:flex lg:flex-col lg:justify-start">
        {events.length === 0 ? (
          <p className="text-text-lighter-lm text-md">No events added</p>
        ) : (
          // events will be mapped to number of events that are interested by the user ONLY WITHIN 1 week of the current date
          //will be wrapped in a <Link> where to=/(link of post)
          <div className="lg:flex lg:flex-col">
            {events.map((ev) => (
              <Link
                key={ev.postId}
                to={`/events/${ev.postId}`}
                className="lg:flex lg:flex-col lg:py-2 lg:px-3 hover:bg-secondary-lm hover:w-full hover:rounded-lg"
              >
                <p className="lg:font-medium text-md text-text-lm">{ev.title}</p>
                <p className="text-text-lighter-lm">
                  {formatDateToLocale(ev.startDate, "en-US", {
                    weekday: "long",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
      <div className="lg:flex lg:justify-end lg:p-3 lg:w-full">
        <Link to="/events">
          <ButtonCTA label={"Add More"} />
        </Link>
      </div>
    </div>
  );
}
