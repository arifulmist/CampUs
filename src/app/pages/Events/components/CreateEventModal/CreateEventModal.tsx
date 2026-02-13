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
import { ensureSkillId } from "../../backend/skillsService";
import { toast } from "react-hot-toast";
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
          toast.error("You must be logged in to create an event.");
          return;
        }

        const post = form.buildPost();

        // Build payload parts
        const event_data = {
                // all_posts fields
              type: "event",              
              title: post.title,
              description: post.body ?? "",
              author_id: authUid,

              // event_posts fields
              location: post.location ?? "",
              event_start_date: post.segments?.[0]?.startDate ?? null,
              event_end_date: post.segments?.[0]?.endDate ?? null,
              event_start_time: post.segments?.[0]?.startTime
                ? post.segments[0].startTime + ":00+06"
                : null,
            
              img_url: post.image ?? null,
              category_id: form.category,
            };


        const segments_data = post.segments?.length
          ? post.segments.map(seg => ({
              segment_title: seg.name ?? "Untitled Segment",
              segment_description: seg.description ?? "",
              segment_location: seg.location ?? "",
              segment_start_date: seg.startDate ?? null,
              segment_end_date: seg.endDate ?? null,
              segment_start_time: seg.startTime ? seg.startTime + ":00+06" : null,
              segment_end_time: seg.endTime ? seg.endTime + ":00+06" : null,
            }))
          : [];

        const tags_data = form.tags.map(tag => ({ skill_id: tag.skill_id }));

        console.log("RPC payload:", { event_data, segments_data, tags_data });

        // RPC call
        const { data, error } = await supabase.rpc("create_event_with_segments", {
          event_data,
          segments_data,
          tags_data,
        });

        if (error) {
          console.error("RPC error:", error);
          toast.error("Failed to save event: " + error.message);
          return;
        }
         
        toast.success("Event added successfully!");
        form.resetForm();
        onClose();
      } catch (err: any) {
        console.error("Unexpected error:", err);
        toast.error("Failed to save event: " + (err.message ?? JSON.stringify(err)));
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
                error={!form.title}
                onChange={form.setTitle}
                description={form.description}
                onDescriptionChange={form.setDescription}
                location={form.location}             
                onLocationChange={form.setLocation}  
              />

            <SegmentList
              segments={form.segments}
              onAdd={form.addSegment}
              onUpdate={form.updateSegment}
              onRemove={form.removeSegment}
            />
            
            {/* Tags box with heading */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Tags</h3>

            {/* Input + Add button */}
            <div className="flex items-center gap-2 mb-3">
              <input
                type="text"
                value={form.searchTerm}
                onChange={(e) => form.setSearchTerm(e.target.value)}
                placeholder="Type to add tags"
                className="border px-3 py-2 rounded flex-1"
              />
              <button
                onClick={() => {
                  if (form.searchTerm.trim()) {
                    form.addTagFromSuggestion({ id: Date.now(), skill: form.searchTerm });
                  }
                }}
                className="bg-accent-lm text-background-lm px-3 py-1 rounded"
              >
                Add
              </button>
            </div>

            {/* Suggestions list */}
            {form.suggestions.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {form.suggestions.map(skill => (
                  <button
                    key={skill.id}
                    onClick={() => form.addTagFromSuggestion(skill)}
                    className="px-3 py-1 rounded-2xl bg-stroke-grey hover:bg-stroke-grey text-sm"
                  >
                    {skill.skill}
                  </button>
                ))}
              </div>
            )}

            {/* Selected tags as rounded accent chips */}
            <div className="flex flex-wrap gap-2">
              {form.tags.map(tag => (
                <span
                  key={tag.skill_id}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium  bg-accent-lm text-background-lm"
                >
                  {tag.name}
                  <button
                    onClick={() => form.removeTag(tag.skill_id)}
                    className="ml-2 text-background-lm hover:text-stroke-peach"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </div>


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
