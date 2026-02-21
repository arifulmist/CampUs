import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import crossBtn from "@/assets/icons/cross_btn.svg";
import { toast } from "react-hot-toast";

import { ButtonCTA } from "@/components/ButtonCTA";
import CategorySelector from "@/components/CategorySelector";
import { searchSkills, type CollabCategory, type CollabTag, updateCollabPost } from "../backend/collab";

type SkillSuggestion = { id: number; skill: string };
type SelectedTag = { skill_id: number; name: string };

export type EditCollabInitial = {
  postId: string;
  title: string;
  description: string;
  category: CollabCategory;
  tags: Array<{ skill_id: number; name: string }>;
};

export function EditCollabModal({
  open,
  onClose,
  initial,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  initial: EditCollabInitial;
  onSaved: () => void;
}) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const tagInputRef = useRef<HTMLInputElement | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<CollabCategory>("research");
  const [isSaving, setIsSaving] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState<SkillSuggestion[]>([]);
  const [tags, setTags] = useState<SelectedTag[]>([]);

  useEffect(() => {
    if (!open) return;
    setTitle(initial.title);
    setDescription(initial.description);
    setCategory(initial.category);
    setTags((initial.tags ?? []).map((t) => ({ skill_id: t.skill_id, name: t.name })));
    setSearchTerm("");
    setSuggestions([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial.postId]);

  useEffect(() => {
    let alive = true;
    const q = searchTerm.trim();
    if (!q) {
      setSuggestions([]);
      return;
    }

    const t = setTimeout(() => {
      (async () => {
        try {
          const rows = await searchSkills(q);
          if (!alive) return;
          const mapped = (rows ?? [])
            .map((r) => {
              const obj = r as { id?: unknown; skill?: unknown };
              const id = typeof obj.id === "number" ? obj.id : Number(obj.id);
              const skill = typeof obj.skill === "string" ? obj.skill : String(obj.skill ?? "");
              if (!Number.isFinite(id) || !skill.trim()) return null;
              return { id, skill } satisfies SkillSuggestion;
            })
            .filter((r): r is SkillSuggestion => r !== null);
          setSuggestions(mapped);
        } catch {
          if (!alive) return;
          setSuggestions([]);
        }
      })();
    }, 250);

    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [searchTerm]);

  function addTagFromSuggestion(s: SkillSuggestion) {
    const skillId = Number(s.id);
    if (!Number.isFinite(skillId)) return;
    if (tags.some((t) => t.skill_id === skillId)) {
      setSearchTerm("");
      setSuggestions([]);
      return;
    }
    setTags((prev) => [...prev, { skill_id: skillId, name: s.skill }]);
    setSearchTerm("");
    setSuggestions([]);
  }

  function removeTag(skillId: number) {
    setTags((prev) => prev.filter((t) => t.skill_id !== skillId));
  }

  async function handleSave() {
    if (isSaving) return;
    setIsSaving(true);

    if (formRef.current) {
      const valid = formRef.current.reportValidity();
      if (!valid) {
        toast.error("Please fill all required fields");
        setIsSaving(false);
        return;
      }
    }

    if (tags.length === 0) {
      toast.error("Please fill all required fields");
      tagInputRef.current?.focus();
      setIsSaving(false);
      return;
    }

    try {
      const tagPayload: CollabTag[] = tags.map((t) => ({ skill_id: t.skill_id }));
      await updateCollabPost(initial.postId, {
        title: title.trim(),
        description: description.trim(),
        category,
        tags: tagPayload,
      });
      toast.success("Collaboration post updated successfully!");
      onClose();
      onSaved();
    } catch (err: unknown) {
      console.error("Failed to update collab post:", err);
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      toast.error("Failed to update post: " + msg);
      setIsSaving(false);
    }
  }

  if (!open) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0"
        onClick={() => {
          if (!isSaving) onClose();
        }}
        style={{ backgroundColor: "rgba(0,0,0,0.4)", zIndex: 1000 }}
      />

      <div className="fixed inset-0 flex items-center justify-center p-6" style={{ zIndex: 1001 }}>
        <div
          className="lg:w-full lg:max-w-3xl lg:p-10 lg:border border-stroke-grey"
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 8,
            boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
            maxHeight: "calc(100vh - 96px)",
            overflowY: "auto",
          }}
        >
          <div className="lg:flex lg:justify-between lg:items-center lg:mb-6">
            <h2 className="text-xl lg:font-semibold text-text-lm">Edit Post</h2>
            <button
              onClick={() => {
                if (!isSaving) onClose();
              }}
              className="cursor-pointer"
              aria-label="Close modal"
              type="button"
            >
              <img src={crossBtn} alt="Close" />
            </button>
          </div>

          <form
            ref={formRef}
            className="lg:space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSave();
            }}
          >
            <div className="bg-secondary-lm lg:p-5 border border-stroke-grey rounded-lg lg:space-y-5">
              <div className="lg:space-y-2">
                <label className="font-medium text-md">Category</label>
                <CategorySelector
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  value={category as any}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onChange={(v: any) => setCategory(v as CollabCategory)}
                  options={[
                    { value: "Research", label: "Research" },
                    { value: "Competition", label: "Competition" },
                    { value: "Project", label: "Project" },
                  ]}
                />
              </div>

              <div className="lg:space-y-2">
                <label className="font-medium text-md">Title</label>
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Title"
                  className="border px-3 py-2 rounded-lg w-full bg-primary-lm border-stroke-grey focus:outline-0 focus:border-accent-lm"
                />
              </div>

              <div className="lg:space-y-2">
                <label className="font-medium text-md">Description</label>
                <textarea
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description"
                  rows={5}
                  className="border px-3 py-2 rounded-lg w-full bg-primary-lm border-stroke-grey focus:outline-0 focus:border-accent-lm"
                />
              </div>

              <div>
                <h6 className="font-medium mb-2">Tags</h6>

                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="text"
                    ref={tagInputRef}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Begin typing to add tags"
                    className="border px-3 py-2 rounded-lg flex-1 bg-primary-lm border-stroke-grey focus:outline-0 focus:border-accent-lm"
                  />
                </div>

                {suggestions.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {suggestions.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => addTagFromSuggestion(s)}
                        className="px-3 py-1 rounded-2xl text-accent-lm bg-primary-lm border border-stroke-peach hover:bg-hover-lm duration-150 transition text-sm"
                      >
                        {s.skill}
                      </button>
                    ))}
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  {tags.map((t) => (
                    <span
                      key={t.skill_id}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-accent-lm text-primary-lm"
                    >
                      {t.name}
                      <button
                        type="button"
                        onClick={() => removeTag(t.skill_id)}
                        className="ml-2 text-background-lm hover:text-stroke-peach"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 lg:pt-4">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => {
                  if (!isSaving) onClose();
                }}
                className="bg-secondary-lm text-text-lm border border-stroke-grey px-4 py-2 rounded-lg hover:bg-hover-lm transition duration-150 disabled:opacity-60"
              >
                Cancel
              </button>
              <ButtonCTA
                type="submit"
                label={isSaving ? "Saving..." : "Save"}
                loading={isSaving}
                disabled={isSaving}
              />
            </div>
          </form>
        </div>
      </div>
    </>
  ,
    document.body
  );
}
