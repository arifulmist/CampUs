import type { InterestedItem } from "@/app/pages/UserProfile/backend/interestedStore";

export type ProfileSkill = { title: string; detail?: string };
export type ProfileContact = {
  type: "gmail" | "linkedin" | "github" | "facebook";
  id: string;
};

export type UserProfileData = {
  bio: string;
  badges: string[];
  skills: ProfileSkill[];
  interests: string[];
  contacts: ProfileContact[];
  interestedPosts: InterestedItem[];
};

export const mockProfiles: Record<string, UserProfileData> = {
  u1: {
    bio: "Design enthusiast and CSE student. Loves UI challenges and campus hackathons.",
    badges: ["UI/UX", "Hackathon Winner"],
    skills: [
      { title: "UI/UX", detail: "MIST INNOVATION CLUB" },
      { title: "Java, MySQL, C++", detail: "MIST Academic Courses" },
    ],
    interests: [
      "Robotics",
      "UI/UX",
      "CTF",
      "Automation",
      "Hackathon",
      "Arduino",
    ],
    contacts: [
      { type: "github", id: "alvi" },
      { type: "linkedin", id: "alvi-binte-zamil" },
      { type: "gmail", id: "alvi@example.com" },
    ],
    interestedPosts: [
      {
        id: "p1",
        title: "Campus UI Sprint",
        category: "Collab",
        tags: ["ui", "design"],
        userName: "Design Club",
        content: "Join weekly UI sprint.",
        createdAt: Date.now() - 86400000,
      },
    ],
  },
  u2: {
    bio: "Hardware tinkerer and robotics lover.",
    badges: ["Robotics", "Volunteer"],
    skills: [
      { title: "Embedded C", detail: "Robotics Lab" },
      { title: "Python", detail: "Automation Scripts" },
    ],
    interests: ["Robotics", "Automation"],
    contacts: [
      { type: "github", id: "tanvir-t" },
      { type: "linkedin", id: "tanvir-tech" },
    ],
    interestedPosts: [
      {
        id: "p2",
        title: "Line Follower Challenge",
        category: "Events",
        tags: ["robotics"],
        userName: "Robotics Club",
        content: "Build and race your bot.",
        createdAt: Date.now() - 172800000,
      },
    ],
  },
  u3: {
    bio: "CTF enthusiast and security learner.",
    badges: ["CTF", "Bug Hunter"],
    skills: [
      { title: "Linux", detail: "Daily Driver" },
      { title: "Networking" },
    ],
    interests: ["CTF", "Security", "Linux"],
    contacts: [
      { type: "github", id: "nusratj" },
      { type: "gmail", id: "nusrat@example.com" },
    ],
    interestedPosts: [],
  },
  u4: {
    bio: "Backend developer enjoying databases.",
    badges: ["DB", "Helper"],
    skills: [{ title: "Node.js" }, { title: "PostgreSQL" }],
    interests: ["Databases", "APIs"],
    contacts: [{ type: "github", id: "rahimu" }],
    interestedPosts: [],
  },
  u5: {
    bio: "Civil works and CAD hobbyist.",
    badges: ["CAD"],
    skills: [{ title: "AutoCAD" }, { title: "GIS" }],
    interests: ["CAD", "Mapping"],
    contacts: [{ type: "linkedin", id: "karim-a" }],
    interestedPosts: [],
  },
  u6: {
    bio: "Supply chain student exploring optimization.",
    badges: ["Ops"],
    skills: [{ title: "Excel" }, { title: "Python" }],
    interests: ["Optimization"],
    contacts: [{ type: "github", id: "fatimas" }],
    interestedPosts: [],
  },
  u7: {
    bio: "Competitive programmer and problem solver.",
    badges: ["CP"],
    skills: [{ title: "C++" }, { title: "Algorithms" }],
    interests: ["Contest", "DSA"],
    contacts: [{ type: "github", id: "zahid-m" }],
    interestedPosts: [],
  },
  u8: {
    bio: "Frontend dev learning charts and UI.",
    badges: ["Frontend"],
    skills: [{ title: "React" }, { title: "CSS" }],
    interests: ["UI", "Visualization"],
    contacts: [{ type: "github", id: "sumaiya-r" }],
    interestedPosts: [],
  },
};
