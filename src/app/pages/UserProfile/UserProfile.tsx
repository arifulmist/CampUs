// "use client";
// import {
//   Plus,
//   Mail,
//   Github,
//   Linkedin,
//   Facebook,
//   Pencil,
//   Trash2,
// } from "lucide-react";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
// import {
//   Dialog,
//   DialogContent,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
// } from "@/components/ui/dialog";
// import { Textarea } from "@/components/ui/textarea";
// import { Input } from "@/components/ui/input";
// import { UpcomingEvents } from "@/components/UpcomingEvents.tsx";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import userImg from "@/assets/images/placeholderUser.png";
// import MessageDrawer from "@/app/pages/Messaging/components/MessageDrawer";
// import { useNavigate, useParams } from "react-router";
// import { openChatWith } from "@/app/pages/Messaging/backend/chatStore";
// import { mockUsers, mockLoggedInUser } from "@/mockData/mockUsers";
// import UserProfileUpdate from "./components/UserProfileUpdate"; // new modal component
// import { InterestedPosts } from "./components/InterestedPosts";
// import type { InterestedItem } from "./backend/interestedStore";
// import { mockProfiles } from "@/mockData/mockProfiles";
// import {
//   getInterested,
//   subscribe as interestedSubscribe,
// } from "./backend/interestedStore";
// type Skill = { title: string; detail?: string };
// type Contact = {
//   type: "gmail" | "linkedin" | "github" | "facebook";
//   id: string;
// };
// export function UserProfile() {
//   const navigate = useNavigate();
//   const { userId: routeUserId } = useParams();
//   const loggedIn = mockLoggedInUser;
//   const viewedUser = routeUserId
//     ? mockUsers.find((u) => u.id === routeUserId) || loggedIn
//     : loggedIn;
//   // Redirect to /profile if trying to view own param route
//   useEffect(() => {
//     if (routeUserId && routeUserId === loggedIn.id) {
//       navigate("/profile", { replace: true });
//     }
//   }, [routeUserId, loggedIn.id, navigate]);
//   const [messageOpen, setMessageOpen] = useState(false);
//   const [chatTarget, setChatTarget] = useState<{
//     id: string;
//     name: string;
//   } | null>(null);
//   const [skills, setSkills] = useState<Skill[]>([]);
//   const [interests, setInterests] = useState<string[]>([]);
//   const [contacts, setContacts] = useState<Contact[]>([]);
//   // Bio state
//   const [bio, setBio] = useState<string>("");
//   const [bioOpen, setBioOpen] = useState(false);
//   const [bioDraft, setBioDraft] = useState("");
//   // Badges state (multiple)
//   const [badges, setBadges] = useState<string[]>([]);
//   const [badgeOpen, setBadgeOpen] = useState(false);
//   const [badgeDraft, setBadgeDraft] = useState("");
//   const [editingBadgeIndex, setEditingBadgeIndex] = useState<number | null>(
//     null
//   );
//   // Badge inline actions visibility
//   const [activeBadgeIndex, setActiveBadgeIndex] = useState<number | null>(null);
//   // Skill inline actions visibility + edit dialog state
//   const [activeSkillIndex, setActiveSkillIndex] = useState<number | null>(null);
//   const [skillOpen, setSkillOpen] = useState(false);
//   const [editingSkillIndex, setEditingSkillIndex] = useState<number | null>(
//     null
//   );
//   const [skillDraftTitle, setSkillDraftTitle] = useState("");
//   const [skillDraftDetail, setSkillDraftDetail] = useState("");
//   // Interest inline actions visibility + edit dialog state
//   const [activeInterestIndex, setActiveInterestIndex] = useState<number | null>(
//     null
//   );
//   const [interestOpen, setInterestOpen] = useState(false);
//   const [editingInterestIndex, setEditingInterestIndex] = useState<
//     number | null
//   >(null);
//   const [interestDraft, setInterestDraft] = useState("");
//   // Contact inline actions visibility + edit dialog state
//   const [activeContactIndex, setActiveContactIndex] = useState<number | null>(
//     null
//   );
//   const [contactOpen, setContactOpen] = useState(false);
//   const [editingContactIndex, setEditingContactIndex] = useState<number | null>(
//     null
//   );
//   const [contactDraftType, setContactDraftType] =
//     useState<Contact["type"]>("github");
//   const [contactDraftId, setContactDraftId] = useState("");
//   // Upcoming events will be sourced from CollabHub preferences in future.
//   // modal state
//   const [modalOpen, setModalOpen] = useState(false);
//   const [modalMode, setModalMode] = useState<"skill" | "interest" | "contact">(
//     "skill"
//   );
//   // Interested posts state (per user)


