import { supabase } from "@/supabase/supabaseClient";

type QnATag = "Question" | "Advice" | "Resource";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function getCategoryId(row: unknown): string | number | null {
  if (!isRecord(row)) return null;
  const id = row.category_id;
  return typeof id === "string" || typeof id === "number" ? id : null;
}

export async function updateQnaPost({
  postId,
  authorId,
  title,
  description,
  tag,
}: {
  postId: string;
  authorId: string;
  title: string;
  description: string;
  tag: QnATag;
}): Promise<void> {
  const nextTitle = title.trim();
  const nextDescription = description.trim();

  if (!nextTitle || !nextDescription) {
    throw new Error("Title and description are required");
  }

  const { data: categoryRow, error: categoryError } = await supabase
    .from("qna_category")
    .select("category_id")
    .eq("category_name", tag)
    .maybeSingle();

  if (categoryError) throw categoryError;

  const categoryId = getCategoryId(categoryRow);
  if (categoryId === null) {
    throw new Error("Failed to find tag category");
  }

  const { data: updated, error: updateError } = await supabase
    .from("all_posts")
    .update({ title: nextTitle, description: nextDescription })
    .eq("post_id", postId)
    .eq("author_id", authorId)
    .select("post_id");

  if (updateError) throw updateError;
  if (!updated || updated.length === 0) {
    throw new Error("Update failed (not owner or not permitted)");
  }

  const { data: updatedQna, error: qnaError } = await supabase
    .from("qna_posts")
    .update({ category_id: categoryId })
    .eq("post_id", postId)
    .select("post_id");

  if (qnaError) throw qnaError;
  if (!updatedQna || updatedQna.length === 0) {
    throw new Error("Update failed (qna post not permitted)");
  }
}

export async function deleteQnaPost({
  postId,
  authorId,
}: {
  postId: string;
  authorId: string;
}): Promise<void> {
  const { data, error } = await supabase
    .from("all_posts")
    .delete()
    .eq("post_id", postId)
    .eq("author_id", authorId)
    .select("post_id");

  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error("Delete failed (not owner or not permitted)");
  }
}
