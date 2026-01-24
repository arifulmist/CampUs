import { useEffect, useMemo, useState } from "react";
import crossBtnIcon from "@/assets/icons/cross_btn.svg";
import { supabase } from "../../../../../supabase/supabaseClient";

export type SkillsLookupItem = {
  id: number;
  skill: string;
};

type Mode = "skills" | "interests";

type Props = {
  open: boolean;
  mode: Mode;
  lookupItems: SkillsLookupItem[];
  lookupLoading?: boolean;
  lookupError?: string;
  onClose: () => void;
  onInserted?: (value: string) => void;
  onLookupItemCreated?: (item: SkillsLookupItem) => void;
};

function normalize(text: string) {
  return text.trim().toLowerCase();
}

function scoreCandidate(candidate: string, query: string): number {
  const c = normalize(candidate);
  const q = normalize(query);

  if (!q) return 0;
  if (c === q) return 100;

  let score = 0;
  if (c.startsWith(q)) score += 80;
  else if (c.includes(q)) score += 60;

  // Fuzzy fallback: characters in-order (subsequence)
  if (score === 0) {
    let i = 0;
    for (let j = 0; j < c.length && i < q.length; j++) {
      if (c[j] === q[i]) i++;
    }
    if (i === q.length) score += 30;
  }

  const qParts = q.split(/\s+/).filter(Boolean);
  for (const part of qParts) {
    if (c.includes(part)) score += 10;
  }

  score -= Math.min(20, Math.abs(c.length - q.length));
  return score;
}

function getTopSuggestions(items: SkillsLookupItem[], query: string, limit: number) {
  const q = normalize(query);
  if (!q) return [];

  return items
    .map((item) => ({ item, score: scoreCandidate(item.skill, q) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.item.skill.localeCompare(b.item.skill);
    })
    .slice(0, limit)
    .map((x) => x.item);
}

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

export default function AddLookupItemModal({
  open,
  mode,
  lookupItems,
  lookupLoading,
  lookupError,
  onClose,
  onInserted,
  onLookupItemCreated,
}: Props) {
  const [value, setValue] = useState("");
  const [pickedSuggestion, setPickedSuggestion] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const headerText = mode === "skills" ? "Add Skills" : "Add Interests";

  useEffect(() => {
    if (!open) return;
    setValue("");
    setPickedSuggestion(null);
    setError("");
  }, [open, mode]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const suggestions = useMemo(() => {
    return getTopSuggestions(lookupItems, value, 3);
  }, [lookupItems, value]);

  const suppressRecommendations =
    !!pickedSuggestion && normalize(pickedSuggestion) === normalize(value);
  const showRecommendations = value.trim().length > 0 && !suppressRecommendations;

  async function onConfirm() {
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Please enter a value.");
      return;
    }

    let match = lookupItems.find((x) => normalize(x.skill) === normalize(trimmed));

    setSaving(true);
    setError("");

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) {
        setError("You need to be logged in to add this.");
        return;
      }

      // Create lookup entry if missing
      if (!match) {
        const { data: inserted, error: insertLookupError } = await supabase
          .from("skills_lookup")
          .insert({ skill: trimmed })
          .select("id, skill")
          .single();
        if (insertLookupError) throw insertLookupError;

        const rec = inserted as unknown as Record<string, unknown>;
        const idValue = rec.id;
        const skillValue = rec.skill;
        if (typeof idValue !== "number" || typeof skillValue !== "string") {
          // Surface something actionable for debugging instead of silently failing.
          console.error("skills_lookup insert returned unexpected payload:", inserted);
          throw new Error("Failed to create lookup entry.");
        }
        match = { id: idValue, skill: skillValue };
        onLookupItemCreated?.(match);
      }

      // Prevent duplicates in join table
      if (mode === "skills") {
        const { data: existing, error: existingError } = await supabase
          .from("user_skills")
          .select("id")
          .eq("auth_uid", authData.user.id)
          .eq("skill_id", match.id)
          .limit(1);
        if (existingError) throw existingError;
        if (existing && existing.length) {
          setError("You already added this skill.");
          return;
        }

        const { error: insertError } = await supabase
          .from("user_skills")
          .insert({ skill_id: match.id });
        if (insertError) throw insertError;
      } else {
        const { data: existing, error: existingError } = await supabase
          .from("user_interests")
          .select("id")
          .eq("auth_uid", authData.user.id)
          .eq("interest_id", match.id)
          .limit(1);
        if (existingError) throw existingError;
        if (existing && existing.length) {
          setError("You already added this interest.");
          return;
        }

        const { error: insertError } = await supabase
          .from("user_interests")
          .insert({ interest_id: match.id });
        if (insertError) throw insertError;
      }

      onInserted?.(match.skill);
      onClose();
    } catch (e: unknown) {
      setError(getErrorMessage(e) ?? "Failed to add item.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0"
        style={{ zIndex: 10000, backgroundColor: "rgba(0,0,0,0.7)" }}
        onMouseDown={onClose}
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
            <h4 className="lg:font-header text-text-lm lg:font-medium">
              {headerText}
            </h4>
            <button type="button" onClick={onClose} className="cursor-pointer">
              <img src={crossBtnIcon} alt="Close modal" />
            </button>
          </div>

          <div className="flex flex-col gap-4 lg:mt-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">{headerText}</label>
              <input
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  setPickedSuggestion(null);
                  setError("");
                }}
                className="w-full rounded-md border border-stroke-grey bg-primary-lm px-3 py-2 text-sm"
                placeholder={mode === "skills" ? "Type a skill..." : "Type an interest..."}
              />

              {(lookupError || error) && (
                <p className="text-sm text-accent-lm">{lookupError || error}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {showRecommendations && (
                <>
                  <p className="text-sm text-text-lm">Recommended :</p>

                  {lookupLoading ? (
                    <p className="text-sm text-text-lighter-lm">Loading…</p>
                  ) : suggestions.length ? (
                    <div className="flex flex-wrap gap-2">
                      {suggestions.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setValue(s.skill);
                            setPickedSuggestion(s.skill);
                            setError("");
                          }}
                          className="text-sm text-accent-lm border border-accent-lm rounded-full px-2 py-1 w-fit"
                        >
                          {s.skill}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-text-lighter-lm">
                      <p>No match found.</p>
                      <p>You can still add this {mode === "skills" ? "skill" : "interest"} if you want.</p>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-md border border-stroke-grey bg-primary-lm"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="px-4 py-2 rounded-md bg-accent-lm text-primary-lm disabled:opacity-50"
                disabled={saving || lookupLoading}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