//   // Load per-user mock profile data; for logged-in user, reflect dynamic interested store
//   useEffect(() => {
//     const data = mockProfiles[viewedUser.id];
//     if (data) {
//       setBio(data.bio ?? "");
//       setBadges([...data.badges]);
//       setSkills([...data.skills]);
//       setInterests([...data.interests]);
//       setContacts([...data.contacts]);
//     } else {
//       setBio("");
//       setBadges([]);
//       setSkills([]);
//       setInterests([]);
//       setContacts([]);
//     }

//     let unsub: (() => void) | undefined;
//     if (viewedUser.id === loggedIn.id) {
//       setInterestedPosts(getInterested());
//       unsub = interestedSubscribe((items) => setInterestedPosts(items));
//     } else {
//       setInterestedPosts(data ? [...data.interestedPosts] : []);
//     }
//     return () => {
//       if (unsub) unsub();
//     };
//   }, [viewedUser.id, loggedIn.id]);
//   const openAddSkill = () => {
//     setModalMode("skill");
//     setModalOpen(true);
//   };
//   const openAddInterest = () => {
//     setModalMode("interest");
//     setModalOpen(true);
//   };
//   const openAddContact = () => {
//     setModalMode("contact");
//     setModalOpen(true);
//   };
//   const handleSaveSkill = (skill: Skill) => {
//     setSkills((prev) => [...prev, skill]);
//     setModalOpen(false);
//   };
//   const handleSaveInterest = (interest: string) => {
//     const tag = interest.trim();
//     if (!tag) return;
//     setInterests((prev) => (prev.includes(tag) ? prev : [...prev, tag]));
//     setModalOpen(false);
//   };
//   const handleSaveContact = (contact: Contact) => {
//     const key = `${contact.type}:${contact.id.trim()}`;
//     if (!contact.id.trim()) return;
//     setContacts((prev) =>
//       prev.some((c) => `${c.type}:${c.id}` === key) ? prev : [...prev, contact]
//     );
//     setModalOpen(false);
//   };
//   // Bio handlers
//   const openBioEditor = () => {
//     setBioDraft(bio);
//     setBioOpen(true);
//   };
//   const saveBio = () => {
//     setBio(bioDraft.trim());
//     setBioOpen(false);
//   };
//   const removeBio = () => {
//     setBio("");
//   };
//   // Badge handlers
//   const openBadgeEditor = (index: number | null = null) => {
//     setEditingBadgeIndex(index);
//     setBadgeDraft(index !== null ? badges[index] : "");
//     setBadgeOpen(true);
//   };
//   const saveBadge = () => {
//     const text = badgeDraft.trim();
//     if (!text) {
//       setBadgeOpen(false);
//       return;
//     }
//     if (editingBadgeIndex === null) {
//       setBadges((prev) => [...prev, text]);
//     } else {
//       setBadges((prev) =>
//         prev.map((b, i) => (i === editingBadgeIndex ? text : b))
//       );
//     }
//     setBadgeOpen(false);
//   };
//   const removeBadge = (index: number) => {
//     setBadges((prev) => prev.filter((_, i) => i !== index));
//   };
//   // Skill handlers
//   const openSkillEditor = (index: number) => {
//     setEditingSkillIndex(index);
//     const s = skills[index];
//     setSkillDraftTitle(s?.title ?? "");
//     setSkillDraftDetail(s?.detail ?? "");
//     setSkillOpen(true);
//   };
//   const saveSkillEdit = () => {
//     const title = skillDraftTitle.trim();
//     const detail = skillDraftDetail.trim();
//     if (editingSkillIndex === null || !title) {
//       setSkillOpen(false);
//       return;
//     }
//     setSkills((prev) =>
//       prev.map((s, i) => (i === editingSkillIndex ? { title, detail } : s))
//     );
//     setSkillOpen(false);
//     setActiveSkillIndex(null);
//   };
//   const removeSkill = (index: number) => {
//     setSkills((prev) => prev.filter((_, i) => i !== index));
//     setActiveSkillIndex(null);
//   };
//   // Interest handlers
//   const openInterestEditor = (index: number) => {
//     setEditingInterestIndex(index);
//     setInterestDraft(interests[index] ?? "");
//     setInterestOpen(true);
//   };
//   const saveInterestEdit = () => {
//     const text = interestDraft.trim();
//     if (editingInterestIndex === null || !text) {
//       setInterestOpen(false);
//       return;
//     }
//     setInterests((prev) =>
//       prev.map((t, i) => (i === editingInterestIndex ? text : t))
//     );
//     setInterestOpen(false);
//     setActiveInterestIndex(null);
//   };
//   const removeInterest = (index: number) => {
//     setInterests((prev) => prev.filter((_, i) => i !== index));
//     setActiveInterestIndex(null);
//   };
//   // Contact handlers
//   const openContactEditor = (index: number) => {
//     setEditingContactIndex(index);
//     const c = contacts[index];
//     setContactDraftType(c?.type ?? "github");
//     setContactDraftId(c?.id ?? "");
//     setContactOpen(true);
//   };
//   const saveContactEdit = () => {
//     const id = contactDraftId.trim();
//     if (editingContactIndex === null || !id) {
//       setContactOpen(false);
//       return;
//     }
//     const type = contactDraftType;
//     setContacts((prev) =>
//       prev.map((c, i) => (i === editingContactIndex ? { type, id } : c))
//     );
//     setContactOpen(false);
//     setActiveContactIndex(null);
//   };
//   const removeContact = (index: number) => {
//     setContacts((prev) => prev.filter((_, i) => i !== index));
//     setActiveContactIndex(null);
//   };
//   const contactLink = (c: Contact) => {
//     const id = c.id.trim();
//     const isUrl = /^https?:\/\//i.test(id);
//     if (isUrl) return id;
//     switch (c.type) {
//       case "gmail":
//         return `mailto:${id}`;
//       case "linkedin":
//         return `https://linkedin.com/in/${id}`;
//       case "github":
//         return `https://github.com/${id}`;
//       case "facebook":
//         return `https://facebook.com/${id}`;
//       default:
//         return "#";
//     }
//   };
//   const contactDisplayText = (c: Contact) => {
//     const id = c.id.trim();
//     if (!id) return "";
//     if (c.type === "gmail") return id; // show email address
//     const isUrl = /^https?:\/\//i.test(id);
//     if (!isUrl) return id; // if just a handle, show it directly
//     try {
//       const u = new URL(id);
//       const segments = u.pathname.split("/").filter(Boolean);
//       // Prefer the last non-empty path segment as the handle
//       return segments.length ? segments[segments.length - 1] : id;
//     } catch {
//       return id;
//     }
//   };
//   const ContactIcon = ({ type }: { type: Contact["type"] }) => {
//     switch (type) {
//       case "gmail":
//         return <Mail className="lg:h-4 lg:w-4" />;
//       case "linkedin":
//         return <Linkedin className="lg:h-4 lg:w-4" />;
//       case "github":
//         return <Github className="lg:h-4 lg:w-4" />;
//       case "facebook":
//         return <Facebook className="lg:h-4 lg:w-4" />;
//       default:
//         return null;
//     }
//   };
//   return (
//     <div className="lg:min-h-screen lg:w-full bg-background-lm text-text-lm lg:animate-fade-in lg:pb-8">
//       {/* Page-level Navbar to match the provided design */}
//       <div className="lg:container lg:mx-auto lg:px-4">
//         {/* <div className="lg:grid lg:grid-cols-1 lg:gap-6 lg:items-start lg:grid-cols-[minmax(0,1fr)_350px]"> */}
//         <div className="lg:flex lg:gap-6 lg:items-start lg:justify-center" >
//           {/* Main profile card */}
//           <section className="lg:rounded-2xl lg:border border-stroke-grey bg-primary-lm lg:shadow-sm lg:animate-slide-in">
//             {/* Header */}
//             <div className="lg:flex lg:items-start lg:gap-6 border-b border-stroke-grey lg:p-6">
//               <div className="lg:relative">
//                 <div className="lg:rounded-full border-4 border-stroke-peach lg:p-1">
//                   <Avatar className="lg:h-24 lg:w-24">
//                     <AvatarImage src={viewedUser.avatar || userImg} />
//                     <AvatarFallback>TT</AvatarFallback>
//                   </Avatar>
//                 </div>
//               </div>
//               <div className="lg:flex-1">
//                 <div className="lg:flex lg:items-center lg:gap-3">
//                   <h1 className="text-xl lg:font-extrabold lg:tracking-tight text-text-lm">
//                     {viewedUser.name}
//                   </h1>
//                   {viewedUser.id !== loggedIn.id && (
//                     <Button
//                       size="sm"
//                       className="lg:h-8 lg:rounded-full bg-accent-lm lg:px-3 text-primary-lm hover:bg-hover-btn-lm"
//                       onClick={() => {
//                         openChatWith(viewedUser.id, viewedUser.name);
//                         setChatTarget({
//                           id: viewedUser.id,
//                           name: viewedUser.name,
//                         });
//                         setMessageOpen(true);
//                       }}
//                     >
//                       Message
//                     </Button>
//                   )}
//                 </div>
//                 <div className="lg:mt-1 text-sm text-text-lighter-lm">
//                   {viewedUser.department}
//                 </div>
//                 <div className="text-sm text-text-lighter-lm">LEVEL-3</div>
//                 <div className="lg:mt-3">
//                   {/* Header row: title + add button */}
//                   <div className="lg:flex lg:items-center lg:justify-between">
//                     <h3 className="text-base lg:font-semibold text-text-lm">
//                       Badge
//                     </h3>
//                     <Button
//                       size="sm"
//                       onClick={() => openBadgeEditor(null)}
//                       className="lg:h-8 lg:rounded-full lg:border border-stroke-peach bg-primary-lm lg:px-3 text-accent-lm hover:bg-hover-btn-lm"
//                     >
//                       <Plus className="lg:h-4 lg:w-4" />
//                       Add
//                     </Button>
//                   </div>
//                   {/* Content row: badges or empty state left-aligned */}
//                   <div className="lg:mt-2">
//                     {badges.length ? (
//                       <div className="lg:flex lg:flex-wrap lg:items-center lg:gap-2">
//                         {badges.map((text, idx) => (
//                           <div
//                             key={`${text}-${idx}`}
//                             className="lg:inline-flex lg:items-center lg:gap-2"
//                           >
//                             <Badge
//                               className="bg-secondary-lm text-accent-lm lg:border border-stroke-peach lg:rounded-full lg:px-3 lg:py-2 cursor-pointer"
//                               onClick={() =>
//                                 setActiveBadgeIndex(
//                                   activeBadgeIndex === idx ? null : idx
//                                 )
//                               }
//                             >
//                               {text}
//                             </Badge>
//                             {activeBadgeIndex === idx && (
//                               <>
//                                 <Button
//                                   size="icon-sm"
//                                   onClick={() => openBadgeEditor(idx)}
//                                   className="lg:rounded-full lg:border border-stroke-peach bg-primary-lm text-accent-lm hover:bg-hover-btn-lm"
//                                   aria-label="Edit badge"
//                                 >
//                                   <Pencil className="lg:h-4 lg:w-4" />
//                                 </Button>
//                                 <Button
//                                   size="icon-sm"
//                                   onClick={() => removeBadge(idx)}
//                                   className="lg:rounded-full bg-accent-lm text-primary-lm hover:bg-hover-btn-lm"
//                                   aria-label="Remove badge"
//                                 >
//                                   <Trash2 className="lg:h-4 lg:w-4" />
//                                 </Button>
//                               </>
//                             )}
//                           </div>
//                         ))}
//                       </div>
//                     ) : (
//                       <p className="text-sm text-text-lighter-lm lg:italic">
//                         No badges yet.
//                       </p>
//                     )}
//                   </div>
//                 </div>
//                 {/* Bio Section */}
//                 <div className="lg:mt-4">
//                   <div className="lg:flex lg:items-center lg:justify-between">
//                     <h3 className="text-base lg:font-semibold text-text-lm">
//                       Bio
//                     </h3>
//                     <div className="lg:flex lg:items-center lg:gap-2">
//                       <Button
//                         size="sm"
//                         onClick={openBioEditor}
//                         className="lg:h-8 lg:rounded-full lg:border border-stroke-peach bg-primary-lm lg:px-3 text-accent-lm hover:bg-hover-btn-lm"
//                       >
//                         <Pencil className="lg:h-4 lg:w-4" />
//                         {bio ? "Edit" : "Add"}
//                       </Button>
//                       {bio && (
//                         <Button
//                           size="sm"
//                           onClick={removeBio}
//                           className="lg:h-8 lg:rounded-full bg-accent-lm lg:px-3 text-primary-lm hover:bg-hover-btn-lm"
//                         >
//                           <Trash2 className="lg:h-4 lg:w-4" />
//                           Remove
//                         </Button>
//                       )}
//                     </div>
//                   </div>
//                   {bio ? (
//                     <p className="lg:mt-2 text-sm text-text-lighter-lm lg:whitespace-pre-wrap">
//                       {bio}
//                     </p>
//                   ) : (
//                     <p className="lg:mt-2 text-sm text-text-lighter-lm lg:italic">
//                       No bio yet.
//                     </p>
//                   )}
//                 </div>
//               </div>
//             </div>
//             {/* Skills */}
//             <div className="border-b border-stroke-grey lg:p-6">
//               <div className="lg:mb-4 lg:flex lg:items-center lg:justify-between">
//                 <h2 className="text-lg lg:font-bold text-text-lm">Skills</h2>
//                 <Button
//                   onClick={openAddSkill}
//                   className="lg:h-8 lg:rounded-full bg-accent-lm lg:px-3 text-primary-lm hover:bg-hover-btn-lm"
//                 >
//                   <Plus className="lg:h-4 lg:w-4" />
//                 </Button>
//               </div>
//               <div className="divide-y divide-stroke-grey lg:rounded-xl lg:border border-stroke-grey bg-secondary-lm">
//                 {skills.map((sk, idx) => (
//                   <div
//                     key={idx}
//                     className="lg:flex lg:items-center lg:justify-between lg:gap-4 lg:px-4 lg:py-4 cursor-pointer"
//                     onClick={() =>
//                       setActiveSkillIndex(activeSkillIndex === idx ? null : idx)
//                     }
//                   >
//                     <div>
//                       <div className="lg:font-semibold text-text-lm">
//                         {sk.title}
//                       </div>
//                       {sk.detail && (
//                         <div className="text-sm text-text-lighter-lm">
//                           {sk.detail}
//                         </div>
//                       )}
//                     </div>
//                     <div className="lg:flex lg:items-center lg:gap-2">
//                       {activeSkillIndex === idx && (
//                         <>
//                           <Button
//                             size="icon-sm"
//                             onClick={(e) => {
//                               e.stopPropagation();
//                               openSkillEditor(idx);
//                             }}
//                             className="lg:rounded-full lg:border border-stroke-peach bg-primary-lm text-accent-lm hover:bg-hover-btn-lm"
//                             aria-label="Edit skill"
//                           >
//                             <Pencil className="lg:h-4 lg:w-4" />
//                           </Button>
//                           <Button
//                             size="icon-sm"
//                             onClick={(e) => {
//                               e.stopPropagation();
//                               removeSkill(idx);
//                             }}
//                             className="lg:rounded-full bg-accent-lm text-primary-lm hover:bg-hover-btn-lm"
//                             aria-label="Remove skill"
//                           >
//                             <Trash2 className="lg:h-4 lg:w-4" />
//                           </Button>
//                         </>
//                       )}
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </div>
//             {/* Interested In */}
//             <div className="lg:p-6">
//               <div className="lg:mb-4 lg:flex lg:items-center lg:justify-between">
//                 <h2 className="text-lg lg:font-bold text-text-lm">
//                   Interested In
//                 </h2>
//                 <Button
//                   onClick={openAddInterest}
//                   className="lg:h-8 lg:rounded-full bg-accent-lm lg:px-3 text-primary-lm hover:bg-hover-btn-lm"
//                 >
//                   <Plus className="lg:h-4 lg:w-4" />
//                 </Button>
//               </div>
//               <div className="lg:flex lg:flex-wrap lg:gap-3">
//                 {interests.map((tag, idx) => (
//                   <div
//                     key={`${tag}-${idx}`}
//                     className="lg:inline-flex lg:items-center lg:gap-2"
//                   >
//                     <span
//                       className="lg:rounded-full lg:border border-stroke-peach bg-primary-lm lg:px-4 lg:py-1.5 text-sm lg:font-semibold text-accent-lm lg:shadow-sm cursor-pointer"
//                       onClick={() =>
//                         setActiveInterestIndex(
//                           activeInterestIndex === idx ? null : idx
//                         )
//                       }
//                     >
//                       {tag}
//                     </span>
//                     {activeInterestIndex === idx && (
//                       <>
//                         <Button
//                           size="icon-sm"
//                           onClick={(e) => {
//                             e.stopPropagation();
//                             openInterestEditor(idx);
//                           }}
//                           className="lg:rounded-full lg:border border-stroke-peach bg-primary-lm text-accent-lm hover:bg-hover-btn-lm"
//                           aria-label="Edit interest"
//                         >
//                           <Pencil className="lg:h-4 lg:w-4" />
//                         </Button>
//                         <Button
//                           size="icon-sm"
//                           onClick={(e) => {
//                             e.stopPropagation();
//                             removeInterest(idx);
//                           }}
//                           className="lg:rounded-full bg-accent-lm text-primary-lm hover:bg-hover-btn-lm"
//                           aria-label="Remove interest"
//                         >
//                           <Trash2 className="lg:h-4 lg:w-4" />
//                         </Button>
//                       </>
//                     )}
//                   </div>
//                 ))}
//               </div>
//             </div>
//             {/* Contact */}
//             <div className="lg:p-6">
//               <div className="lg:mb-4 lg:flex lg:items-center lg:justify-between">
//                 <h2 className="text-lg lg:font-bold text-text-lm">Contact</h2>
//                 <Button
//                   onClick={openAddContact}
//                   className="lg:h-8 lg:rounded-full bg-accent-lm lg:px-3 text-primary-lm hover:bg-hover-btn-lm"
//                 >
//                   <Plus className="lg:h-4 lg:w-4" />
//                 </Button>
//               </div>
//               <div className="lg:flex lg:flex-wrap lg:gap-3">
//                 {contacts
//                   .filter((c) => c.id.trim())
//                   .map((c, idx) => (
//                     <div
//                       key={`${c.type}-${c.id}-${idx}`}
//                       className="lg:inline-flex lg:items-center lg:gap-2"
//                     >
//                       <a
//                         href={contactLink(c)}
//                         target="_blank"
//                         rel="noopener noreferrer"
//                         className="lg:inline-flex lg:items-center lg:gap-2 lg:rounded-full lg:border border-stroke-peach bg-primary-lm lg:px-4 lg:py-1.5 text-sm lg:font-semibold text-accent-lm lg:shadow-sm hover:bg-hover-btn-lm cursor-pointer"
//                         aria-label={`${c.type} profile`}
//                         onClick={(e) => {
//                           e.preventDefault();
//                           setActiveContactIndex(
//                             activeContactIndex === idx ? null : idx
//                           );
//                         }}
//                       >
//                         <ContactIcon type={c.type} />
//                         <span>{contactDisplayText(c)}</span>
//                       </a>
//                       {activeContactIndex === idx && (
//                         <>
//                           <Button
//                             size="icon-sm"
//                             onClick={(e) => {
//                               e.stopPropagation();
//                               openContactEditor(idx);
//                             }}
//                             className="lg:rounded-full lg:border border-stroke-peach bg-primary-lm text-accent-lm hover:bg-hover-btn-lm"
//                             aria-label="Edit contact"
//                           >
//                             <Pencil className="lg:h-4 lg:w-4" />
//                           </Button>
//                           <Button
//                             size="icon-sm"
//                             onClick={(e) => {
//                               e.stopPropagation();
//                               removeContact(idx);
//                             }}
//                             className="lg:rounded-full bg-accent-lm text-primary-lm hover:bg-hover-btn-lm"
//                             aria-label="Remove contact"
//                           >
//                             <Trash2 className="lg:h-4 lg:w-4" />
//                           </Button>
//                         </>
//                       )}
//                     </div>
//                   ))}
//               </div>
//             </div>
//           </section>
//           {/* Sidebar: Upcoming Events (shared component) + Interested Posts */}
//           <div className="lg:flex lg:flex-col lg:gap-6 lg:w-87.5 lg:sticky lg:top-24 lg:mt-4 lg:max-h-[calc(100vh-96px)] lg:overflow-hidden">
//             <UpcomingEvents />
//             <InterestedPosts items={interestedPosts} />
//           </div>
//         </div>

