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
import { useEffect, useMemo, useState } from "react";
import InterestedPosts from "./components/InterestedPosts";
import type { InterestedItem } from "./backend/interestedStore";
import crossBtnIcon from "@/assets/icons/cross_btn.svg";

import Github from "@/assets/icons/github_icon.svg";
import Facebook from "@/assets/icons/facebook_icon.svg";
import Instagram from "@/assets/icons/instagram_icon.png";
import Whatsapp from "@/assets/icons/whatsapp_icon.svg";
import LinkedIn from "@/assets/icons/linkedin_icon.svg";
import Email from "@/assets/icons/email_icon.png";
import Discord from "@/assets/icons/discord_icon.svg";

import { LucidePencil, LucidePlus } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";
import AddLookupItemModal, {
  type SkillsLookupItem,
} from "./components/AddLookupItemModal";

import { supabase } from "../../../../supabase/supabaseClient";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const rec = error as Record<string, unknown>;
    const msg = rec.message;
    const details = rec.details;
    const hint = rec.hint;
    const code = rec.code;

    const parts: string[] = [];
    if (typeof msg === "string" && msg.trim()) parts.push(msg.trim());
    if (typeof details === "string" && details.trim()) parts.push(details.trim());
    if (typeof hint === "string" && hint.trim()) parts.push(hint.trim());
    if (typeof code === "string" && code.trim()) parts.push(`Code: ${code.trim()}`);
    if (parts.length) return parts.join(" — ");
  }
  return "Unexpected error";
}

type UserInfoRow = {
  name: string | null;
  batch: number | null;
  department: string | null;
  student_id: string | null;
  departments_lookup?: {
    department_name: string | null;
  } | null;
};

type UserProfileRow = {
  bio: string | null;
  profile_picture_url: string | null;
  background_img_url: string | null;
};

type UserPostItem = {
  postId: string;
  type: string;
  title: string;
  description: string;
  createdAt: number;
};

type ContactPlatformRow = {
  id: number;
  platform: string;
};

type UserContactItem = {
  platformId: number;
  platform: string;
  contactLink: string;
};

type UserContactDraftItem = {
  key: string;
  platformId: number;
  contactLink: string;
};

const PROFILE_IMAGES_BUCKET = "profile_images";
const MAX_PROFILE_IMAGE_BYTES = 10 * 1024 * 1024;

function extForMime(mime: string) {
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/jpg") return "jpg";
  return "bin";
}

