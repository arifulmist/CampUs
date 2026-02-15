import { supabase } from "@/supabase/supabaseClient";

// Find skill_id by skill name, inserting if missing
export async function ensureSkillId(skillName: string): Promise<number> {
  // 1. Try to find existing skill
  const { data, error } = await supabase
    .from("skills_lookup")
    .select("id")
    .eq("skill", skillName)
    .maybeSingle();

  if (error) throw error;

  if (data?.id) {
    return data.id;
  }

  // 2. If not found, insert new skill
  const { data: inserted, error: insertError } = await supabase
    .from("skills_lookup")
    .insert({ skill: skillName })
    .select("id")
    .single();

  if (insertError) throw insertError;

  return inserted.id;
}