//         <UserProfileUpdate
//           open={modalOpen}
//           mode={modalMode}
//           onClose={() => setModalOpen(false)}
//           onSaveSkill={handleSaveSkill}
//           onSaveInterest={handleSaveInterest}
//           onSaveContact={handleSaveContact}
//         />

//         {/* Bio Edit Dialog */}
//         <Dialog open={bioOpen} onOpenChange={setBioOpen}>
//           <DialogContent className="bg-primary-lm lg:border border-stroke-grey text-text-lm">
//             <DialogHeader>
//               <DialogTitle>{bio ? "Edit Bio" : "Add Bio"}</DialogTitle>
//             </DialogHeader>
//             <div>
//               <Textarea
//                 value={bioDraft}
//                 onChange={(e) => setBioDraft(e.target.value)}
//                 placeholder="Write a short bio..."
//                 className="border-stroke-grey bg-primary-lm text-text-lm placeholder:text-text-lighter-lm"
//               />
//             </div>
//             <DialogFooter>
//               <Button
//                 onClick={() => setBioOpen(false)}
//                 className="lg:px-4 lg:py-2 lg:rounded-md lg:border border-stroke-grey bg-primary-lm text-text-lm"
//               >
//                 Cancel
//               </Button>
//               <Button
//                 onClick={saveBio}
//                 className="lg:px-4 lg:py-2 lg:rounded-md bg-accent-lm text-primary-lm hover:bg-hover-btn-lm"
//               >
//                 Save
//               </Button>
//             </DialogFooter>
//           </DialogContent>
//         </Dialog>

