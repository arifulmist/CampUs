import { PostBody } from "@/components/PostBody.tsx";
import { UpcomingEvents } from "@/components/UpcomingEvents.tsx";

import { placeholderUser } from "@/mockData/placeholderUser";
import placeholderPostImg from "@/assets/images/placeholderPostImg.png";
import { useEffect, useState } from "react";
import { supabase } from "../../../supabase/supabaseClient";

//placeholder data
const title = "Announcing CyberVoid 2025 by MCSC. Don’t miss it!";
const content = {
  text: "For the first time, MIST Cyber Security Club is hosting a 3-in-1 event exclusively for MIST students! CyberVoid'25 kicks off on Dec 10, 2025, and wraps up on Dec 12. Don't miss out on this incredible 3-day experience! Register now and secure your spot!",
  img: placeholderPostImg,
};
const user = placeholderUser;

export function Home() {
  const [authUid, setAuthUid] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setAuthUid(data.user?.id ?? null);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const userForPost = {
    name: user.name,
    batch: user.batch,
    imgURL: null,
    userId: authUid ?? undefined,
  };

  return (
    <div className="lg:flex lg:gap-10 lg:h-full lg:w-full lg:p-10 lg:animate-fade-in justify-center items-start">
      <div className="bg-primary-lm border border-stroke-grey lg:rounded-xl lg:p-10 flex flex-col gap-10 lg:w-[70vw]">
        <PostBody title={title} user={userForPost} content={content}></PostBody>
        <PostBody title={title} user={userForPost} content={content}></PostBody>
      </div>
      <div className="lg:w-[20vw]">
      <UpcomingEvents />
      </div>
    </div>
  );
}
