"use client";
import { useState, useEffect } from "react";
import {
  Plus,
  Mail,
  Github,
  Linkedin,
  Facebook,
  Pencil,
  Trash2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { UpcomingEvents } from "@/components/UpcomingEvents.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import userImg from "../../../assets/images/placeholderUser.png";
import MessageDrawer from "@/app/pages/Messaging/components/MessageDrawer";
import { useNavigate } from "react-router-dom";
import { openChatWith } from "@/app/pages/Messaging/backend/chatStore";
import UserProfileUpdate from "./components/UserProfileUpdate"; // new modal component
import { InterestedPosts } from "./components/InterestedPosts";
import { getInterested, subscribe } from "./backend/interestedStore";
import type { InterestedItem } from "./backend/interestedStore";
type Skill = { title: string; detail?: string };
type Contact = {
  type: "gmail" | "linkedin" | "github" | "facebook";
  id: string;
};
export function UserProfile() {
  const [messageOpen, setMessageOpen] = useState(false);
  const [chatTarget, setChatTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [skills, setSkills] = useState<Skill[]>([
    { title: "UI/UX", detail: "MIST INNOVATION CLUB" },
    { title: "Java, MySQL, C++", detail: "MIST Academic Courses" },
  ]);
  const [interests, setInterests] = useState<string[]>([
    "Robotics",
    "UI/UX",
    "CTF",
    "Automation",
    "Hackathon",
    "Arduino",
  ]);
  const [contacts, setContacts] = useState<Contact[]>([
    { type: "github", id: "alvi" },
    { type: "linkedin", id: "" },
  ]);
  // Bio state
  const [bio, setBio] = useState<string>("");
  const [bioOpen, setBioOpen] = useState(false);
  const [bioDraft, setBioDraft] = useState("");
  // Badges state (multiple)
  const [badges, setBadges] = useState<string[]>([]);
  const [badgeOpen, setBadgeOpen] = useState(false);
  const [badgeDraft, setBadgeDraft] = useState("");
  const [editingBadgeIndex, setEditingBadgeIndex] = useState<number | null>(
    null
  );
  // Badge inline actions visibility
  const [activeBadgeIndex, setActiveBadgeIndex] = useState<number | null>(null);
  // Skill inline actions visibility + edit dialog state
  const [activeSkillIndex, setActiveSkillIndex] = useState<number | null>(null);
  const [skillOpen, setSkillOpen] = useState(false);
  const [editingSkillIndex, setEditingSkillIndex] = useState<number | null>(
    null
  );
  const [skillDraftTitle, setSkillDraftTitle] = useState("");
  const [skillDraftDetail, setSkillDraftDetail] = useState("");
  // Interest inline actions visibility + edit dialog state
  const [activeInterestIndex, setActiveInterestIndex] = useState<number | null>(
    null
  );
  const [interestOpen, setInterestOpen] = useState(false);
  const [editingInterestIndex, setEditingInterestIndex] = useState<
    number | null
  >(null);
  const [interestDraft, setInterestDraft] = useState("");
  // Contact inline actions visibility + edit dialog state
  const [activeContactIndex, setActiveContactIndex] = useState<number | null>(
    null
  );
  const [contactOpen, setContactOpen] = useState(false);
  const [editingContactIndex, setEditingContactIndex] = useState<number | null>(
    null
  );
  const [contactDraftType, setContactDraftType] =
    useState<Contact["type"]>("github");
  const [contactDraftId, setContactDraftId] = useState("");
  // Upcoming events will be sourced from CollabHub preferences in future.
  // modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"skill" | "interest" | "contact">(
    "skill"
  );
  // Interested posts state (from CollabHub)
  const [interestedPosts, setInterestedPosts] = useState<InterestedItem[]>(() =>
    getInterested()
  );

  // Keep in sync with store
  useEffect(() => {
    const unsub = subscribe((items) => setInterestedPosts(items));
    return unsub;
  }, []);
  const openAddSkill = () => {
    setModalMode("skill");
    setModalOpen(true);
  };
  const openAddInterest = () => {
    setModalMode("interest");
    setModalOpen(true);
  };
  const openAddContact = () => {
    setModalMode("contact");
    setModalOpen(true);
  };
  const handleSaveSkill = (skill: Skill) => {
    setSkills((prev) => [...prev, skill]);
    setModalOpen(false);
  };
  const handleSaveInterest = (interest: string) => {
    const tag = interest.trim();
    if (!tag) return;
    setInterests((prev) => (prev.includes(tag) ? prev : [...prev, tag]));
    setModalOpen(false);
  };
  const handleSaveContact = (contact: Contact) => {
    const key = `${contact.type}:${contact.id.trim()}`;
    if (!contact.id.trim()) return;
    setContacts((prev) =>
      prev.some((c) => `${c.type}:${c.id}` === key) ? prev : [...prev, contact]
    );
    setModalOpen(false);
  };
  // Bio handlers
  const openBioEditor = () => {
    setBioDraft(bio);
    setBioOpen(true);
  };
  const saveBio = () => {
    setBio(bioDraft.trim());
    setBioOpen(false);
  };
  const removeBio = () => {
    setBio("");
  };
  // Badge handlers
  const openBadgeEditor = (index: number | null = null) => {
    setEditingBadgeIndex(index);
    setBadgeDraft(index !== null ? badges[index] : "");
    setBadgeOpen(true);
  };
  const saveBadge = () => {
    const text = badgeDraft.trim();
    if (!text) {
      setBadgeOpen(false);
      return;
    }
    if (editingBadgeIndex === null) {
      setBadges((prev) => [...prev, text]);
    } else {
      setBadges((prev) =>
        prev.map((b, i) => (i === editingBadgeIndex ? text : b))
      );
    }
    setBadgeOpen(false);
  };
  const removeBadge = (index: number) => {
    setBadges((prev) => prev.filter((_, i) => i !== index));
  };
  // Skill handlers
  const openSkillEditor = (index: number) => {
    setEditingSkillIndex(index);
    const s = skills[index];
    setSkillDraftTitle(s?.title ?? "");
    setSkillDraftDetail(s?.detail ?? "");
    setSkillOpen(true);
  };
  const saveSkillEdit = () => {
    const title = skillDraftTitle.trim();
    const detail = skillDraftDetail.trim();
    if (editingSkillIndex === null || !title) {
      setSkillOpen(false);
      return;
    }
    setSkills((prev) =>
      prev.map((s, i) => (i === editingSkillIndex ? { title, detail } : s))
    );
    setSkillOpen(false);
    setActiveSkillIndex(null);
  };
  const removeSkill = (index: number) => {
    setSkills((prev) => prev.filter((_, i) => i !== index));
    setActiveSkillIndex(null);
  };
  // Interest handlers
  const openInterestEditor = (index: number) => {
    setEditingInterestIndex(index);
    setInterestDraft(interests[index] ?? "");
    setInterestOpen(true);
  };
  const saveInterestEdit = () => {
    const text = interestDraft.trim();
    if (editingInterestIndex === null || !text) {
      setInterestOpen(false);
      return;
    }
    setInterests((prev) =>
      prev.map((t, i) => (i === editingInterestIndex ? text : t))
    );
    setInterestOpen(false);
    setActiveInterestIndex(null);
  };
  const removeInterest = (index: number) => {
    setInterests((prev) => prev.filter((_, i) => i !== index));
    setActiveInterestIndex(null);
  };
  // Contact handlers
  const openContactEditor = (index: number) => {
    setEditingContactIndex(index);
    const c = contacts[index];
    setContactDraftType(c?.type ?? "github");
    setContactDraftId(c?.id ?? "");
    setContactOpen(true);
  };
  const saveContactEdit = () => {
    const id = contactDraftId.trim();
    if (editingContactIndex === null || !id) {
      setContactOpen(false);
      return;
    }
    const type = contactDraftType;
    setContacts((prev) =>
      prev.map((c, i) => (i === editingContactIndex ? { type, id } : c))
    );
    setContactOpen(false);
    setActiveContactIndex(null);
  };
  const removeContact = (index: number) => {
    setContacts((prev) => prev.filter((_, i) => i !== index));
    setActiveContactIndex(null);
  };
  const contactLink = (c: Contact) => {
    const id = c.id.trim();
    const isUrl = /^https?:\/\//i.test(id);
    if (isUrl) return id;
    switch (c.type) {
      case "gmail":
        return `mailto:${id}`;
      case "linkedin":
        return `https://linkedin.com/in/${id}`;
      case "github":
        return `https://github.com/${id}`;
      case "facebook":
        return `https://facebook.com/${id}`;
      default:
        return "#";
    }
  };
  const contactDisplayText = (c: Contact) => {
    const id = c.id.trim();
    if (!id) return "";
    if (c.type === "gmail") return id; // show email address
    const isUrl = /^https?:\/\//i.test(id);
    if (!isUrl) return id; // if just a handle, show it directly
    try {
      const u = new URL(id);
      const segments = u.pathname.split("/").filter(Boolean);
      // Prefer the last non-empty path segment as the handle
      return segments.length ? segments[segments.length - 1] : id;
    } catch {
      return id;
    }
  };
  const ContactIcon = ({ type }: { type: Contact["type"] }) => {
    switch (type) {
      case "gmail":
        return <Mail className="h-4 w-4" />;
      case "linkedin":
        return <Linkedin className="h-4 w-4" />;
      case "github":
        return <Github className="h-4 w-4" />;
      case "facebook":
        return <Facebook className="h-4 w-4" />;
      default:
        return null;
    }
  };
  return (
    <div className="min-h-screen w-full bg-background-lm text-text-lm animate-fade-in pb-8">
      {/* Page-level Navbar to match the provided design */}
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 gap-6 items-start lg:grid-cols-[minmax(0,1fr)_350px]">
          {/* Main profile card */}
          <section className="rounded-2xl border border-stroke-grey bg-primary-lm shadow-sm animate-slide-in">
            {/* Header */}
            <div className="flex items-start gap-6 border-b border-stroke-grey p-6">
              <div className="relative">
                <div className="rounded-full border-4 border-stroke-peach p-1">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={userImg} />
                    <AvatarFallback>TT</AvatarFallback>
                  </Avatar>
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-extrabold tracking-tight text-text-lm">
                    Alvi Binte Zamil
                  </h1>
                  <Button
                    size="sm"
                    className="h-8 rounded-full bg-accent-lm px-3 text-primary-lm hover:bg-hover-btn-lm"
                    onClick={() => {
                      const profileUserId =
                        contacts.find((c) => c.type === "github" && c.id.trim())
                          ?.id || "alvi";
                      setChatTarget({
                        id: profileUserId,
                        name: "Alvi Binte Zamil",
                      });
                      setMessageOpen(true);
                    }}
                  >
                    Message
                  </Button>
                </div>
                <div className="mt-1 text-sm text-text-lighter-lm">CSE-23</div>
                <div className="text-sm text-text-lighter-lm">LEVEL-3</div>
                <div className="mt-3">
                  {/* Header row: title + add button */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-text-lm">
                      Badge
                    </h3>
                    <Button
                      size="sm"
                      onClick={() => openBadgeEditor(null)}
                      className="h-8 rounded-full border border-stroke-peach bg-primary-lm px-3 text-accent-lm hover:bg-hover-btn-lm"
                    >
                      <Plus className="h-4 w-4" />
                      Add
                    </Button>
                  </div>
                  {/* Content row: badges or empty state left-aligned */}
                  <div className="mt-2">
                    {badges.length ? (
                      <div className="flex flex-wrap items-center gap-2">
                        {badges.map((text, idx) => (
                          <div
                            key={`${text}-${idx}`}
                            className="inline-flex items-center gap-2"
                          >
                            <Badge
                              className="bg-secondary-lm text-accent-lm border border-stroke-peach rounded-full px-3 py-2 cursor-pointer"
                              onClick={() =>
                                setActiveBadgeIndex(
                                  activeBadgeIndex === idx ? null : idx
                                )
                              }
                            >
                              {text}
                            </Badge>
                            {activeBadgeIndex === idx && (
                              <>
                                <Button
                                  size="icon-sm"
                                  onClick={() => openBadgeEditor(idx)}
                                  className="rounded-full border border-stroke-peach bg-primary-lm text-accent-lm hover:bg-hover-btn-lm"
                                  aria-label="Edit badge"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon-sm"
                                  onClick={() => removeBadge(idx)}
                                  className="rounded-full bg-accent-lm text-primary-lm hover:bg-hover-btn-lm"
                                  aria-label="Remove badge"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-text-lighter-lm italic">
                        No badges yet.
                      </p>
                    )}
                  </div>
                </div>
                {/* Bio Section */}
                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-text-lm">
                      Bio
                    </h3>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={openBioEditor}
                        className="h-8 rounded-full border border-stroke-peach bg-primary-lm px-3 text-accent-lm hover:bg-hover-btn-lm"
                      >
                        <Pencil className="h-4 w-4" />
                        {bio ? "Edit" : "Add"}
                      </Button>
                      {bio && (
                        <Button
                          size="sm"
                          onClick={removeBio}
                          className="h-8 rounded-full bg-accent-lm px-3 text-primary-lm hover:bg-hover-btn-lm"
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                  {bio ? (
                    <p className="mt-2 text-sm text-text-lighter-lm whitespace-pre-wrap">
                      {bio}
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-text-lighter-lm italic">
                      No bio yet.
                    </p>
                  )}
                </div>
              </div>
            </div>
            {/* Skills */}
            <div className="border-b border-stroke-grey p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-text-lm">Skills</h2>
                <Button
                  onClick={openAddSkill}
                  className="h-8 rounded-full bg-accent-lm px-3 text-primary-lm hover:bg-hover-btn-lm"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="divide-y divide-stroke-grey rounded-xl border border-stroke-grey bg-secondary-lm">
                {skills.map((sk, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-4 px-4 py-4 cursor-pointer"
                    onClick={() =>
                      setActiveSkillIndex(activeSkillIndex === idx ? null : idx)
                    }
                  >
                    <div>
                      <div className="font-semibold text-text-lm">
                        {sk.title}
                      </div>
                      {sk.detail && (
                        <div className="text-sm text-text-lighter-lm">
                          {sk.detail}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {activeSkillIndex === idx && (
                        <>
                          <Button
                            size="icon-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openSkillEditor(idx);
                            }}
                            className="rounded-full border border-stroke-peach bg-primary-lm text-accent-lm hover:bg-hover-btn-lm"
                            aria-label="Edit skill"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeSkill(idx);
                            }}
                            className="rounded-full bg-accent-lm text-primary-lm hover:bg-hover-btn-lm"
                            aria-label="Remove skill"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Interested In */}
            <div className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-text-lm">
                  Interested In
                </h2>
                <Button
                  onClick={openAddInterest}
                  className="h-8 rounded-full bg-accent-lm px-3 text-primary-lm hover:bg-hover-btn-lm"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-3">
                {interests.map((tag, idx) => (
                  <div
                    key={`${tag}-${idx}`}
                    className="inline-flex items-center gap-2"
                  >
                    <span
                      className="rounded-full border border-stroke-peach bg-primary-lm px-4 py-1.5 text-sm font-semibold text-accent-lm shadow-sm cursor-pointer"
                      onClick={() =>
                        setActiveInterestIndex(
                          activeInterestIndex === idx ? null : idx
                        )
                      }
                    >
                      {tag}
                    </span>
                    {activeInterestIndex === idx && (
                      <>
                        <Button
                          size="icon-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openInterestEditor(idx);
                          }}
                          className="rounded-full border border-stroke-peach bg-primary-lm text-accent-lm hover:bg-hover-btn-lm"
                          aria-label="Edit interest"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeInterest(idx);
                          }}
                          className="rounded-full bg-accent-lm text-primary-lm hover:bg-hover-btn-lm"
                          aria-label="Remove interest"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
            {/* Contact */}
            <div className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-text-lm">Contact</h2>
                <Button
                  onClick={openAddContact}
                  className="h-8 rounded-full bg-accent-lm px-3 text-primary-lm hover:bg-hover-btn-lm"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-3">
                {contacts
                  .filter((c) => c.id.trim())
                  .map((c, idx) => (
                    <div
                      key={`${c.type}-${c.id}-${idx}`}
                      className="inline-flex items-center gap-2"
                    >
                      <a
                        href={contactLink(c)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-full border border-stroke-peach bg-primary-lm px-4 py-1.5 text-sm font-semibold text-accent-lm shadow-sm hover:bg-hover-btn-lm cursor-pointer"
                        aria-label={`${c.type} profile`}
                        onClick={(e) => {
                          e.preventDefault();
                          setActiveContactIndex(
                            activeContactIndex === idx ? null : idx
                          );
                        }}
                      >
                        <ContactIcon type={c.type} />
                        <span>{contactDisplayText(c)}</span>
                      </a>
                      {activeContactIndex === idx && (
                        <>
                          <Button
                            size="icon-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openContactEditor(idx);
                            }}
                            className="rounded-full border border-stroke-peach bg-primary-lm text-accent-lm hover:bg-hover-btn-lm"
                            aria-label="Edit contact"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeContact(idx);
                            }}
                            className="rounded-full bg-accent-lm text-primary-lm hover:bg-hover-btn-lm"
                            aria-label="Remove contact"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </section>
          {/* Sidebar: Upcoming Events (shared component) + Interested Posts */}
          <div className="hidden lg:flex lg:flex-col gap-6 w-[350px] lg:sticky lg:top-[96px] lg:max-h-[calc(100vh-96px)] lg:overflow-hidden">
            <UpcomingEvents />
            <InterestedPosts items={interestedPosts} />
          </div>
        </div>

        <UserProfileUpdate
          open={modalOpen}
          mode={modalMode}
          onClose={() => setModalOpen(false)}
          onSaveSkill={handleSaveSkill}
          onSaveInterest={handleSaveInterest}
          onSaveContact={handleSaveContact}
        />

        {/* Bio Edit Dialog */}
        <Dialog open={bioOpen} onOpenChange={setBioOpen}>
          <DialogContent className="bg-primary-lm border border-stroke-grey text-text-lm">
            <DialogHeader>
              <DialogTitle>{bio ? "Edit Bio" : "Add Bio"}</DialogTitle>
            </DialogHeader>
            <div>
              <Textarea
                value={bioDraft}
                onChange={(e) => setBioDraft(e.target.value)}
                placeholder="Write a short bio..."
                className="border-stroke-grey bg-primary-lm text-text-lm placeholder:text-text-lighter-lm"
              />
            </div>
            <DialogFooter>
              <Button
                onClick={() => setBioOpen(false)}
                className="px-4 py-2 rounded-md border border-stroke-grey bg-primary-lm text-text-lm"
              >
                Cancel
              </Button>
              <Button
                onClick={saveBio}
                className="px-4 py-2 rounded-md bg-accent-lm text-primary-lm hover:bg-hover-btn-lm"
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Badge Edit Dialog */}
        <Dialog open={badgeOpen} onOpenChange={setBadgeOpen}>
          <DialogContent className="bg-primary-lm border border-stroke-grey text-text-lm">
            <DialogHeader>
              <DialogTitle>
                {editingBadgeIndex !== null ? "Edit Badge" : "Add Badge"}
              </DialogTitle>
            </DialogHeader>
            <div>
              <Input
                value={badgeDraft}
                onChange={(e) => setBadgeDraft(e.target.value)}
                placeholder="Badge text..."
                className="border-stroke-grey bg-primary-lm text-text-lm placeholder:text-text-lighter-lm"
              />
            </div>
            <DialogFooter>
              <Button
                onClick={() => setBadgeOpen(false)}
                className="px-4 py-2 rounded-md border border-stroke-grey bg-primary-lm text-text-lm"
              >
                Cancel
              </Button>
              <Button
                onClick={saveBadge}
                className="px-4 py-2 rounded-md bg-accent-lm text-primary-lm hover:bg-hover-btn-lm"
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Skill Edit Dialog */}
        <Dialog open={skillOpen} onOpenChange={setSkillOpen}>
          <DialogContent className="bg-primary-lm border border-stroke-grey text-text-lm">
            <DialogHeader>
              <DialogTitle>{"Edit Skill"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                value={skillDraftTitle}
                onChange={(e) => setSkillDraftTitle(e.target.value)}
                placeholder="Skill title..."
                className="border-stroke-grey bg-primary-lm text-text-lm placeholder:text-text-lighter-lm"
              />
              <Input
                value={skillDraftDetail}
                onChange={(e) => setSkillDraftDetail(e.target.value)}
                placeholder="Detail (optional)"
                className="border-stroke-grey bg-primary-lm text-text-lm placeholder:text-text-lighter-lm"
              />
            </div>
            <DialogFooter>
              <Button
                onClick={() => setSkillOpen(false)}
                className="px-4 py-2 rounded-md border border-stroke-grey bg-primary-lm text-text-lm"
              >
                Cancel
              </Button>
              <Button
                onClick={saveSkillEdit}
                className="px-4 py-2 rounded-md bg-accent-lm text-primary-lm hover:bg-hover-btn-lm"
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Interest Edit Dialog */}
        <Dialog open={interestOpen} onOpenChange={setInterestOpen}>
          <DialogContent className="bg-primary-lm border border-stroke-grey text-text-lm">
            <DialogHeader>
              <DialogTitle>{"Edit Interest"}</DialogTitle>
            </DialogHeader>
            <div>
              <Input
                value={interestDraft}
                onChange={(e) => setInterestDraft(e.target.value)}
                placeholder="Interest text..."
                className="border-stroke-grey bg-primary-lm text-text-lm placeholder:text-text-lighter-lm"
              />
            </div>
            <DialogFooter>
              <Button
                onClick={() => setInterestOpen(false)}
                className="px-4 py-2 rounded-md border border-stroke-grey bg-primary-lm text-text-lm"
              >
                Cancel
              </Button>
              <Button
                onClick={saveInterestEdit}
                className="px-4 py-2 rounded-md bg-accent-lm text-primary-lm hover:bg-hover-btn-lm"
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Contact Edit Dialog */}
        <Dialog open={contactOpen} onOpenChange={setContactOpen}>
          <DialogContent className="bg-primary-lm border border-stroke-grey text-text-lm">
            <DialogHeader>
              <DialogTitle>{"Edit Contact"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Select
                value={contactDraftType}
                onValueChange={(v: Contact["type"]) => setContactDraftType(v)}
              >
                <SelectTrigger className="border-stroke-grey bg-primary-lm text-text-lm">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-primary-lm text-text-lm border border-stroke-grey">
                  <SelectItem value="gmail">Gmail</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="github">GitHub</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={contactDraftId}
                onChange={(e) => setContactDraftId(e.target.value)}
                placeholder="Email, handle or URL"
                className="border-stroke-grey bg-primary-lm text-text-lm placeholder:text-text-lighter-lm"
              />
            </div>
            <DialogFooter>
              <Button
                onClick={() => setContactOpen(false)}
                className="px-4 py-2 rounded-md border border-stroke-grey bg-primary-lm text-text-lm"
              >
                Cancel
              </Button>
              <Button
                onClick={saveContactEdit}
                className="px-4 py-2 rounded-md bg-accent-lm text-primary-lm hover:bg-hover-btn-lm"
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Slide-in Message Drawer */}
        {chatTarget && (
          <MessageDrawer
            open={messageOpen}
            onOpenChange={setMessageOpen}
            userId={chatTarget.id}
            userName={chatTarget.name}
            avatarSrc={userImg}
          />
        )}
      </div>
    </div>
  );
}