//         {/* Badge Edit Dialog */}
//         <Dialog open={badgeOpen} onOpenChange={setBadgeOpen}>
//           <DialogContent className="bg-primary-lm lg:border border-stroke-grey text-text-lm">
//             <DialogHeader>
//               <DialogTitle>
//                 {editingBadgeIndex !== null ? "Edit Badge" : "Add Badge"}
//               </DialogTitle>
//             </DialogHeader>
//             <div>
//               <Input
//                 value={badgeDraft}
//                 onChange={(e) => setBadgeDraft(e.target.value)}
//                 placeholder="Badge text..."
//                 className="border-stroke-grey bg-primary-lm text-text-lm placeholder:text-text-lighter-lm"
//               />
//             </div>
//             <DialogFooter>
//               <Button
//                 onClick={() => setBadgeOpen(false)}
//                 className="lg:px-4 lg:py-2 lg:rounded-md lg:border border-stroke-grey bg-primary-lm text-text-lm"
//               >
//                 Cancel
//               </Button>
//               <Button
//                 onClick={saveBadge}
//                 className="lg:px-4 lg:py-2 lg:rounded-md bg-accent-lm text-primary-lm hover:bg-hover-btn-lm"
//               >
//                 Save
//               </Button>
//             </DialogFooter>
//           </DialogContent>
//         </Dialog>

