import { LucideCheck, LucidePencil, LucidePlus, LucideTrash2 } from "lucide-react";
import { useState } from "react";

import AddLookupItemModal from "./AddLookupItemModal";
import { useUserProfileContext } from "./UserProfileContext";
import { getErrorMessage } from "../userProfileUtils";
import { supabase } from "@/supabase/supabaseClient";

function normalizeText(text: string) {
  return text.trim().toLowerCase();
}

export function SkillsSection() {
  const {
    canEdit,
    skills,
    setSkills,
    skillsLookup,
    skillsLookupLoading,
    skillsLookupError,
    setSkillsLookup,
  } = useUserProfileContext();

  const [modalOpen, setModalOpen] = useState(false);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");
  const [editError, setEditError] = useState<string>("");
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);

  function startEdit(index: number) {
    if (!canEdit) return;
    setEditError("");
    setEditingIndex(index);
    setEditingValue(skills[index] ?? "");
  }

  function cancelEdit() {
    setEditingIndex(null);
    setEditingValue("");
    setEditError("");
  }

  async function saveEdit(index: number) {
    if (!canEdit) {
      setEditError("You can only edit your own profile.");
      return;
    }

    const nextValue = editingValue.trim();
    if (!nextValue) {
      setEditError("Skill cannot be empty.");
      return;
    }

    const currentValue = skills[index];
    if (!currentValue) return;
    if (normalizeText(currentValue) === normalizeText(nextValue)) {
      cancelEdit();
      return;
    }

    const oldLookup = skillsLookup.find((x) => normalizeText(x.skill) === normalizeText(currentValue));
    if (!oldLookup) {
      setEditError("Could not find this skill in lookup.");
      return;
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const authUid = authData.user?.id;
      if (!authUid) {
        setEditError("You need to be logged in to update this.");
        return;
      }

      let newLookup = skillsLookup.find((x) => normalizeText(x.skill) === normalizeText(nextValue));

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
        setSkillsLookup((prev) => (prev.some((p) => p.id === newLookup!.id) ? prev : [...prev, newLookup!]));
      }

      const { data: existing, error: existingError } = await supabase
        .from("user_skills")
        .select("id")
        .eq("auth_uid", authUid)
        .eq("skill_id", newLookup.id)
        .limit(1);
      if (existingError) throw existingError;
      if (existing && existing.length) {
        setEditError("You already have this skill.");
        return;
      }

      const { error: updateError } = await supabase
        .from("user_skills")
        .update({ skill_id: newLookup.id })
        .eq("auth_uid", authUid)
        .eq("skill_id", oldLookup.id);
      if (updateError) throw updateError;

      setSkills((prev) => prev.map((s, i) => (i === index ? newLookup!.skill : s)));
      cancelEdit();
    } catch (e: unknown) {
      setEditError(getErrorMessage(e));
    }
  }

  async function deleteSkill(index: number) {
    if (!canEdit) {
      setEditError("You can only edit your own profile.");
      return;
    }

    const currentValue = skills[index];
    if (!currentValue) return;

    const lookup = skillsLookup.find(
      (x) => normalizeText(x.skill) === normalizeText(currentValue)
    );
    if (!lookup) {
      setEditError("Could not find this skill in lookup.");
      return;
    }

    try {
      setDeletingIndex(index);
      setEditError("");

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const authUid = authData.user?.id;
      if (!authUid) {
        setEditError("You need to be logged in to update this.");
        return;
      }

      const { error: deleteError } = await supabase
        .from("user_skills")
        .delete()
        .eq("auth_uid", authUid)
        .eq("skill_id", lookup.id);
      if (deleteError) throw deleteError;

      setSkills((prev) => prev.filter((_, i) => i !== index));
      if (editingIndex === index) cancelEdit();
    } catch (e: unknown) {
      setEditError(getErrorMessage(e));
    } finally {
      setDeletingIndex(null);
    }
  }

  return (
    <div className="bg-primary-lm border border-stroke-grey lg:rounded-xl lg:p-8 flex flex-col h-fit">
      <AddLookupItemModal
        open={modalOpen}
        mode="skills"
        lookupItems={skillsLookup}
        lookupLoading={skillsLookupLoading}
        lookupError={skillsLookupError}
        onClose={() => setModalOpen(false)}
        onLookupItemCreated={(item) =>
          setSkillsLookup((prev) => (prev.some((p) => p.id === item.id) ? prev : [...prev, item]))
        }
        onInserted={(value) => {
          setSkills((prev) => (prev.includes(value) ? prev : [...prev, value]));
        }}
      />

      <div className="flex justify-between items-center">
        <h4 className="font-header">Skills</h4>
        <div className="space-x-1">
          {canEdit && (
            <button type="button" onClick={() => setModalOpen(true)} className="cursor-pointer">
              <LucidePlus className="size-7 hover:text-accent-lm transition duration-200" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:gap-2 lg:mt-5">
        {editError && <p className="text-sm text-accent-lm">{editError}</p>}

        {skills.length ? (
          skills.map((skill, index) => (
            <div key={`${skill}-${index}`}>
              <div className="flex justify-between items-center">
                {editingIndex === index ? (
                  <input
                    className="flex-1 lg:mr-3 lg:rounded-md border border-stroke-grey bg-primary-lm lg:px-3 lg:py-1 focus:outline-accent-lm lg:text-md"
                    autoFocus
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        saveEdit(index);
                      }
                      if (e.key === "Escape") {
                        e.preventDefault();
                        cancelEdit();
                      }
                    }}
                  />
                ) : (
                  <h6>{skill}</h6>
                )}

                {canEdit && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => (editingIndex === index ? saveEdit(index) : startEdit(index))}
                      aria-label={editingIndex === index ? "Save skill" : "Edit skill"}
                      disabled={deletingIndex === index}
                    >
                      {editingIndex === index ? (
                        <LucideCheck className="size-5 cursor-pointer hover:text-accent-lm transition duration-200" />
                      ) : (
                        <LucidePencil className="size-5 cursor-pointer hover:text-accent-lm transition duration-200" />
                      )}
                    </button>

                    {editingIndex !== index && (
                      <button
                        type="button"
                        onClick={() => deleteSkill(index)}
                        aria-label="Delete skill"
                        disabled={deletingIndex === index}
                      >
                        <LucideTrash2 className="lg:size-6 cursor-pointer hover:text-accent-lm transition duration-200" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {index !== skills.length - 1 && <hr className="lg:mt-2 border-stroke-grey" />}
            </div>
          ))
        ) : (
          <p className="text-text-lighter-lm">No skills added yet.</p>
        )}
      </div>
    </div>
  );
}
