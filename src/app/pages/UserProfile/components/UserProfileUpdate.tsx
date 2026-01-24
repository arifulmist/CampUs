// src/components/UserProfileUpdate.tsx
import { useEffect, useState } from "react";

type Skill = { title: string; detail?: string };
type Contact = {
  type: "gmail" | "linkedin" | "github" | "facebook";
  id: string;
};

interface Props {
  open: boolean;
  mode: "skill" | "interest" | "contact";
  onClose: () => void;
  onSaveSkill: (skill: Skill) => void;
  onSaveInterest: (interest: string) => void;
  onSaveContact: (contact: Contact) => void;
}

export default function UserProfileUpdate({
  open,
  mode,
  onClose,
  onSaveSkill,
  onSaveInterest,
  onSaveContact,
}: Props) {
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [interest, setInterest] = useState("");
  const [contactType, setContactType] = useState<Contact["type"]>("github");
  const [contactId, setContactId] = useState("");
  const [error, setError] = useState("");

  // Reset inputs when modal opens/closes or mode changes
  useEffect(() => {
    if (!open) {
      setTitle("");
      setDetail("");
      setInterest("");
      setContactType("github");
      setContactId("");
      setError("");
    }
  }, [open, mode]);

  useEffect(() => {
    if (!open) return;
    // Focus first input (optional, improves UX)
    const id =
      mode === "skill"
        ? "up-title"
        : mode === "interest"
        ? "up-interest"
        : "up-contact-id";
    setTimeout(() => {
      const el = document.getElementById(id) as HTMLInputElement | null;
      el?.focus();
    }, 50);
  }, [open, mode]);

  if (!open) return null;

  function handleSave() {
    setError("");
    if (mode === "skill") {
      if (!title.trim()) {
        setError("Skill title is required.");
        return;
      }
      onSaveSkill({ title: title.trim(), detail: detail.trim() || undefined });
    } else if (mode === "interest") {
      if (!interest.trim()) {
        setError("Interest is required.");
        return;
      }
      onSaveInterest(interest.trim());
    } else {
      if (!contactId.trim()) {
        setError("Contact ID is required.");
        return;
      }
      onSaveContact({ type: contactType, id: contactId.trim() });
    }
  }

  return (
    <>
      <div
        className="lg:fixed lg:inset-0 lg:z-40"
        onClick={onClose}
        style={{ backgroundColor: "rgba(14,21,31,0.35)" }}
      />

      <div className="lg:fixed lg:inset-0 lg:z-50 lg:flex lg:items-center lg:justify-center lg:p-6">
        <div
          className="lg:w-full lg:max-w-md lg:p-6 lg:border border-stroke-grey"
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "8px",
            boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
            maxHeight: "calc(100vh - 96px)",
            overflowY: "auto",
          }}
        >
          <div className="lg:flex lg:justify-between lg:items-center lg:mb-4">
            <h3 className="text-lg lg:font-semibold text-text-lm">
              {mode === "skill"
                ? "Add Skill"
                : mode === "interest"
                ? "Add Interest"
                : "Add Contact"}
            </h3>
            <button
              aria-label="Close"
              onClick={onClose}
              className="text-text-lighter-lm text-2xl hover:text-gray-900"
            >
              ✕
            </button>
          </div>

          <div className="lg:space-y-4">
            {mode === "skill" ? (
              <>
                <div>
                  <label className="lg:block text-sm lg:font-medium lg:mb-1">
                    Skill
                  </label>
                  <input
                    id="up-title"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      if (error) setError("");
                    }}
                    className="lg:w-full lg:border border-stroke-grey lg:rounded-lg lg:px-3 lg:py-2"
                    placeholder="e.g. UI/UX or Java"
                  />
                </div>

                <div>
                  <label className="lg:block text-sm lg:font-medium lg:mb-1">
                    Detail (optional)
                  </label>
                  <input
                    value={detail}
                    onChange={(e) => setDetail(e.target.value)}
                    className="lg:w-full lg:border border-stroke-grey lg:rounded-lg lg:px-3 lg:py-2"
                    placeholder="e.g. Club or Course"
                  />
                </div>
              </>
            ) : mode === "interest" ? (
              <>
                <div>
                  <label className="lg:block text-sm lg:font-medium lg:mb-1">
                    Interest
                  </label>
                  <input
                    id="up-interest"
                    value={interest}
                    onChange={(e) => {
                      setInterest(e.target.value);
                      if (error) setError("");
                    }}
                    className="lg:w-full lg:border border-stroke-grey lg:rounded-lg lg:px-3 lg:py-2"
                    placeholder="e.g. ML, CTF"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="lg:block text-sm lg:font-medium lg:mb-1">
                    Platform
                  </label>
                  <select
                    value={contactType}
                    onChange={(e) =>
                      setContactType(e.target.value as Contact["type"])
                    }
                    className="lg:w-full lg:border border-stroke-grey lg:rounded-lg lg:px-3 lg:py-2"
                  >
                    <option value="gmail">Gmail</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="github">GitHub</option>
                    <option value="facebook">Facebook</option>
                        
                  </select>
                </div>
                <div>
                  <label className="lg:block text-sm lg:font-medium lg:mb-1">ID</label>
                  <input
                    id="up-contact-id"
                    value={contactId}
                    onChange={(e) => {
                      setContactId(e.target.value);
                      if (error) setError("");
                    }}
                    className="lg:w-full lg:border border-stroke-grey lg:rounded-lg lg:px-3 lg:py-2"
                    placeholder="e.g. username or email"
                  />
                </div>
              </>
            )}

            {error && <div className="text-sm text-red-600">{error}</div>}

            <div className="lg:flex lg:justify-end lg:gap-3 lg:pt-2">
              <button
                onClick={onClose}
                className="lg:px-4 lg:py-2 lg:rounded-md lg:border border-stroke-grey bg-primary-lm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="lg:px-4 lg:py-2 lg:rounded-md bg-accent-lm text-primary-lm"
                style={{ color: "white" }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
