import { supabase } from "../../../../../supabase/supabaseClient";
import type { EventPost } from "./event-types";
export async function searchSkills(query: string) {
  const { data, error } = await supabase
    .from("skills_lookup")
    .select("id, skill")
    .ilike("skill", `%${query}%`); 

  if (error) throw error;
  return data;
}


export async function createEvent(event: EventPost) {
  // 1. Insert into all_posts
  const { data: postRow, error: postError } = await supabase
    .from("all_posts")
    .insert({
      type: event.type,
      title: event.title,
      description: event.description,
      author_id: event.author_id,
    })
    .select()
    .single();

  if (postError) throw postError;
  const postId = postRow.post_id;

  // 2. Insert into event_posts
  const { error: eventError } = await supabase.from("event_posts").insert({
    post_id: postId,
    location: event.location,
    event_start_date: event.event_start_date,
    event_end_date: event.event_end_date,
    registration_link: event.registration_link,
    img_url: event.img_url,
    category_id: event.category_id,
  });
  if (eventError) throw eventError;
   const { error: userError } = await supabase.from("user_posts").insert({ 
    post_id: postId,
     auth_uid: event.author_id, 
   });
     if (userError) throw userError;
    
  // 3. Insert segments
  if (event.segments.length) {
    const { error: segError } = await supabase.from("event_segment").insert(
      event.segments.map(seg => ({
        post_id: postId,
        segment_title: seg.segment_title,
        segment_description: seg.segment_description,
        segment_start_date: seg.segment_start_date,
        segment_end_date: seg.segment_end_date,
        segment_start_time: seg.segment_start_time,
        segment_end_time: seg.segment_end_time,
        segment_location: seg.segment_location ?? null,
      }))
    );
    if (segError) throw segError;
  }

  // 4. Insert tags
  if (event.tags.length) {
    const { error: tagError } = await supabase.from("post_tags").insert(
      event.tags.map(tag => ({
        post_id: postId,
        skill_id: tag.skill_id,
      }))
    );
    if (tagError) throw tagError;
  }

  return postId;
}

export async function updateEvent(postId: string, event: Omit<EventPost, "post_id">) {
  const { data: postData, error: postError } = await supabase
    .from("all_posts")
    .update({
      type: event.type,
      title: event.title,
      description: event.description,
    })
    .eq("post_id", postId)
    .select("post_id");
  if (postError) throw postError;
  if (!postData || postData.length === 0) {
    throw new Error(
      "No post rows were updated. This is usually caused by Row Level Security (RLS) policies blocking updates for the current user."
    );
  }

  const { data: eventData, error: eventError } = await supabase
    .from("event_posts")
    .update({
      location: event.location,
      event_start_date: event.event_start_date,
      event_end_date: event.event_end_date,
      registration_link: event.registration_link ?? null,
      img_url: event.img_url ?? null,
      category_id: event.category_id,
    })
    .eq("post_id", postId)
    .select("post_id");
  if (eventError) throw eventError;
  if (!eventData || eventData.length === 0) {
    throw new Error(
      "No event_post rows were updated. This is usually caused by Row Level Security (RLS) policies blocking updates for the current user."
    );
  }

  const { error: delSegError } = await supabase
    .from("event_segment")
    .delete()
    .eq("post_id", postId)
    .select("post_id");
  if (delSegError) throw delSegError;

  if (event.segments.length) {
    const { error: segError } = await supabase.from("event_segment").insert(
      event.segments.map(seg => ({
        post_id: postId,
        segment_title: seg.segment_title,
        segment_description: seg.segment_description,
        segment_start_date: seg.segment_start_date,
        segment_end_date: seg.segment_end_date,
        segment_start_time: seg.segment_start_time,
        segment_end_time: seg.segment_end_time,
        segment_location: seg.segment_location ?? null,
      }))
    );
    if (segError) throw segError;
  }

  const { error: delTagError } = await supabase
    .from("post_tags")
    .delete()
    .eq("post_id", postId)
    .select("post_id");
  if (delTagError) throw delTagError;

  if (event.tags.length) {
    const { error: tagError } = await supabase.from("post_tags").insert(
      event.tags.map(tag => ({
        post_id: postId,
        skill_id: tag.skill_id,
      }))
    );
    if (tagError) throw tagError;
  }
}

export async function deleteEvent(postId: string) {
  const { error: segError } = await supabase.from("event_segment").delete().eq("post_id", postId);
  if (segError) throw segError;

  const { error: tagError } = await supabase.from("post_tags").delete().eq("post_id", postId);
  if (tagError) throw tagError;

  const { error: userPostError } = await supabase.from("user_posts").delete().eq("post_id", postId);
  if (userPostError) throw userPostError;

  const { error: eventError } = await supabase.from("event_posts").delete().eq("post_id", postId);
  if (eventError) throw eventError;

  const { error: postError } = await supabase.from("all_posts").delete().eq("post_id", postId);
  if (postError) throw postError;
}
