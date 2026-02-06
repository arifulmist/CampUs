import { LucidePencil, LucidePlus } from "lucide-react";
import { useState } from "react";

import AddLookupItemModal from "./AddLookupItemModal";
import { useUserProfileContext } from "./UserProfileContext";
import { getErrorMessage } from "../userProfileUtils";
import { supabase } from "../../../../../supabase/supabaseClient";

function normalizeText(text: string) {
  return text.trim().toLowerCase();
}

export function InterestsSection() {
  const {
    canEdit,
    interests,
    setInterests,
    skillsLookup,
    skillsLookupLoading,
    skillsLookupError,
    setSkillsLookup,
  } = useUserProfileContext();

  const [modalOpen, setModalOpen] = useState(false);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");
  const [editError, setEditError] = useState<string>("");

  function startEdit(index: number) {
    if (!canEdit) return;
    setEditError("");
    setEditingIndex(index);
    setEditingValue(interests[index] ?? "");
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
      setEditError("Interest cannot be empty.");
      return;
    }

    const currentValue = interests[index];
    if (!currentValue) return;
    if (normalizeText(currentValue) === normalizeText(nextValue)) {
      cancelEdit();
      return;
    }

    const oldLookup = skillsLookup.find((x) => normalizeText(x.skill) === normalizeText(currentValue));
    if (!oldLookup) {
      setEditError("Could not find this interest in lookup.");
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
        .from("user_interests")
        .select("id")
        .eq("auth_uid", authUid)
        .eq("interest_id", newLookup.id)
        .limit(1);
      if (existingError) throw existingError;
      if (existing && existing.length) {
        setEditError("You already have this interest.");
        return;
      }

      const { error: updateError } = await supabase
        .from("user_interests")
        .update({ interest_id: newLookup.id })
        .eq("auth_uid", authUid)
        .eq("interest_id", oldLookup.id);
      if (updateError) throw updateError;

      setInterests((prev) => prev.map((s, i) => (i === index ? newLookup!.skill : s)));
      cancelEdit();
    } catch (e: unknown) {
      setEditError(getErrorMessage(e));
    }
  }

  return (
    <div className="bg-primary-lm border border-stroke-grey lg:rounded-xl lg:p-8 flex flex-col h-fit">
      <AddLookupItemModal
        open={modalOpen}
        mode="interests"
        lookupItems={skillsLookup}
        lookupLoading={skillsLookupLoading}
        lookupError={skillsLookupError}
        onClose={() => setModalOpen(false)}
        onLookupItemCreated={(item) =>
          setSkillsLookup((prev) => (prev.some((p) => p.id === item.id) ? prev : [...prev, item]))
        }
        onInserted={(value) => {
          setInterests((prev) => (prev.includes(value) ? prev : [...prev, value]));
        }}
      />

      <div className="flex justify-between items-center">
        <h4 className="font-header">Interests</h4>
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

        {interests.length ? (
          interests.map((interest, index) => (
            <div key={`${interest}-${index}`}>
              <div className="flex justify-between items-center">
                {editingIndex === index ? (
                  <input
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
                    className="flex-1 mr-3 rounded-md border border-stroke-grey bg-primary-lm px-3 py-1"
                    autoFocus
                  />
                ) : (
                  <h6>{interest}</h6>
                )}

                {canEdit && (
                  <button
                    type="button"
                    onClick={() => (editingIndex === index ? saveEdit(index) : startEdit(index))}
                    aria-label={editingIndex === index ? "Save interest" : "Edit interest"}
                  >
                    <LucidePencil className="size-5 cursor-pointer hover:text-accent-lm transition duration-200" />
                  </button>
                )}
              </div>

              {index !== interests.length - 1 && <hr className="border-stroke-grey" />}
            </div>
          ))
        ) : (
          <p className="text-sm text-text-lighter-lm">No interests added yet.</p>
        )}
      </div>
    </div>
  );
}