//         {/* Skill Edit Dialog */}
//         <Dialog open={skillOpen} onOpenChange={setSkillOpen}>
//           <DialogContent className="bg-primary-lm lg:border border-stroke-grey text-text-lm">
//             <DialogHeader>
//               <DialogTitle>{"Edit Skill"}</DialogTitle>
//             </DialogHeader>
//             <div className="lg:space-y-3">
//               <Input
//                 value={skillDraftTitle}
//                 onChange={(e) => setSkillDraftTitle(e.target.value)}
//                 placeholder="Skill title..."
//                 className="border-stroke-grey bg-primary-lm text-text-lm placeholder:text-text-lighter-lm"
//               />
//               <Input
//                 value={skillDraftDetail}
//                 onChange={(e) => setSkillDraftDetail(e.target.value)}
//                 placeholder="Detail (optional)"
//                 className="border-stroke-grey bg-primary-lm text-text-lm placeholder:text-text-lighter-lm"
//               />
//             </div>
//             <DialogFooter>
//               <Button
//                 onClick={() => setSkillOpen(false)}
//                 className="lg:px-4 lg:py-2 lg:rounded-md lg:border border-stroke-grey bg-primary-lm text-text-lm"
//               >
//                 Cancel
//               </Button>
//               <Button
//                 onClick={saveSkillEdit}
//                 className="lg:px-4 lg:py-2 lg:rounded-md bg-accent-lm text-primary-lm hover:bg-hover-btn-lm"
//               >
//                 Save
//               </Button>
//             </DialogFooter>
//           </DialogContent>
//         </Dialog>

