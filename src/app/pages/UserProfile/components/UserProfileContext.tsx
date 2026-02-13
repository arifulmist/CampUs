/* eslint-disable react-refresh/only-export-components */

import { createContext, useContext } from "react";

import type { SkillsLookupItem } from "./AddLookupItemModal";
import type {
  ContactPlatformRow,
  UserContactItem,
  UserPostItem,
} from "../profile-types";

export type UserProfileContextValue = {
  profileLoading: boolean;
  canEdit: boolean;
  currentAuthUid: string | null;
  viewedAuthUid: string | null;

  displayName: string;
  studentId: string;
  batchLabel: string;
  bio: string;

  profilePictureUrl: string | null;
  backgroundImgUrl: string | null;

  contacts: UserContactItem[];

  contactPlatforms: ContactPlatformRow[];
  contactPlatformsLoading: boolean;
  contactPlatformsError: string;

  skillsLookup: SkillsLookupItem[];
  skillsLookupLoading: boolean;
  skillsLookupError: string;

  skills: string[];
  interests: string[];

  userPosts: UserPostItem[];
  userPostsLoading: boolean;
  userPostsError: string;

  setDisplayName: (value: string) => void;
  setBio: (value: string) => void;
  setProfilePictureUrl: (value: string | null) => void;
  setBackgroundImgUrl: (value: string | null) => void;
  setContacts: (value: UserContactItem[]) => void;

  setSkillsLookup: (updater: (prev: SkillsLookupItem[]) => SkillsLookupItem[]) => void;
  setSkills: (updater: (prev: string[]) => string[]) => void;
  setInterests: (updater: (prev: string[]) => string[]) => void;
};

const UserProfileContext = createContext<UserProfileContextValue | null>(null);

export function UserProfileContextProvider({
  value,
  children,
}: {
  value: UserProfileContextValue;
  children: React.ReactNode;
}) {
  return <UserProfileContext.Provider value={value}>{children}</UserProfileContext.Provider>;
}

export function useUserProfileContext(): UserProfileContextValue {
  const ctx = useContext(UserProfileContext);
  if (!ctx) throw new Error("useUserProfileContext must be used inside UserProfileContextProvider");
  return ctx;
}
