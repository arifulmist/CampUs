import { useParams } from "react-router-dom";
import { EventPostRoute } from "./components/EventPostRoute";
import { PostComments } from "@/components/PostComments";
import { UpcomingEvents } from "@/components/UpcomingEvents";

export function EventPostDetailRoute() {
  const { postId } = useParams();

  if (!postId) {
    return (
      <div className="lg:flex lg:gap-10 lg:h-full lg:w-full lg:p-10 lg:animate-fade-in justify-center items-start">
        <div className="bg-primary-lm border border-stroke-grey lg:rounded-xl lg:p-10 flex flex-col gap-6 lg:w-[70vw]">
          <p className="text-text-lighter-lm">Invalid event post.</p>
        </div>
        <div className="lg:w-[20vw]">
          <UpcomingEvents />
        </div>
      </div>
    );
  }

  return (
    <div className="not-last:lg:flex lg:gap-10 lg:h-full lg:w-full lg:p-10 lg:animate-fade-in justify-center items-start">
      <div className="bg-primary-lm border border-stroke-grey lg:rounded-xl lg:p-10 flex flex-col gap-6 lg:w-[70vw]">
        <EventPostRoute postId={postId} />
        <PostComments postId={postId} />
      </div>
      <div className="lg:w-[20vw]">
        <UpcomingEvents />
      </div>
    </div>
  );
}

export default EventPostDetailRoute;