//         {/* Interest Edit Dialog */}
//         <Dialog open={interestOpen} onOpenChange={setInterestOpen}>
//           <DialogContent className="bg-primary-lm lg:border border-stroke-grey text-text-lm">
//             <DialogHeader>
//               <DialogTitle>{"Edit Interest"}</DialogTitle>
//             </DialogHeader>
//             <div>
//               <Input
//                 value={interestDraft}
//                 onChange={(e) => setInterestDraft(e.target.value)}
//                 placeholder="Interest text..."
//                 className="border-stroke-grey bg-primary-lm text-text-lm placeholder:text-text-lighter-lm"
//               />
//             </div>
//             <DialogFooter>
//               <Button
//                 onClick={() => setInterestOpen(false)}
//                 className="lg:px-4 lg:py-2 lg:rounded-md lg:border border-stroke-grey bg-primary-lm text-text-lm"
//               >
//                 Cancel
//               </Button>
//               <Button
//                 onClick={saveInterestEdit}
//                 className="lg:px-4 lg:py-2 lg:rounded-md bg-accent-lm text-primary-lm hover:bg-hover-btn-lm"
//               >
//                 Save
//               </Button>
//             </DialogFooter>
//           </DialogContent>
//         </Dialog>

//         {/* Contact Edit Dialog */}
//         <Dialog open={contactOpen} onOpenChange={setContactOpen}>
//           <DialogContent className="bg-primary-lm lg:border border-stroke-grey text-text-lm">
//             <DialogHeader>
//               <DialogTitle>{"Edit Contact"}</DialogTitle>
//             </DialogHeader>
//             <div className="lg:space-y-3">
//               <Select
//                 value={contactDraftType}
//                 onValueChange={(v: Contact["type"]) => setContactDraftType(v)}
//               >
//                 <SelectTrigger className="border-stroke-grey bg-primary-lm text-text-lm">
//                   <SelectValue placeholder="Select type" />
//                 </SelectTrigger>
//                 <SelectContent className="bg-primary-lm text-text-lm lg:border border-stroke-grey">
//                   <SelectItem value="gmail">Gmail</SelectItem>
//                   <SelectItem value="linkedin">LinkedIn</SelectItem>
//                   <SelectItem value="github">GitHub</SelectItem>
//                   <SelectItem value="facebook">Facebook</SelectItem>
//                 </SelectContent>
//               </Select>
//               <Input
//                 value={contactDraftId}
//                 onChange={(e) => setContactDraftId(e.target.value)}
//                 placeholder="Email, handle or URL"
//                 className="border-stroke-grey bg-primary-lm text-text-lm placeholder:text-text-lighter-lm"
//               />
//             </div>
//             <DialogFooter>
//               <Button
//                 onClick={() => setContactOpen(false)}
//                 className="lg:px-4 lg:py-2 lg:rounded-md lg:border border-stroke-grey bg-primary-lm text-text-lm"
//               >
//                 Cancel
//               </Button>
//               <Button
//                 onClick={saveContactEdit}
//                 className="lg:px-4 lg:py-2 lg:rounded-md bg-accent-lm text-primary-lm hover:bg-hover-btn-lm"
//               >
//                 Save
//               </Button>
//             </DialogFooter>
//           </DialogContent>
//         </Dialog>

