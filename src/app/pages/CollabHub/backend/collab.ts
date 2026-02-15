import { supabase } from "@/supabase/supabaseClient";

export type CollabCategory = "research" | "competition" | "project";

export type CollabTag = {
  skill_id: number;
};

export async function searchSkills(query: string) {
  const { data, error } = await supabase
    .from("skills_lookup")
    .select("id, skill")
    .ilike("skill", `%${query}%`);

  if (error) throw error;
  return data;
}

export async function createCollabPost(payload: {
  title: string;
  description: string;
  tags: CollabTag[];
  category: CollabCategory;
  author_id: string;
}) {
  // 1) Insert into all_posts
  const { data: postRow, error: postError } = await supabase
    .from("all_posts")
    .insert({
      type: "collab",
      title: payload.title,
      description: payload.description,
      author_id: payload.author_id,
    })
    .select("post_id")
    .single();

  if (postError) throw postError;
  const postId = postRow.post_id as string;

  // 2) Resolve category_id from collab_category
  const { data: catData, error: catError } = await supabase
    .from("collab_category")
    .select("category_id")
    .eq("category", payload.category)
    .single();
  if (catError || !catData) throw catError || new Error("Invalid category");

  // 3) Insert into collab_posts
  const { error: collabError } = await supabase.from("collab_posts").insert({
    post_id: postId,
    category_id: catData.category_id,
  });
  if (collabError) throw collabError;

  // 4) Insert into user_posts (used by profile pages)
  const { error: userPostError } = await supabase
    .from("user_posts")
    .insert({ post_id: postId, auth_uid: payload.author_id });
  if (userPostError) throw userPostError;

  // 5) Insert tags into post_tags
  if (payload.tags.length) {
    const { error: tagError } = await supabase.from("post_tags").insert(
      payload.tags.map((t) => ({
        post_id: postId,
        skill_id: t.skill_id,
      }))
    );
    if (tagError) throw tagError;
  }

  return { success: true, post_id: postId };
}

export async function updateCollabPost(
  postId: string,
  payload: {
    title: string;
    description: string;
    tags: CollabTag[];
    category: CollabCategory;
  }
) {
  const { data: postData, error: postError } = await supabase
    .from("all_posts")
    .update({
      title: payload.title,
      description: payload.description,
    })
    .eq("post_id", postId)
    .select("post_id");

  if (postError) throw postError;
  if (!postData || postData.length === 0) {
    throw new Error(
      "No post rows were updated. This is usually caused by Row Level Security (RLS) policies blocking updates for the current user."
    );
  }

  const { data: catData, error: catError } = await supabase
    .from("collab_category")
    .select("category_id")
    .eq("category", payload.category)
    .single();
  if (catError || !catData) throw catError || new Error("Invalid category");

  const { data: collabData, error: collabError } = await supabase
    .from("collab_posts")
    .update({ category_id: catData.category_id })
    .eq("post_id", postId)
    .select("post_id");
  if (collabError) throw collabError;
  if (!collabData || collabData.length === 0) {
    throw new Error(
      "No collab_post rows were updated. This is usually caused by Row Level Security (RLS) policies blocking updates for the current user."
    );
  }

  const { error: delTagError } = await supabase
    .from("post_tags")
    .delete()
    .eq("post_id", postId)
    .select("post_id");
  if (delTagError) throw delTagError;

  if (payload.tags.length) {
    const { error: tagError } = await supabase.from("post_tags").insert(
      payload.tags.map((t) => ({
        post_id: postId,
        skill_id: t.skill_id,
      }))
    );
    if (tagError) throw tagError;
  }
}

export async function deleteCollabPost(postId: string) {
  const { error: tagError } = await supabase
    .from("post_tags")
    .delete()
    .eq("post_id", postId);
  if (tagError) throw tagError;

  const { error: userPostError } = await supabase
    .from("user_posts")
    .delete()
    .eq("post_id", postId);
  if (userPostError) throw userPostError;

  const { error: collabError } = await supabase
    .from("collab_posts")
    .delete()
    .eq("post_id", postId);
  if (collabError) throw collabError;

  const { error: postError } = await supabase
    .from("all_posts")
    .delete()
    .eq("post_id", postId);
  if (postError) throw postError;
}
