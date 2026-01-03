import { PostBody } from "@/components/PostBody.tsx";
import { UpcomingEventsHome } from "@/components/UpcomingEventsHome.tsx";

import { placeholderUser } from "@/lib/placeholderUser.ts";
import placeholderPostImg from "@/assets/images/placeholderPostImg.png";

//placeholder data
const title = "Announcing CyberVoid 2025 by MCSC. Don’t miss it!";
const content = {
  text: "For the first time, MIST Cyber Security Club is hosting a 3-in-1 event exclusively for MIST students! CyberVoid'25 kicks off on Dec 10, 2025, and wraps up on Dec 12. Don't miss out on this incredible 3-day experience! Register now and secure your spot! Featu...",
  img: placeholderPostImg,
};
const user = placeholderUser;

export function Home() {
  return (
    <div className="flex gap-10 h-full w-full p-10">
      <div className="flex flex-col gap-10 h-full bg-primary-lm p-10 rounded-2xl border-2 border-stroke-grey">
        <PostBody title={title} content={content} user={user} />
        <PostBody title={title} content={content} user={user} />
      </div>
      <UpcomingEventsHome />
    </div>
  );
}