//         {/* Slide-in Message Drawer */}
//         {chatTarget && (
//           <MessageDrawer
//             open={messageOpen}
//             onOpenChange={setMessageOpen}
//             userId={chatTarget.id}
//             userName={chatTarget.name}
//             avatarSrc={viewedUser.avatar || userImg}
//           />
//         )}
//       </div>
//     </div>
//   );
// }

import placeholderUserImg from "@/assets/images/placeholderUser.png"; 
import { UpcomingEvents } from "@/components/UpcomingEvents";
import { useState, useEffect } from "react";
import InterestedPosts from "./components/InterestedPosts";
import { placeholderUser } from "@/mockData/placeholderUser";

const placeholderPost={
  text: "jsdkjdasjdjad"
};

//all contact icons
import Email from "@/assets/icons/email_icon.png";
import Github from "@/assets/icons/github_icon.svg";
import Whatsapp from "@/assets/icons/whatsapp_icon.svg";
import Facebook from "@/assets/icons/facebook_icon.svg";
import Instagram from "@/assets/icons/instagram_icon.png";
import Discord from "@/assets/icons/discord_icon.svg";
import LinkedIn from "@/assets/icons/linkedin_icon.svg";
import { LucidePencil, LucidePlus } from "lucide-react";
import { PostBody } from "@/components/PostBody";
import { Link } from "react-router";


