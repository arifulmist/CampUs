import { supabase } from "../../../../supabase/supabaseClient"; 
import { v4 as uuidv4 } from "uuid";

type CollabPayload = {
  title: string;
  description: string;
  tags: string[];
  category: "research" | "competition" | "project";
  author_id: string;
};

export async function createCollabPost(payload: CollabPayload) {
  const postId = uuidv4();
  const now = new Date();

  // Insert into all_posts
  const { error: postError } = await supabase.from("all_posts").insert({
    post_id: postId,
    type: "collab",
    title: payload.title,
    description: payload.description,
    author_id: payload.author_id,
    like_count: 0,
    comment_count: 0,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  });
  if (postError) throw postError;

  // Resolve category_id
  const { data: catData, error: catError } = await supabase
    .from("collab_category")
    .select("category_id")
    .eq("category", payload.category)
    .single();
  if (catError || !catData) throw catError || new Error("Invalid category");

  // Insert into collab_posts
  const { error: collabError } = await supabase.from("collab_posts").insert({
    post_id: postId,
    category_id: catData.category_id,
  });
  if (collabError) throw collabError;

  // Optional: insert tags
  if (payload.tags.length > 0) {
    const tagRows = payload.tags.map((tag) => ({ post_id: postId, tag }));
    const { error: tagError } = await supabase.from("collab_tags").insert(tagRows);
    if (tagError) throw tagError;
  }

  return { success: true, post_id: postId };
}
