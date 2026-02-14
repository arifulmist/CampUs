import React, { useRef, useState } from "react";
import type { EventPostType } from "../../components/EventPost";
import CategorySelector from "./CategorySelector";
import TitleInput from "./TitleInput";
import SegmentList from "./SegmentList";
import TagInput from "./TagInput";
import ImageUploader from "./ImageUploader";
import ImagePreview from "./ImagePreview";
import { useCreateEventForm } from "./useCreateEventForm";
import { createEvent } from "../../backend/eventService";
import { supabase } from "../../../../../../supabase/supabaseClient";
import crossBtn from "@/assets/icons/cross_btn.svg";
import { ensureSkillId } from "../../backend/skillsService";
import { toast } from "react-hot-toast";
import { ButtonCTA } from "@/components/ButtonCTA";
interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (post: EventPostType) => void;
}

export default function CreateEventModal({ open, onClose, onCreate }: Props) {
  const form = useCreateEventForm(open);
  const formRef = useRef<HTMLFormElement | null>(null);
  const tagInputRef = useRef<HTMLInputElement | null>(null);
  const [isPosting, setIsPosting] = useState(false);

  if (!open) return null;




    async function handlePost() {
    

      setIsPosting(true);
      // Use browser native validation first so required fields show native messages
      if (formRef.current) {
        const valid = formRef.current.reportValidity();
        if (!valid) {
          // highlight all invalid fields briefly and focus first
          const invalids = Array.from(formRef.current.querySelectorAll(':invalid')) as HTMLElement[];
          invalids.forEach(el => {
            const prev = el.style.boxShadow;
            el.style.boxShadow = '0 0 0 3px rgba(194,61,0,0.18)';
            setTimeout(() => { el.style.boxShadow = prev; }, 3000);
          });
          if (invalids[0]) invalids[0].focus();
          toast.error("Please fill all required fields");
          setIsPosting(false);
          return;
        }
      }

      // Ensure at least one tag selected
      if (form.tags.length === 0) {
        toast.error("Please fill all required fields");
        if (tagInputRef.current) {
          tagInputRef.current.focus();
        }
        setIsPosting(false);
        return;
      }

      if (!form.validate()) {
        setIsPosting(false);
        return;
      }

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
              event_start_date: form.eventStartDate ?? post.segments?.[0]?.startDate ?? null,
              event_end_date: form.eventEndDate ?? post.segments?.[0]?.endDate ?? null,
            
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

        console.log("Event payload:", { event_data, segments_data, tags_data });

        // Use client-side multi-insert helper instead of RPC (server function still references removed column)
        try {
          await createEvent({
            type: event_data.type,
            title: event_data.title,
            description: event_data.description,
            author_id: event_data.author_id,
            location: event_data.location,
            event_start_date: event_data.event_start_date,
            event_end_date: event_data.event_end_date,
            registration_link: event_data.registration_link ?? null,
            img_url: event_data.img_url ?? null,
            category_id: event_data.category_id,
            segments: segments_data,
            tags: tags_data,
          });
        } catch (err: any) {
          console.error("createEvent error:", err);
          toast.error("Failed to save event: " + (err.message ?? JSON.stringify(err)));
          setIsPosting(false);
          return;
        }
        toast.success("Event added successfully!");
        form.resetForm();
        // reload page to ensure fresh data
        window.location.reload();
      } catch (err: any) {
        console.error("Unexpected error:", err);
        toast.error("Failed to save event: " + (err.message ?? JSON.stringify(err)));
        setIsPosting(false);
      }
    }



  return (
    <>
      {/* overlay */}
      <div
        className="lg:fixed lg:inset-0 lg:z-50"
        onClick={onClose}
        style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      />

      {/* modal wrapper */}
      <div className="lg:fixed lg:inset-0 lg:z-51 lg:flex lg:items-center lg:justify-center lg:p-6">
        <div
          className="lg:w-full lg:max-w-3xl lg:p-10 lg:border border-stroke-grey"
          onClick={e => e.stopPropagation()}
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 8,
            boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
            maxHeight: "calc(100vh - 96px)",
            overflowY: "auto",
          }}
        >
          {/* modal header  */}
          <div className="lg:flex lg:justify-between lg:items-center lg:mb-6">
            <h2 className="text-xl lg:font-semibold text-text-lm">
              Announce Event
            </h2>
            <button
              onClick={onClose}
              className="text-text-lighter-lm text-2xl hover:text-gray-900"
              aria-label="Close modal"
            >
              <img src={crossBtn}></img>
            </button>
          </div>

          <form ref={formRef} className="lg:space-y-6" onSubmit={e => { e.preventDefault(); void handlePost(); }}>
            <CategorySelector category={form.category} onChange={form.setCategory} />
           <div className="bg-secondary-lm lg:p-5 border border-stroke-grey rounded-lg">
              <TitleInput
                value={form.title}
                onChange={form.setTitle}
                description={form.description}
                onDescriptionChange={form.setDescription}
                location={form.location}
                onLocationChange={form.setLocation}
                startDate={form.eventStartDate}
                onStartDateChange={form.setEventStartDate}
                endDate={form.eventEndDate}
                onEndDateChange={form.setEventEndDate}
              />

            {/* Add Segment button shown when no segments exist */}
            {form.segments.length === 0 ? (
              <div className="text-right">
                <button
                  onClick={() => form.addSegment()}
                  className="bg-accent-lm text-primary-lm font-medium px-5 py-2 rounded-lg hover:bg-hover-btn-lm transition duration-150 cursor-pointer lg:mt-5"
                >
                  + Add segment
                </button>
              </div>
            ) : (
              <SegmentList
                segments={form.segments}
                onAdd={form.addSegment}
                onUpdate={form.updateSegment}
                onRemove={form.removeSegment}
                parentOnline={form.location === "Online"}
              />
            )}
            
            {/* Tags box with heading */}
          <div>
            <h6 className="font-medium mb-2">Tags</h6>

            {/* Input + Add button */}
            <div className="flex items-center gap-2 mb-3">
              <input
                type="text"
                ref={tagInputRef}
                value={form.searchTerm}
                onChange={(e) => form.setSearchTerm(e.target.value)}
                placeholder="Type to add tags"
                className="border px-3 py-2 rounded-lg flex-1 bg-primary-lm border-stroke-grey focus:outline-0 focus:border-accent-lm"
              />
              <button
                onClick={() => {
                  if (form.searchTerm.trim()) {
                    form.addTagFromSuggestion({ id: Date.now(), skill: form.searchTerm });
                  }
                }}
                className="bg-accent-lm text-primary-lm font-medium px-4 py-2 rounded-lg hover:bg-hover-btn-lm transition duration-150 cursor-pointer"
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
                    className="px-3 py-1 rounded-2xl text-accent-lm bg-primary-lm border border-stroke-peach hover:bg-hover-lm duration-150 transition text-sm"
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
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium  bg-accent-lm text-primary-lm"
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
                onRemove={() => {
                  form.setImageDataUrl(null);
                  form.setImageName(null);
                }}
            />
            </div>

            <div className="text-right lg:pt-4">
              <ButtonCTA
                type="submit"
                label={isPosting ? "Posting..." : "Post"}
                loading={isPosting}
                disabled={isPosting}
              />
            </div>
          </form>
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
