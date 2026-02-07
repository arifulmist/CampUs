import { supabase } from "../../../../../supabase/supabaseClient";

export async function createEvent(payload) {
  // Step 1: Insert into all_posts
  const { data: postData, error: postError } = await supabase
    .from("all_posts")
    .insert([
      {
        type: "event",
        title: payload.title,
        description: payload.description,
        author_id: payload.authorId,
      },
    ])
    .select("post_id")
    .single();

  if (postError) throw postError;
  const postId = postData.post_id;

  // Step 2: Insert into event_posts
  const { error: eventError } = await supabase
    .from("event_posts")
    .insert([
      {
        post_id: postId,
        location: payload.location,
        event_start_date: payload.startDate,
        event_end_date: payload.endDate,
        event_start_time: payload.startTime,
        category_id: payload.categoryId,
        img_url: payload.imgUrl,
        registration_link: payload.registrationLink,
      },
    ]);

  if (eventError) throw eventError;

  // Step 3: Insert segments
  if (payload.segments?.length > 0) {
    const segmentRows = payload.segments.map(seg => ({
      post_id: postId,
      segment_title: seg.name,
      segment_description: seg.description,
      segment_start_date: seg.startDate,
      segment_end_date: seg.endDate,
      segment_start_time: seg.startTime,
      segment_end_time: seg.endTime,
      user_id: seg.userId ?? null,
    }));

    const { error: segmentError } = await supabase
      .from("event_segment")
      .insert(segmentRows);

    if (segmentError) throw segmentError;
  }

  return postId;
}
