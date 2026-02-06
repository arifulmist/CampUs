import { useState } from "react";

import { UpcomingEvents } from "@/components/UpcomingEvents";

import InterestedPosts from "./components/InterestedPosts";
import type { InterestedItem } from "./backend/interestedStore";

import { UserProfileProvider } from "./components/UserProfileProvider";
import { ProfileSection } from "./components/ProfileSection";
import { SkillsSection } from "./components/SkillsSection";
import { InterestsSection } from "./components/InterestsSection";
import { UserPostsSection } from "./components/UserPostsSection";
import { useUserProfileContext } from "./components/UserProfileContext";

function UserProfileMainColumn() {
  const { viewedAuthUid } = useUserProfileContext();
  const key = viewedAuthUid ?? "none";

  return (
    <div className="flex flex-col lg:gap-5 lg:w-[70vw]">
      <ProfileSection key={`profile-${key}`} />
      <SkillsSection key={`skills-${key}`} />
      <InterestsSection key={`interests-${key}`} />
      <UserPostsSection key={`posts-${key}`} />
    </div>
  );
}

function UserProfileSidebar({ interestedPosts }: { interestedPosts: InterestedItem[] }) {
  const { canEdit } = useUserProfileContext();

  return (
    <div className="flex flex-col lg:gap-5 lg:w-[20vw] lg:sticky lg:top-40 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
      {canEdit ? <UpcomingEvents /> : null}
      <InterestedPosts items={interestedPosts} />
    </div>
  );
}

export function UserProfile() {
  const [interestedPosts] = useState<InterestedItem[]>([]);

  return (
    <UserProfileProvider>
      <div className="lg:my-10 lg:px-10 lg:w-full lg:h-full flex lg:gap-10 lg:justify-center lg:items-start">
        <UserProfileMainColumn />

        <UserProfileSidebar interestedPosts={interestedPosts} />
      </div>
    </UserProfileProvider>
  );
}