function generateUuidV4() {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();

  // RFC4122-ish fallback (not cryptographically perfect but fine for filenames)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = Math.floor(Math.random() * 16);
    const v = ch === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function uploadProfileImage(
  authUid: string,
  file: File
): Promise<string> {
  if (file.size > MAX_PROFILE_IMAGE_BYTES) {
    throw new Error("Image must be 10MB or smaller.");
  }
  if (!isAllowedImage(file)) {
    throw new Error("Only PNG, JPG, and JPEG files are allowed.");
  }

  const ext = extForMime(file.type);
  const fileName = `${generateUuidV4()}.${ext}`;
  const filePath = `${authUid}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(PROFILE_IMAGES_BUCKET)
    .upload(filePath, file, {
      upsert: false,
      contentType: file.type,
    });
  if (uploadError) {
    const msg = String((uploadError as unknown as { message?: unknown })?.message ?? "");
    if (msg.toLowerCase().includes("row-level security")) {
      throw new Error(
        "Upload blocked by Supabase Storage RLS (storage.objects). Add an INSERT policy for bucket 'profile_images' allowing authenticated users to upload their own objects."
      );
    }
    throw uploadError;
  }

  const { data: publicData } = supabase.storage
    .from(PROFILE_IMAGES_BUCKET)
    .getPublicUrl(filePath);

  return publicData.publicUrl;
}

function formatBatchLabel(profile: UserInfoRow | null): string {
  const deptName =
    profile?.departments_lookup?.department_name || profile?.department || "";
  const batchValue = profile?.batch ?? null;
  return deptName && batchValue ? `${deptName}-${batchValue}` : "";
}

const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg"] as const;
type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

function isAllowedImage(file: File): file is File & { type: AllowedImageType } {
  return ALLOWED_IMAGE_TYPES.includes(file.type as AllowedImageType);
}

function useObjectUrl(file: File | null): string | null {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  return url;
}

function normalizePlatform(text: string) {
  return text.trim().toLowerCase();
}

function getPlatformIconSrc(platform: string): string {
  const p = normalizePlatform(platform);

  // Exact values from contacts_platform_lookup (case-insensitive)
  if (p === "facebook") return Facebook;
  if (p === "instagram") return Instagram;
  if (p === "github") return Github;
  if (p === "email") return Email;
  if (p === "whatsapp") return Whatsapp;
  if (p === "discord") return Discord;
  if (p === "linkedin") return LinkedIn;

  if (p.includes("github")) return Github;
  if (p.includes("linked") || p.includes("linkedin")) return LinkedIn;
  if (p.includes("facebook")) return Facebook;
  if (p.includes("instagram")) return Instagram;
  if (p.includes("whatsapp") || p.includes("wa")) return Whatsapp;
  if (p.includes("discord")) return Discord;
  if (p.includes("mail") || p.includes("email") || p.includes("gmail")) return Email;

  // Safe fallback
  return Email;
}

function displayContactLinkText(link: string) {
  const trimmed = link.trim();
  if (!trimmed) return "";
  if (/^mailto:/i.test(trimmed)) return trimmed.replace(/^mailto:/i, "");
  try {
    const u = new URL(trimmed);
    // Show hostname + last path segment where possible
    const segments = u.pathname.split("/").filter(Boolean);
    const tail = segments.length ? `/${segments[segments.length - 1]}` : "";
    return `${u.hostname}${tail}`;
  } catch {
    return trimmed;
  }
}

function toExternalContactHref(platform: string, link: string) {
  const raw = link.trim();
  if (!raw) return "#";

  const p = normalizePlatform(platform);
  if (p === "email") {
    if (/^mailto:/i.test(raw)) return raw;
    return `mailto:${raw}`;
  }

  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^mailto:/i.test(raw)) return raw;

  // Prevent relative navigation like http://localhost:5173/github.com/...
  const noLeadingSlashes = raw.replace(/^\/+/, "");
  return `https://${noLeadingSlashes}`;
}


export function UserProfile()
{
  const navigate = useNavigate();
  const { studentId: routeStudentId } = useParams();

  const [interestedPosts] = useState<InterestedItem[]>([]);

  const [skillsLookup, setSkillsLookup] = useState<SkillsLookupItem[]>([]);
  const [skillsLookupLoading, setSkillsLookupLoading] = useState(false);
  const [skillsLookupError, setSkillsLookupError] = useState<string>("");

  const [skills, setSkills] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);

  const [contactPlatforms, setContactPlatforms] = useState<ContactPlatformRow[]>([]);
  const [contactPlatformsLoading, setContactPlatformsLoading] = useState(false);
  const [contactPlatformsError, setContactPlatformsError] = useState<string>("");

  const [contacts, setContacts] = useState<UserContactItem[]>([]);

  const [userPosts, setUserPosts] = useState<UserPostItem[]>([]);
  const [userPostsLoading, setUserPostsLoading] = useState(false);
  const [userPostsError, setUserPostsError] = useState<string>("");

  const [editingSkillIndex, setEditingSkillIndex] = useState<number | null>(null);
  const [editingSkillValue, setEditingSkillValue] = useState<string>("");
  const [skillEditError, setSkillEditError] = useState<string>("");

  const [editingInterestIndex, setEditingInterestIndex] = useState<number | null>(null);
  const [editingInterestValue, setEditingInterestValue] = useState<string>("");
  const [interestEditError, setInterestEditError] = useState<string>("");

  const [addLookupModalOpen, setAddLookupModalOpen] = useState(false);
  const [addLookupModalMode, setAddLookupModalMode] = useState<
    "skills" | "interests"
  >("skills");

  // Background image state
  const [backgroundModalOpen, setBackgroundModalOpen] = useState(false);
  const [backgroundDraftFile, setBackgroundDraftFile] = useState<File | null>(null);
  const [backgroundFileError, setBackgroundFileError] = useState<string>("");
  const [backgroundSaveError, setBackgroundSaveError] = useState<string>("");
  const [backgroundSaving, setBackgroundSaving] = useState(false);
  const [backgroundImgUrl, setBackgroundImgUrl] = useState<string | null>(null);
  const backgroundDraftUrl = useObjectUrl(backgroundDraftFile);

  // Profile state
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileDraftFile, setProfileDraftFile] = useState<File | null>(null);
  const [profileFileError, setProfileFileError] = useState<string>("");
  const [profileSaveError, setProfileSaveError] = useState<string>("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [profilePictureRemove, setProfilePictureRemove] = useState(false);
  const profileImageUrl = useObjectUrl(profileImageFile);
  const profileDraftUrl = useObjectUrl(profileDraftFile);

  const [displayName, setDisplayName] = useState<string>("Loading...");
  const [studentId, setStudentId] = useState<string>("");
  const [batchLabel, setBatchLabel] = useState<string>("");

  const [currentAuthUid, setCurrentAuthUid] = useState<string | null>(null);
  const [viewedAuthUid, setViewedAuthUid] = useState<string | null>(null);

  const [bio, setBio] = useState<string>("");
  
  const [selectedContactPlatformId, setSelectedContactPlatformId] = useState<string>("");
  const [contactPickerOpen, setContactPickerOpen] = useState<boolean>(false);
  const [contactsDraft, setContactsDraft] = useState<UserContactDraftItem[]>([]);
  const [contactsDraftError, setContactsDraftError] = useState<string>("");

  const [nameDraft, setNameDraft] = useState<string>(displayName);
  const [bioDraft, setBioDraft] = useState<string>(bio);

  const effectiveBackgroundPreviewUrl = backgroundDraftUrl ?? backgroundImgUrl;
  const effectiveProfilePreviewUrl =
    profilePictureRemove
      ? placeholderUserImg
      : profileDraftUrl ?? profileImageUrl ?? profilePictureUrl ?? placeholderUserImg;

  const canEdit = !!currentAuthUid && !!viewedAuthUid && currentAuthUid === viewedAuthUid;

  const anyModalOpen = backgroundModalOpen || profileModalOpen;

  useEffect(() => {
    let mounted = true;

    function isUuid(value: string) {
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value
      );
    }

    async function loadUserInfo() {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        const authUid = userData.user?.id;

        setCurrentAuthUid(authUid ?? null);

        if (!mounted) return;

        if (!authUid) {
          setDisplayName("Guest");
          setStudentId("");
          setBatchLabel("");
          setBio("");
          setProfilePictureUrl(null);
          setBackgroundImgUrl(null);
          setSkills([]);
          setInterests([]);
          setEditingSkillIndex(null);
          setEditingInterestIndex(null);
          setUserPosts([]);
          setUserPostsError("");
          setContacts([]);
          setContactsDraft([]);
          setContactsDraftError("");
          setSelectedContactPlatformId("");
          setViewedAuthUid(null);
          return;
        }

        let targetAuthUid = authUid;
        if (routeStudentId) {
          const routeValue = routeStudentId.trim();
          // Prefer resolving via student_id, fallback to auth_uid if the param looks like a UUID.
          const { data: byStudent } = await supabase
            .from("user_info")
            .select("auth_uid")
            .eq("student_id", routeValue)
            .maybeSingle();

          let resolvedAuthUid = (byStudent as unknown as { auth_uid?: unknown } | null)?.auth_uid;

          if (!resolvedAuthUid && isUuid(routeValue)) {
            const { data: byAuth } = await supabase
              .from("user_info")
              .select("auth_uid")
              .eq("auth_uid", routeValue)
              .maybeSingle();
            resolvedAuthUid = (byAuth as unknown as { auth_uid?: unknown } | null)?.auth_uid;
          }

          if (typeof resolvedAuthUid === "string" && resolvedAuthUid) {
            targetAuthUid = resolvedAuthUid;
            if (targetAuthUid === authUid) {
              // Don't allow viewing your own profile through the param route.
              navigate("/profile", { replace: true });
            }
          } else {
            // Unknown user — show empty profile with edits disabled.
            setViewedAuthUid(null);
            setDisplayName("User not found");
            setStudentId(routeValue);
            setBatchLabel("");
            setBio("");
            setProfilePictureUrl(null);
            setBackgroundImgUrl(null);
            setSkills([]);
            setInterests([]);
            setUserPosts([]);
            setUserPostsError("");
            setContacts([]);
            setEditingSkillIndex(null);
            setEditingInterestIndex(null);
            return;
          }
        }

        setViewedAuthUid(targetAuthUid);

        if (targetAuthUid !== authUid) {
          setBackgroundModalOpen(false);
          setProfileModalOpen(false);
          setAddLookupModalOpen(false);
          setEditingSkillIndex(null);
          setEditingInterestIndex(null);
        }

        setUserPostsLoading(true);
        setUserPostsError("");

        const [userInfoRes, userProfileRes, userSkillsRes, userInterestsRes, userContactsRes] = await Promise.all([
          supabase
            .from("user_info")
            .select(
              "name,batch,department,student_id,departments_lookup(department_name)"
            )
            .eq("auth_uid", targetAuthUid)
            .maybeSingle(),
          supabase
            .from("user_profile")
            .select("bio,profile_picture_url,background_img_url")
            .eq("auth_uid", targetAuthUid)
            .maybeSingle(),
          supabase
            .from("user_skills")
            .select("skill_id")
            .eq("auth_uid", targetAuthUid),
          supabase
            .from("user_interests")
            .select("interest_id")
            .eq("auth_uid", targetAuthUid),
          supabase
            .from("user_contacts")
            .select("platform_id,contact_link,contacts_platform_lookup(platform)")
            .eq("auth_uid", targetAuthUid),
        ]);

        if (!mounted) return;

        if (userInfoRes.error) throw userInfoRes.error;
        if (userProfileRes.error) throw userProfileRes.error;
        if (userSkillsRes.error) throw userSkillsRes.error;
        if (userInterestsRes.error) throw userInterestsRes.error;
        if (userContactsRes.error) throw userContactsRes.error;

        const info = userInfoRes.data as unknown as UserInfoRow | null;
        const profile = userProfileRes.data as unknown as UserProfileRow | null;

        const skillIds: number[] = [];
        for (const row of (userSkillsRes.data ?? []) as unknown as Array<Record<string, unknown>>) {
          const idVal = row.skill_id;
          if (typeof idVal === "number") skillIds.push(idVal);
        }

        const interestIds: number[] = [];
        for (const row of (userInterestsRes.data ?? []) as unknown as Array<Record<string, unknown>>) {
          const idVal = row.interest_id;
          if (typeof idVal === "number") interestIds.push(idVal);
        }

        const allIds = Array.from(new Set([...skillIds, ...interestIds]));
        const lookupById = new Map<number, string>();
        if (allIds.length) {
          const { data: lookupData, error: lookupError } = await supabase
            .from("skills_lookup")
            .select("id, skill")
            .in("id", allIds);
          if (lookupError) throw lookupError;

          for (const row of (lookupData ?? []) as unknown as Array<Record<string, unknown>>) {
            const idVal = row.id;
            const skillVal = row.skill;
            if (typeof idVal === "number" && typeof skillVal === "string") {
              lookupById.set(idVal, skillVal);
            }
          }
        }

        const loadedSkills = skillIds
          .map((id) => lookupById.get(id))
          .filter((x): x is string => typeof x === "string" && x.trim().length > 0);

        const loadedInterests = interestIds
          .map((id) => lookupById.get(id))
          .filter((x): x is string => typeof x === "string" && x.trim().length > 0);

        const loadedContacts: UserContactItem[] = [];
        for (const row of (userContactsRes.data ?? []) as unknown as Array<Record<string, unknown>>) {
          const platformIdVal = row.platform_id;
          const linkVal = row.contact_link;
          const lookupObj = row.contacts_platform_lookup as Record<string, unknown> | null | undefined;
          const platformVal = lookupObj?.platform;

          if (typeof platformIdVal === "number" && typeof linkVal === "string") {
            loadedContacts.push({
              platformId: platformIdVal,
              platform: typeof platformVal === "string" ? platformVal : "",
              contactLink: linkVal,
            });
          }
        }

        const { data: postsRows, error: postsError } = await supabase
          .from("user_posts")
          .select(
            "post_id, all_posts!user_posts_post_id_fkey(post_id,type,title,description,created_at)"
          )
          .eq("auth_uid", targetAuthUid);
        if (postsError) throw postsError;

        const loadedPosts: UserPostItem[] = [];
        for (const row of (postsRows ?? []) as unknown as Array<Record<string, unknown>>) {
          const postObj = row.all_posts as Record<string, unknown> | null | undefined;
          const postId = postObj?.post_id;
          const type = postObj?.type;
          const title = postObj?.title;
          const description = postObj?.description;
          const createdAtRaw = postObj?.created_at;

          if (
            typeof postId === "string" &&
            typeof type === "string" &&
            typeof title === "string" &&
            typeof description === "string"
          ) {
            const createdAt =
              typeof createdAtRaw === "string" ? Date.parse(createdAtRaw) : 0;
            loadedPosts.push({
              postId,
              type,
              title,
              description,
              createdAt: Number.isFinite(createdAt) ? createdAt : 0,
            });
          }
        }

        setDisplayName(info?.name?.trim() || "User");
        setStudentId(info?.student_id?.trim() || "");
        setBatchLabel(formatBatchLabel(info));
        setBio(profile?.bio ?? "");
        setProfilePictureUrl(profile?.profile_picture_url ?? null);
        setBackgroundImgUrl(profile?.background_img_url ?? null);
        setSkills(loadedSkills);
        setInterests(loadedInterests);
        setContacts(loadedContacts);
        setUserPosts(loadedPosts.sort((a, b) => b.createdAt - a.createdAt));
      } catch (e: unknown) {
        if (!mounted) return;
        console.error("Failed to load user_info:", e);
        setDisplayName("User");
        setStudentId("");
        setBatchLabel("");
        setBio("");
        setProfilePictureUrl(null);
        setBackgroundImgUrl(null);
        setSkills([]);
        setInterests([]);
        setEditingSkillIndex(null);
        setEditingInterestIndex(null);
        setUserPosts([]);
        setUserPostsError(getErrorMessage(e));
        setContacts([]);
        setViewedAuthUid(null);
      } finally {
        if (mounted) setUserPostsLoading(false);
      }
    }

    loadUserInfo();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      loadUserInfo();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate, routeStudentId]);

  useEffect(() => {
    let alive = true;

    async function loadContactPlatforms() {
      setContactPlatformsLoading(true);
      setContactPlatformsError("");
      try {
        const { data, error } = await supabase
          .from("contacts_platform_lookup")
          .select("id, platform")
          .order("platform", { ascending: true });

        if (error) throw error;
        if (!alive) return;

        const parsed: ContactPlatformRow[] = [];
        for (const row of (data ?? []) as unknown as Array<Record<string, unknown>>) {
          const idVal = row.id;
          const platformVal = row.platform;
          if (typeof idVal === "number" && typeof platformVal === "string") {
            parsed.push({ id: idVal, platform: platformVal });
          }
        }
        setContactPlatforms(parsed);
      } catch (e: unknown) {
        if (alive) setContactPlatformsError(getErrorMessage(e));
      } finally {
        if (alive) setContactPlatformsLoading(false);
      }
    }

    loadContactPlatforms();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadSkillsLookup() {
      setSkillsLookupLoading(true);
      setSkillsLookupError("");
      try {
        const { data, error } = await supabase
          .from("skills_lookup")
          .select("id, skill")
          .order("skill", { ascending: true });

        if (error) throw error;
        if (alive) {
          const parsed: SkillsLookupItem[] = [];
          for (const row of data ?? []) {
            const rec = row as Record<string, unknown>;
            const idValue = rec.id;
            const skillValue = rec.skill;

            if (typeof idValue === "number" && typeof skillValue === "string") {
              parsed.push({ id: idValue, skill: skillValue });
            }
          }
          setSkillsLookup(parsed);
        }
      } catch (e: unknown) {
        if (alive) setSkillsLookupError(getErrorMessage(e));
      } finally {
        if (alive) setSkillsLookupLoading(false);
      }
    }

    loadSkillsLookup();
    return () => {
      alive = false;
    };
  }, []);

  function openAddSkillsModal() {
    if (!canEdit) return;
    setAddLookupModalMode("skills");
    setAddLookupModalOpen(true);
  }

  function openAddInterestsModal() {
    if (!canEdit) return;
    setAddLookupModalMode("interests");
    setAddLookupModalOpen(true);
  }

  function postPath(type: string, postId: string) {
    const t = type.trim().toLowerCase();
    const base = t === "lostfound" ? "lost-and-found" : t;
    return `/${base}/${postId}`;
  }

  function normalizeText(text: string) {
    return text.trim().toLowerCase();
  }

  function startEditSkill(index: number) {
    if (!canEdit) return;
    setSkillEditError("");
    setEditingSkillIndex(index);
    setEditingSkillValue(skills[index] ?? "");
  }

  function cancelEditSkill() {
    setEditingSkillIndex(null);
    setEditingSkillValue("");
    setSkillEditError("");
  }

  async function saveSkillEdit(index: number) {
    if (!canEdit) {
      setSkillEditError("You can only edit your own profile.");
      return;
    }
    const nextValue = editingSkillValue.trim();
    if (!nextValue) {
      setSkillEditError("Skill cannot be empty.");
      return;
    }

    const currentValue = skills[index];
    if (!currentValue) return;
    if (normalizeText(currentValue) === normalizeText(nextValue)) {
      cancelEditSkill();
      return;
    }

    const oldLookup = skillsLookup.find(
      (x) => normalizeText(x.skill) === normalizeText(currentValue)
    );
    if (!oldLookup) {
      setSkillEditError("Could not find this skill in lookup.");
      return;
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const authUid = authData.user?.id;
      if (!authUid) {
        setSkillEditError("You need to be logged in to update this.");
        return;
      }

      let newLookup = skillsLookup.find(
        (x) => normalizeText(x.skill) === normalizeText(nextValue)
      );

      if (!newLookup) {
        const { data: inserted, error: insertLookupError } = await supabase
          .from("skills_lookup")
          .insert({ skill: nextValue })
          .select("id, skill")
          .single();
        if (insertLookupError) throw insertLookupError;

        const rec = inserted as unknown as Record<string, unknown>;
        const idValue = rec.id;
        const skillValue = rec.skill;
        if (typeof idValue !== "number" || typeof skillValue !== "string") {
          throw new Error("Failed to create lookup entry.");
        }
        newLookup = { id: idValue, skill: skillValue };
        setSkillsLookup((prev) =>
          prev.some((p) => p.id === newLookup!.id) ? prev : [...prev, newLookup!]
        );
      }

      const { data: existing, error: existingError } = await supabase
        .from("user_skills")
        .select("id")
        .eq("auth_uid", authUid)
        .eq("skill_id", newLookup.id)
        .limit(1);
      if (existingError) throw existingError;
      if (existing && existing.length) {
        setSkillEditError("You already have this skill.");
        return;
      }

      const { error: updateError } = await supabase
        .from("user_skills")
        .update({ skill_id: newLookup.id })
        .eq("auth_uid", authUid)
        .eq("skill_id", oldLookup.id);
      if (updateError) throw updateError;

      setSkills((prev) => prev.map((s, i) => (i === index ? newLookup!.skill : s)));
      cancelEditSkill();
    } catch (e: unknown) {
      setSkillEditError(getErrorMessage(e));
    }
  }

  function startEditInterest(index: number) {
    if (!canEdit) return;
    setInterestEditError("");
    setEditingInterestIndex(index);
    setEditingInterestValue(interests[index] ?? "");
  }

  function cancelEditInterest() {
    setEditingInterestIndex(null);
    setEditingInterestValue("");
    setInterestEditError("");
  }

  async function saveInterestEdit(index: number) {
    if (!canEdit) {
      setInterestEditError("You can only edit your own profile.");
      return;
    }
    const nextValue = editingInterestValue.trim();
    if (!nextValue) {
      setInterestEditError("Interest cannot be empty.");
      return;
    }

    const currentValue = interests[index];
    if (!currentValue) return;
    if (normalizeText(currentValue) === normalizeText(nextValue)) {
      cancelEditInterest();
      return;
    }

    const oldLookup = skillsLookup.find(
      (x) => normalizeText(x.skill) === normalizeText(currentValue)
    );
    if (!oldLookup) {
      setInterestEditError("Could not find this interest in lookup.");
      return;
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const authUid = authData.user?.id;
      if (!authUid) {
        setInterestEditError("You need to be logged in to update this.");
        return;
      }

      let newLookup = skillsLookup.find(
        (x) => normalizeText(x.skill) === normalizeText(nextValue)
      );

      if (!newLookup) {
        const { data: inserted, error: insertLookupError } = await supabase
          .from("skills_lookup")
          .insert({ skill: nextValue })
          .select("id, skill")
          .single();
        if (insertLookupError) throw insertLookupError;

        const rec = inserted as unknown as Record<string, unknown>;
        const idValue = rec.id;
        const skillValue = rec.skill;
        if (typeof idValue !== "number" || typeof skillValue !== "string") {
          throw new Error("Failed to create lookup entry.");
        }
        newLookup = { id: idValue, skill: skillValue };
        setSkillsLookup((prev) =>
          prev.some((p) => p.id === newLookup!.id) ? prev : [...prev, newLookup!]
        );
      }

      const { data: existing, error: existingError } = await supabase
        .from("user_interests")
        .select("id")
        .eq("auth_uid", authUid)
        .eq("interest_id", newLookup.id)
        .limit(1);
      if (existingError) throw existingError;
      if (existing && existing.length) {
        setInterestEditError("You already have this interest.");
        return;
      }

      const { error: updateError } = await supabase
        .from("user_interests")
        .update({ interest_id: newLookup.id })
        .eq("auth_uid", authUid)
        .eq("interest_id", oldLookup.id);
      if (updateError) throw updateError;

      setInterests((prev) => prev.map((s, i) => (i === index ? newLookup!.skill : s)));
      cancelEditInterest();
    } catch (e: unknown) {
      setInterestEditError(getErrorMessage(e));
    }
  }

  function openBackgroundModal() {
    if (!canEdit) return;
    setBackgroundDraftFile(null);
    setBackgroundFileError("");
    setBackgroundSaveError("");
    setBackgroundModalOpen(true);
  }

  function closeBackgroundModal() {
    setBackgroundModalOpen(false);
    setBackgroundDraftFile(null);
    setBackgroundFileError("");
    setBackgroundSaveError("");
  }

  function openProfileModal() {
    if (!canEdit) return;
    setProfileDraftFile(null);
    setProfileFileError("");
    setProfileSaveError("");
    setProfilePictureRemove(false);
    setNameDraft(displayName);
    setBioDraft(bio);
    setContactsDraftError("");
    setSelectedContactPlatformId("");
    setContactPickerOpen(false);
    setContactsDraft(
      contacts.map((c) => ({
        key: generateUuidV4(),
        platformId: c.platformId,
        contactLink: c.contactLink,
      }))
    );
    setProfileModalOpen(true);
  }

  function closeProfileModal() {
    setProfileModalOpen(false);
    setProfileDraftFile(null);
    setProfileFileError("");
    setProfileSaveError("");
    setProfilePictureRemove(false);
  }

  useEffect(() => {
    if (!anyModalOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [anyModalOpen]);

  useEffect(() => {
    if (!anyModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeBackgroundModal();
        closeProfileModal();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [anyModalOpen]);

  const onPickBackgroundFile: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    if (file.size > MAX_PROFILE_IMAGE_BYTES) {
      setBackgroundFileError("Image must be 10MB or smaller.");
      setBackgroundDraftFile(null);
      return;
    }
    if (!isAllowedImage(file)) {
      setBackgroundFileError("Only PNG, JPG, and JPEG files are allowed.");
      setBackgroundDraftFile(null);
      return;
    }
    setBackgroundFileError("");
    setBackgroundDraftFile(file);
  };

  const onPickProfileFile: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    if (file.size > MAX_PROFILE_IMAGE_BYTES) {
      setProfileFileError("Image must be 10MB or smaller.");
      setProfileDraftFile(null);
      return;
    }
    if (!isAllowedImage(file)) {
      setProfileFileError("Only PNG, JPG, and JPEG files are allowed.");
      setProfileDraftFile(null);
      return;
    }
    setProfileFileError("");
    setProfileDraftFile(file);
    setProfilePictureRemove(false);
  };

  const confirmBackgroundImage = async () => {
    if (!canEdit) {
      setBackgroundSaveError("You can only edit your own profile.");
      return;
    }
    if (!backgroundDraftFile) return;
    setBackgroundSaving(true);
    setBackgroundSaveError("");
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      const authUid = userData.user?.id;
      if (!authUid) {
        setBackgroundSaveError("You need to be logged in to update this.");
        return;
      }

      const url = await uploadProfileImage(authUid, backgroundDraftFile);

      const { error: upsertError } = await supabase
        .from("user_profile")
        .upsert(
          {
            auth_uid: authUid,
            background_img_url: url,
          },
          { onConflict: "auth_uid" }
        );
      if (upsertError) throw upsertError;

      setBackgroundImgUrl(url);
      closeBackgroundModal();
    } catch (e: unknown) {
      setBackgroundSaveError(getErrorMessage(e));
    } finally {
      setBackgroundSaving(false);
    }
  };

  const removeBackgroundImage = async () => {
    if (!canEdit) {
      setBackgroundSaveError("You can only edit your own profile.");
      return;
    }
    setBackgroundSaving(true);
    setBackgroundSaveError("");
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      const authUid = userData.user?.id;
      if (!authUid) {
        setBackgroundSaveError("You need to be logged in to update this.");
        return;
      }

      const { error: upsertError } = await supabase
        .from("user_profile")
        .upsert(
          {
            auth_uid: authUid,
            background_img_url: null,
          },
          { onConflict: "auth_uid" }
        );
      if (upsertError) throw upsertError;

      setBackgroundImgUrl(null);
      closeBackgroundModal();
    } catch (e: unknown) {
      setBackgroundSaveError(getErrorMessage(e));
    } finally {
      setBackgroundSaving(false);
    }
  };

  const saveProfile = async () => {
    if (!canEdit) {
      setProfileSaveError("You can only edit your own profile.");
      return;
    }
    const nextName = nameDraft.trim();
    const nextBio = bioDraft.trim();

    if (!nextName) {
      setProfileSaveError("Name cannot be empty.");
      return;
    }

    setProfileSaving(true);
    setProfileSaveError("");
    setContactsDraftError("");
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      const authUid = userData.user?.id;
      if (!authUid) {
        setProfileSaveError("You need to be logged in to save changes.");
        return;
      }

      let nextProfilePictureUrl = profilePictureUrl;
      if (profilePictureRemove) {
        nextProfilePictureUrl = null;
      } else if (profileDraftFile) {
        nextProfilePictureUrl = await uploadProfileImage(authUid, profileDraftFile);
      }

      const { error: userInfoError } = await supabase
        .from("user_info")
        .upsert({ auth_uid: authUid, name: nextName }, { onConflict: "auth_uid" });
      if (userInfoError) throw userInfoError;

      const { error: userProfileError } = await supabase
        .from("user_profile")
        .upsert(
          {
            auth_uid: authUid,
            bio: nextBio ? nextBio : null,
            profile_picture_url: nextProfilePictureUrl,
          },
          { onConflict: "auth_uid" }
        );
      if (userProfileError) throw userProfileError;

      // Sync contacts into user_contacts
      const cleanedContacts = contactsDraft
        .map((c) => ({
          platformId: c.platformId,
          contactLink: c.contactLink.trim(),
        }))
        .filter((c) => Number.isFinite(c.platformId) && c.contactLink.length > 0);

      const { error: deleteContactsError } = await supabase
        .from("user_contacts")
        .delete()
        .eq("auth_uid", authUid);
      if (deleteContactsError) throw deleteContactsError;

      if (cleanedContacts.length) {
        const { error: insertContactsError } = await supabase
          .from("user_contacts")
          .insert(
            cleanedContacts.map((c) => ({
              platform_id: c.platformId,
              contact_link: c.contactLink,
            }))
          );
        if (insertContactsError) throw insertContactsError;
      }

      setDisplayName(nextName);
      setBio(nextBio);
      setProfilePictureUrl(nextProfilePictureUrl ?? null);
      setContacts(
        cleanedContacts.map((c) => ({
          platformId: c.platformId,
          platform: contactPlatforms.find((p) => p.id === c.platformId)?.platform ?? "",
          contactLink: c.contactLink,
        }))
      );

      if (profileDraftFile) {
        setProfileImageFile(profileDraftFile);
      }

      closeProfileModal();
    } catch (e: unknown) {
      setProfileSaveError(getErrorMessage(e));
    } finally {
      setProfileSaving(false);
    }
  };

  return(
    <div className="lg:my-10 lg:px-10 lg:w-full lg:h-full flex lg:gap-10 lg:justify-center lg:items-start">
      <AddLookupItemModal
        open={addLookupModalOpen}
        mode={addLookupModalMode}
        lookupItems={skillsLookup}
        lookupLoading={skillsLookupLoading}
        lookupError={skillsLookupError}
        onClose={() => setAddLookupModalOpen(false)}
        onLookupItemCreated={(item) =>
          setSkillsLookup((prev) =>
            prev.some((p) => p.id === item.id) ? prev : [...prev, item]
          )
        }
        onInserted={(value) => {
          if (addLookupModalMode === "skills") {
            setSkills((prev) => (prev.includes(value) ? prev : [...prev, value]));
          } else {
            setInterests((prev) =>
              prev.includes(value) ? prev : [...prev, value]
            );
          }
        }}
      />
      <div className="flex flex-col lg:gap-5 lg:w-[70vw]"> {/*profile content*/}
        
        {/* profile picture, basic details and bio */}
        <div className="bg-primary-lm border border-stroke-grey lg:rounded-xl flex flex-col h-fit">
          <div
            className="w-full h-[30vh] bg-stroke-grey rounded-t-xl relative overflow-hidden"
            style={
              backgroundImgUrl
                ? {
                    backgroundImage: `url(${backgroundImgUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : undefined
            }
          >
            {canEdit && (
              <button
                type="button"
                onClick={openBackgroundModal}
                aria-label="Edit background image"
                className="absolute lg:top-3 lg:right-3 rounded-full bg-primary-lm hover:bg-secondary-lm transition lg:p-2 border border-stroke-grey cursor-pointer"
              >
                <LucidePencil className="size-5" />
              </button>
            )}
          </div>
          <div className="flex flex-col lg:ml-8">
            <div className="rounded-full lg:size-35 lg:mb-4 border-3 border-primary-lm lg:-mt-20 relative">
              <img
                src={profileImageUrl ?? profilePictureUrl ?? placeholderUserImg}
                className="object-cover lg:size-35 rounded-full"
                alt="Profile"
              />
              {canEdit && (
                <button
                  type="button"
                  onClick={openProfileModal}
                  aria-label="Edit profile"
                  className="absolute lg:top-2 lg:-right-1 rounded-full bg-primary-lm hover:bg-secondary-lm transition lg:p-1.5 border border-stroke-grey cursor-pointer"
                >
                  <LucidePencil className="size-5" />
                </button>
              )}
            </div>
            <h3 className="font-header">{displayName}</h3>
            {!!studentId && <h6>{studentId}</h6>}
            {!!batchLabel && <h6>{batchLabel}</h6>}
            {!!bio && <p className="lg:my-3">{bio}</p>}
            <div className="flex lg:gap-3 flex-wrap lg:mb-5">
              {contacts
                .filter((c) => c.contactLink.trim())
                .map((c, idx) => {
                  const href = toExternalContactHref(c.platform, c.contactLink);
                  const isEmail = normalizePlatform(c.platform) === "email";

                  return (
                    <a
                      key={`${c.platformId}-${c.contactLink}-${idx}`}
                      href={href}
                      target={isEmail ? undefined : "_blank"}
                      rel={isEmail ? undefined : "noreferrer"}
                      className="flex lg:gap-2 items-center hover:opacity-80"
                      aria-label={c.platform ? `${c.platform} contact` : "Contact"}
                    >
                      <img src={getPlatformIconSrc(c.platform)} className="size-8" alt="Contact" />
                      <p className="max-w-[18rem] truncate">{displayContactLinkText(href)}</p>
                    </a>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Edit Background Image Modal */}
        {backgroundModalOpen && (
          <>
            <div
              className="fixed inset-0"
              style={{ zIndex: 10000, backgroundColor: "rgba(0,0,0,0.4)" }}
              onMouseDown={closeBackgroundModal}
            />
            <div
              className="fixed inset-0 flex items-center justify-center"
              style={{ zIndex: 10001 }}
            >
              <div
                className="bg-secondary-lm border-2 border-stroke-grey lg:rounded-xl lg:px-8 lg:py-6 lg:w-130 lg:relative lg:animate-slide-in max-h-[85vh] overflow-y-auto"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="lg:flex lg:justify-between lg:items-center">
                  <h4 className="lg:font-header text-text-lm lg:font-medium">Edit Background Image</h4>
                  <button type="button" onClick={closeBackgroundModal} className="cursor-pointer">
                    <img src={crossBtnIcon} alt="Close modal" />
                  </button>
                </div>

                <div className="flex flex-col gap-4 lg:mt-4">
                  {backgroundSaveError && (
                    <p className="text-sm text-accent-lm">{backgroundSaveError}</p>
                  )}

                  <div
                    className="w-full h-56 rounded-xl border border-stroke-grey bg-stroke-grey overflow-hidden"
                    style={
                      effectiveBackgroundPreviewUrl
                        ? {
                            backgroundImage: `url(${effectiveBackgroundPreviewUrl})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }
                        : undefined
                    }
                  />

                  <div className="flex flex-col gap-2">
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-start">
                        <input
                          id="background-image-file"
                          type="file"
                            accept="image/png,image/jpeg,image/jpg"
                          onChange={onPickBackgroundFile}
                          className="hidden"
                        />
                        <label
                          htmlFor="background-image-file"
                          className="px-4 py-2 rounded-md bg-accent-lm text-primary-lm disabled:opacity-50 cursor-pointer"
                        >
                          Choose file
                        </label>
                        {backgroundDraftFile?.name && (
                          <p className="mt-1 text-sm text-text-lighter-lm max-w-[20rem] wrap-break-word">
                            {backgroundDraftFile.name}
                          </p>
                        )}
                      </div>

                      {backgroundImgUrl && !backgroundDraftFile && (
                        <button
                          type="button"
                          onClick={removeBackgroundImage}
                          className="px-4 py-2 rounded-md border border-accent-lm text-accent-lm bg-primary-lm"
                          disabled={backgroundSaving}
                        >
                          Remove current
                        </button>
                      )}
                    </div>
                    {backgroundFileError && (
                      <p className="text-sm text-accent-lm">{backgroundFileError}</p>
                    )}

                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={closeBackgroundModal}
                      className="px-4 py-2 rounded-md border border-stroke-grey bg-primary-lm"
                      disabled={backgroundSaving}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={confirmBackgroundImage}
                      disabled={!backgroundDraftFile}
                      className="px-4 py-2 rounded-md bg-accent-lm text-primary-lm disabled:opacity-50"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Edit Profile Modal */}
        {profileModalOpen && (
          <>
            <div
              className="fixed inset-0"
              style={{ zIndex: 10000, backgroundColor: "rgba(0,0,0,0.7)" }}
              onMouseDown={closeProfileModal}
            />
            <div
              className="fixed inset-0 flex items-center justify-center"
              style={{ zIndex: 10001 }}
            >
              <div
                className="bg-secondary-lm border-2 border-stroke-grey lg:rounded-xl lg:px-8 lg:py-6 lg:w-130 lg:relative lg:animate-slide-in max-h-[85vh] overflow-y-auto"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="lg:flex lg:justify-between lg:items-center">
                  <h4 className="lg:font-header text-text-lm lg:font-medium">Edit Profile</h4>
                  <button type="button" onClick={closeProfileModal} className="cursor-pointer">
                    <img src={crossBtnIcon} alt="Close modal" />
                  </button>
                </div>

                <div className="flex flex-col gap-5 lg:mt-4">
                  {profileSaveError && (
                    <p className="text-sm text-accent-lm">{profileSaveError}</p>
                  )}

                  <div className="flex items-center gap-4">
                    <div className="size-24 rounded-full overflow-hidden border border-stroke-grey bg-stroke-grey">
                      <img
                        src={effectiveProfilePreviewUrl}
                        className="size-24 object-cover"
                        alt="Profile preview"
                      />
                    </div>
                    <div className="flex flex-col gap-2 flex-1">
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col items-start">
                          <input
                            id="profile-image-file"
                            type="file"
                            accept="image/png,image/jpeg,image/jpg"
                            onChange={onPickProfileFile}
                            className="hidden"
                          />
                          <label
                            htmlFor="profile-image-file"
                            className="px-4 py-2 rounded-md bg-accent-lm text-primary-lm text-sm disabled:opacity-50 cursor-pointer"
                          >
                            Choose file
                          </label>
                          {profileDraftFile?.name && (
                            <p className="mt-1 text-sm text-text-lighter-lm max-w-[20rem] wrap-break-word">
                              {profileDraftFile.name}
                            </p>
                          )}
                        </div>

                        {profilePictureUrl && !profileDraftFile && !profilePictureRemove && (
                          <button
                            type="button"
                            onClick={() => {
                              setProfilePictureRemove(true);
                              setProfileDraftFile(null);
                            }}
                            className="text-sm text-accent-lm border border-accent-lm rounded-md px-3 py-2"
                          >
                            Remove current
                          </button>
                        )}
                      </div>
                      {profileFileError && (
                        <p className="text-sm text-accent-lm">{profileFileError}</p>
                      )}
                      {profilePictureRemove && (
                        <p className="text-sm text-text-lighter-lm">Profile picture will be removed on Save.</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="font-medium">Name</label>
                      <input
                        value={nameDraft}
                        onChange={(e) => setNameDraft(e.target.value)}
                        className="w-full rounded-md border border-stroke-grey bg-primary-lm px-3 py-2"
                        placeholder="Your name"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="font-medium">Bio</label>
                      <textarea
                        value={bioDraft}
                        onChange={(e) => setBioDraft(e.target.value)}
                        className="w-full min-h-24 rounded-md border border-stroke-grey bg-primary-lm px-3 py-2"
                        placeholder="Write a short bio..."
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <label className="font-medium">Contacts</label>
                        <button
                          type="button"
                          onClick={() => {
                            setContactsDraftError("");
                            setSelectedContactPlatformId("");
                            setContactPickerOpen(true);
                          }}
                          className="rounded-md border border-stroke-grey bg-primary-lm px-3 py-2 hover:bg-hover-lm"
                          aria-label="Add contact"
                          disabled={contactPlatformsLoading}
                        >
                          <LucidePlus className="size-5" />
                        </button>
                      </div>
                      {contactsDraftError && (
                        <p className="text-sm text-accent-lm">{contactsDraftError}</p>
                      )}
                      {contactPlatformsError && (
                        <p className="text-sm text-accent-lm">{contactPlatformsError}</p>
                      )}
                      {!!contactsDraft.length && (
                        <div className="flex flex-col gap-2">
                          {contactsDraft.map((c) => {
                            const platformName =
                              contactPlatforms.find((p) => p.id === c.platformId)?.platform ??
                              contacts.find((x) => x.platformId === c.platformId)?.platform ??
                              "";
                            return (
                              <div
                                key={c.key}
                                className="flex items-center gap-2 rounded-md border border-stroke-grey bg-primary-lm px-3 py-2"
                              >
                                <img
                                  src={getPlatformIconSrc(platformName)}
                                  className="size-6"
                                  alt={platformName ? `${platformName} icon` : "Platform icon"}
                                />
                                <input
                                  value={c.contactLink}
                                  onChange={(e) => {
                                    const next = e.target.value;
                                    setContactsDraft((prev) =>
                                      prev.map((row) =>
                                        row.key === c.key ? { ...row, contactLink: next } : row
                                      )
                                    );
                                  }}
                                  className="flex-1 rounded-md border border-stroke-grey bg-primary-lm px-3 py-2"
                                  placeholder="Enter URL"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    {
                                      setContactsDraft((prev) =>
                                        prev.filter((row) => row.key !== c.key)
                                      );
                                      // Reset so user can re-select the same platform again later
                                      setSelectedContactPlatformId("");
                                      setContactsDraftError("");
                                    }
                                  }
                                  className="rounded-full p-1 hover:bg-hover-lm"
                                  aria-label="Remove contact"
                                >
                                  <img src={crossBtnIcon} className="size-4" alt="Remove" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {contactPickerOpen && (
                        <div className="flex gap-2 items-center">
                          <select
                            value={selectedContactPlatformId}
                            onChange={(e) => {
                              const raw = e.target.value;
                              setSelectedContactPlatformId(raw);
                              setContactsDraftError("");
                              const platformId = Number(raw);
                              if (!Number.isFinite(platformId)) return;

                              // Prevent duplicates for the same platform by default
                              if (contactsDraft.some((c) => c.platformId === platformId)) {
                                setContactsDraftError("You already added this platform.");
                                // Reset so selecting the same value again works
                                setSelectedContactPlatformId("");
                                return;
                              }

                              setContactsDraft((prev) => [
                                ...prev,
                                { key: generateUuidV4(), platformId, contactLink: "" },
                              ]);

                              // Hide the picker after one selection; user can click + to add another.
                              setSelectedContactPlatformId("");
                              setContactPickerOpen(false);
                            }}
                            className="rounded-md border border-stroke-grey bg-primary-lm px-3 py-2"
                            disabled={contactPlatformsLoading}
                          >
                            <option value="">Select platform…</option>
                            {contactPlatforms.map((p) => (
                              <option key={p.id} value={String(p.id)}>
                                {p.platform}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={closeProfileModal}
                      className="px-4 py-2 rounded-md border border-stroke-grey bg-primary-lm"
                      disabled={profileSaving}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={saveProfile}
                      className="px-4 py-2 rounded-md bg-accent-lm text-primary-lm"
                      disabled={profileSaving}
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* skills */}
        <div className="bg-primary-lm border border-stroke-grey lg:rounded-xl lg:p-8 flex flex-col h-fit">
          
          {/* skill header */}
          <div className="flex justify-between items-center">
            <h4 className="font-header">Skills</h4>   
            <div className="space-x-1">
              {canEdit && (
                <button type="button" onClick={openAddSkillsModal} className="cursor-pointer">
                  <LucidePlus className="size-7 hover:text-accent-lm transition duration-200"></LucidePlus>
                </button>
              )}
            </div>
          </div>

          {/* list of skills */}
          <div className="flex flex-col lg:gap-2 lg:mt-5">
            {skillEditError && (
              <p className="text-sm text-accent-lm">{skillEditError}</p>
            )}
            {skills.length ? (
              skills.map((skill, index) => (
                <div key={`${skill}-${index}`}>
                  <div className="flex justify-between items-center">
                    {editingSkillIndex === index ? (
                      <input
                        value={editingSkillValue}
                        onChange={(e) => setEditingSkillValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            saveSkillEdit(index);
                          }
                          if (e.key === "Escape") {
                            e.preventDefault();
                            cancelEditSkill();
                          }
                        }}
                        className="flex-1 mr-3 rounded-md border border-stroke-grey bg-primary-lm px-3 py-1"
                        autoFocus
                      />
                    ) : (
                      <h6>{skill}</h6>
                    )}
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() =>
                          editingSkillIndex === index
                            ? saveSkillEdit(index)
                            : startEditSkill(index)
                        }
                        aria-label={
                          editingSkillIndex === index ? "Save skill" : "Edit skill"
                        }
                      >
                        <LucidePencil className="size-5 cursor-pointer hover:text-accent-lm transition duration-200"></LucidePencil>
                      </button>
                    )}
                  </div>
                  {index !== skills.length - 1 && (
                    <hr className="border-stroke-grey"></hr>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-text-lighter-lm">No skills added yet.</p>
            )}
          </div>
        </div>

        {/* interests */}
        <div className="bg-primary-lm border border-stroke-grey lg:rounded-xl lg:p-8 flex flex-col h-fit">
          
          {/* skill header */}
          <div className="flex justify-between items-center">
            <h4 className="font-header">Interests</h4>   
            <div className="space-x-1">
              {canEdit && (
                <button type="button" onClick={openAddInterestsModal} className="cursor-pointer">
                  <LucidePlus className="size-7 hover:text-accent-lm transition duration-200"></LucidePlus>
                </button>
              )}
            </div>
          </div>

          {/* list of skills */}
          <div className="flex flex-col lg:gap-2 lg:mt-5">
            {interestEditError && (
              <p className="text-sm text-accent-lm">{interestEditError}</p>
            )}
            {interests.length ? (
              interests.map((interest, index) => (
                <div key={`${interest}-${index}`}>
                  <div className="flex justify-between items-center">
                    {editingInterestIndex === index ? (
                      <input
                        value={editingInterestValue}
                        onChange={(e) => setEditingInterestValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            saveInterestEdit(index);
                          }
                          if (e.key === "Escape") {
                            e.preventDefault();
                            cancelEditInterest();
                          }
                        }}
                        className="flex-1 mr-3 rounded-md border border-stroke-grey bg-primary-lm px-3 py-1"
                        autoFocus
                      />
                    ) : (
                      <h6>{interest}</h6>
                    )}
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() =>
                          editingInterestIndex === index
                            ? saveInterestEdit(index)
                            : startEditInterest(index)
                        }
                        aria-label={
                          editingInterestIndex === index
                            ? "Save interest"
                            : "Edit interest"
                        }
                      >
                        <LucidePencil className="size-5 cursor-pointer hover:text-accent-lm transition duration-200"></LucidePencil>
                      </button>
                    )}
                  </div>
                  {index !== interests.length - 1 && (
                    <hr className="border-stroke-grey"></hr>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-text-lighter-lm">No interests added yet.</p>
            )}
          </div>
        </div>

        <div className="bg-primary-lm border border-stroke-grey lg:rounded-xl lg:p-8 flex flex-col h-fit">
          <h4 className="font-header">Posts</h4>
          <div className="flex flex-col lg:gap-5 lg:mt-4">
            {userPostsLoading ? (
              <p className="text-sm text-text-lighter-lm">Loading…</p>
            ) : userPostsError ? (
              <p className="text-sm text-accent-lm">{userPostsError}</p>
            ) : userPosts.length === 0 ? (
              <p className="text-sm text-text-lighter-lm">No posts yet.</p>
            ) : (
              userPosts.map((p) => (
                <Link key={p.postId} to={postPath(p.type, p.postId)}>
                  <div className="bg-secondary-lm hover:bg-hover-lm border border-stroke-grey hover:border-stroke-peach transition duration-200 lg:p-6 lg:rounded-lg cursor-pointer">
                    <div className="text-xs text-text-lighter-lm">{p.type}</div>
                    <h5 className="font-header">{p.title}</h5>
                    <p className="text-sm text-text-lighter-lm">{p.description}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

      </div>
      <div className="flex flex-col lg:gap-5 lg:w-[20vw] lg:sticky lg:top-40 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
        <UpcomingEvents />
        <InterestedPosts items={interestedPosts} />
      </div>
    </div>
  );
}
