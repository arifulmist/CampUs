import React from "react";
import type { EventPostType } from "../EventPost";
import CategorySelector from "./CategorySelector";
import TitleInput from "./TitleInput";
import SegmentList from "./SegmentList";
import TagInput from "./TagInput";
import ImageUploader from "./ImageUploader";
import ImagePreview from "./ImagePreview";
import { useCreateEventForm } from "./useCreateEventForm";
import { createEvent } from "../../backend/eventService";
import { supabase } from "../../../../../../supabase/supabaseClient";
interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (post: EventPostType) => void;
}

export default function CreateEventModal({ open, onClose, onCreate }: Props) {
  const form = useCreateEventForm(open);

  if (!open) return null;



async function handlePost() {
  if (!form.validate()) return;

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    const authUid = user?.id;
    if (!authUid) {
      alert("You must be logged in to create an event.");
      return;
    }

    const post = form.buildPost();

    if (!post.segments || post.segments.length === 0) {
      alert("Please add at least one event segment.");
      return;
    }

    const newPostId = await createEvent({
      type: post.category,
      title: post.title,
      description: post.body ?? "",
      author_id: authUid,
      location: "Dhaka", // replace with form field
      event_start_date: new Date(post.segments[0].date).toISOString().split("T")[0], // YYYY-MM-DD
      event_end_date: new Date(post.segments[0].date).toISOString().split("T")[0],
      event_start_time: post.segments[0].time + ":00+06", // HH:MM:SS+TZ
      registration_link: undefined,
      img_url: post.image ?? undefined,
      category_id: Number(1), // ensure number
      segments: post.segments.map(seg => ({
        segment_title: seg.name ?? "Untitled Segment",
        segment_description: seg.description ?? "",
        segment_start_date: new Date(seg.date ?? new Date()).toISOString().split("T")[0],
        segment_end_date: new Date(seg.date ?? new Date()).toISOString().split("T")[0],
        segment_start_time: (seg.time ?? "00:00") + ":00+06",
        segment_end_time: (seg.time ?? "00:00") + ":00+06",
      })),
      tags: (post.tags ?? []).map(tag => ({ skill_id: lookupSkillId(tag) })),
    });

    console.log("Event saved successfully with post_id:", newPostId);
    alert("Event saved successfully!");
    form.resetForm();
    onClose();
  } catch (err: any) {
    console.error("Failed to save event:", err);
    alert("Failed to save event: " + (err.message ?? JSON.stringify(err)));
  }
}

  return (
    <>
      {/* overlay */}
      <div
        className="lg:fixed lg:inset-0 lg:z-40"
        onClick={onClose}
        style={{ backgroundColor: "rgba(14,21,31,0.35)" }}
      />

      {/* modal wrapper */}
      <div className="lg:fixed lg:inset-0 lg:z-50 lg:flex lg:items-center lg:justify-center lg:p-6">
        <div
          className="lg:w-full lg:max-w-3xl lg:p-6 lg:border border-stroke-grey"
          onClick={e => e.stopPropagation()}
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 8,
            boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
            maxHeight: "calc(100vh - 96px)",
            overflowY: "auto",
          }}
        >
          <div className="lg:flex lg:justify-between lg:items-center lg:mb-6">
            <h2 className="text-xl lg:font-semibold text-text-lm">
              Announce Event
            </h2>
            <button
              onClick={onClose}
              className="text-text-lighter-lm text-2xl hover:text-gray-900"
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>

          <div className="lg:space-y-6">
            <CategorySelector category={form.category} onChange={form.setCategory} />
            <TitleInput
              value={form.title}
              error={form.titleError}
              onChange={form.setTitle}
              description={form.description}
              onDescriptionChange={form.setDescription}
            />

            <SegmentList
              segments={form.segments}
              onAdd={form.addSegment}
              onUpdate={form.updateSegment}
              onRemove={form.removeSegment}
            />
            <TagInput
              value={form.tagInput}
              tags={form.tags}
              onChange={form.setTagInput}
              onAdd={form.addTag}
            />
            <ImageUploader
              image={form.imageDataUrl}
              imageName={form.imageName}
              onSelect={form.handleImage}
              onPreview={() => form.setPreviewOpen(true)}
            />

            <div className="text-right lg:pt-4">
              <button
                onClick={handlePost}
                className="bg-[#C23D00] text-white lg:px-6 lg:py-2 lg:rounded-full"
                style={{ color: "white" }}
              >
                Post
              </button>
            </div>
          </div>
        </div>
      </div>

      <ImagePreview
        open={form.previewOpen}
        image={form.imageDataUrl}
        name={form.imageName}
        onClose={() => form.setPreviewOpen(false)}
      />
    </>
  );
}