export function UserProfile()
{
  const [interestedPosts, setInterestedPosts] = useState<InterestedItem[]>([]);
  const contactIcons = [Github, Whatsapp, LinkedIn, Discord, Email, Facebook, Instagram];

  return(
    <div className="lg:my-10 lg:px-10 lg:w-full lg:h-full flex lg:gap-10 lg:justify-center lg:items-start">
      <div className="flex flex-col lg:gap-5 lg:w-[70vw]"> {/*profile content*/}
        
        {/* profile picture, basic details and bio */}
        <div className="bg-primary-lm border border-stroke-grey lg:rounded-xl flex flex-col h-fit">
          <div className="w-full h-[30vh] bg-stroke-grey rounded-t-xl"></div>
          <div className="flex flex-col lg:ml-8">
            <div className="rounded-full lg:size-35 lg:mb-4 border-3 border-primary-lm lg:-mt-20 overflow-hidden">
              <img src={placeholderUserImg} className="object-cover lg:size-35 rounded-full"></img>
            </div>
            <h3 className="font-header">Aldkjskd</h3>
            <h6>20232039293</h6>
            <h6>CSE-23</h6>
            <p className="lg:my-3">Lorem ipsum fk u</p>
            <div className="flex lg:gap-3 flex-wrap lg:mb-5">
              <div className="flex lg:gap-2 items-center">
                <img src={Github} className="size-8"></img>
                <p>alksak.skl</p>
              </div>
            </div>
          </div>
        </div>

        {/* skills */}
        <div className="bg-primary-lm border border-stroke-grey lg:rounded-xl lg:p-8 flex flex-col h-fit">
          
          {/* skill header */}
          <div className="flex justify-between items-center">
            <h4 className="font-header">Skills</h4>   
            <div className="space-x-1">
              <button className="cursor-pointer">
                <LucidePlus className="size-7 hover:text-accent-lm transition duration-200"></LucidePlus>
              </button>
            </div>
          </div>

          {/* list of skills */}
          <div className="flex flex-col lg:gap-2 lg:mt-5">
            <div className="flex justify-between items-center">
              <h6>Skill 1</h6>
              <button>
                <LucidePencil className="size-5 cursor-pointer hover:bg-accent-lm transition duration-200"></LucidePencil>
              </button>
            </div>
            <hr className="border-stroke-grey"></hr>
          </div>
        </div>

        {/* interests */}
        <div className="bg-primary-lm border border-stroke-grey lg:rounded-xl lg:p-8 flex flex-col h-fit">
          
          {/* skill header */}
          <div className="flex justify-between items-center">
            <h4 className="font-header">Interests</h4>   
            <div className="space-x-1">
              <button className="cursor-pointer">
                <LucidePlus className="size-7 hover:text-accent-lm transition duration-200"></LucidePlus>
              </button>
            </div>
          </div>

          {/* list of skills */}
          <div className="flex flex-col lg:gap-2 lg:mt-5">
            <div className="flex justify-between items-center">
              <h6>Interest 1</h6>
              <button>
                <LucidePencil className="size-5 cursor-pointer hover:bg-accent-lm transition duration-200"></LucidePencil>
              </button>
            </div>
            <hr className="border-stroke-grey"></hr>
          </div>
        </div>

        <div className="bg-primary-lm border border-stroke-grey lg:rounded-xl lg:p-8 flex flex-col h-fit">
          <h4 className="font-header">Posts</h4>
          <div className="flex flex-col lg:gap-5 lg:mt-4">
            <UserPosts></UserPosts>
          </div>
        </div>

      </div>
      <div className="flex lg:flex-col lg:gap-5 lg:w-[20vw]">
        <UpcomingEvents></UpcomingEvents>
        <InterestedPosts items={interestedPosts}/>
      </div>
    </div>
  );
}


function UserPosts()
{
  return(
    <Link to="/">
      <div className="bg-secondary-lm hover:bg-hover-lm border border-stroke-grey hover:border-stroke-peach transition duration-200 lg:p-6 lg:rounded-lg cursor-pointer">
        <h5 className="font-header">Title</h5>
        <p>djhsjkhsjdhasjkdhkjadhkjahkahda</p>
      </div>
    </Link>
  );
}