import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import crossBtn from "@/assets/icons/cross_btn.svg";
import { toast } from "react-hot-toast";

import CategorySelector from "./CreateEventModal/CategorySelector";
import TitleInput from "./CreateEventModal/TitleInput";
import SegmentList from "./CreateEventModal/SegmentList";
import ImageUploader from "./CreateEventModal/ImageUploader";
import ImagePreview from "./CreateEventModal/ImagePreview";
import { useCreateEventForm } from "./CreateEventModal/useCreateEventForm";
import { supabase } from "@/supabase/supabaseClient";
import { updateEvent } from "../backend/eventService";
import { ButtonCTA } from "@/components/ButtonCTA";

type EditInitial = {
  postId: string;
  title: string;
  description: string;
  location: string;
  categoryId: number;
  eventStartDate: string;
  eventEndDate: string;
  imageUrl: string | null;
  segments: Array<{
    id: string;
    name: string;
    description: string;
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    location?: string;
  }>;
  tags: Array<{ skill_id: number; name: string }>;
};

export function EditEventModal({
  open,
  onClose,
  initial,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  initial: EditInitial;
  onSaved: () => void;
}) {
  const form = useCreateEventForm(open);
  const formRef = useRef<HTMLFormElement | null>(null);
  const tagInputRef = useRef<HTMLInputElement | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    form.setCategory(initial.categoryId);
    form.setTitle(initial.title);
    form.setDescription(initial.description);
    form.setLocation(initial.location);
    form.setEventStartDate(initial.eventStartDate);
    form.setEventEndDate(initial.eventEndDate);
    form.setSegments(
      initial.segments.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        startDate: s.startDate,
        endDate: s.endDate,
        startTime: s.startTime,
        endTime: s.endTime,
        location: s.location ?? "",
      }))
    );
    form.setTags(initial.tags);
    form.setImageDataUrl(initial.imageUrl);
    form.setImageName(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial.postId]);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  async function handleSave() {
    setIsSaving(true);

    if (formRef.current) {
      const valid = formRef.current.reportValidity();
      if (!valid) {
        const invalids = Array.from(formRef.current.querySelectorAll(":invalid")) as HTMLElement[];
        if (invalids[0]) invalids[0].focus();
        toast.error("Please fill all required fields");
        setIsSaving(false);
        return;
      }
    }

    if (form.tags.length === 0) {
      toast.error("Please fill all required fields");
      tagInputRef.current?.focus();
      setIsSaving(false);
      return;
    }

    if (!form.validate()) {
      setIsSaving(false);
      return;
    }

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) throw authError;

      const authUid = user?.id;
      if (!authUid) {
        toast.error("You must be logged in to edit this post.");
        setIsSaving(false);
        return;
      }

      await updateEvent(initial.postId, {
        type: "event",
        title: form.title,
        description: form.description ?? "",
        author_id: authUid,
        location: form.location ?? "",
        event_start_date: form.eventStartDate ?? null,
        event_end_date: form.eventEndDate ?? null,
        registration_link: null,
        img_url: form.imageDataUrl ?? null,
        category_id: form.category,
        segments: (form.segments ?? []).map((seg) => ({
          segment_title: seg.name ?? "Untitled Segment",
          segment_description: seg.description ?? "",
          segment_location: seg.location ?? null,
          segment_start_date: seg.startDate ?? null,
          segment_end_date: seg.endDate ?? null,
          segment_start_time: seg.startTime ? seg.startTime + ":00+06" : null,
          segment_end_time: seg.endTime ? seg.endTime + ":00+06" : null,
        })),
        tags: form.tags.map((t) => ({ skill_id: t.skill_id })),
      });

      toast.success("Event updated successfully!");
      setIsSaving(false);
      onClose();
      onSaved();
    } catch (err: unknown) {
      console.error("Failed to update event:", err);
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      toast.error("Failed to update event: " + msg);
      setIsSaving(false);
    }
  }

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-1000"
        onClick={() => {
          if (!isSaving) onClose();
        }}
        style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      />

      <div className="fixed inset-0 z-1001 flex items-center justify-center p-6">
        <div
          className="lg:w-full lg:max-w-3xl lg:p-10 lg:border border-stroke-grey"
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 8,
            boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
            maxHeight: "calc(100vh - 96px)",
            overflowY: "auto",
          }}
        >
          <div className="lg:flex lg:justify-between lg:items-center lg:mb-6">
            <h2 className="text-xl lg:font-semibold text-text-lm">Edit Event</h2>
            <button
              onClick={() => {
                if (!isSaving) onClose();
              }}
              className="cursor-pointer"
              aria-label="Close modal"
            >
              <img src={crossBtn} />
            </button>
          </div>

          <form
            ref={formRef}
            className="lg:space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSave();
            }}
          >
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

              <SegmentList
                segments={form.segments}
                onAdd={form.addSegment}
                onUpdate={form.updateSegment}
                onRemove={form.removeSegment}
                parentOnline={form.location === "Online"}
              />

              <div>
                <h6 className="font-medium mb-2">Tags</h6>
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
                    type="button"
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

                {form.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {form.suggestions.map((skill) => (
                      <button
                        type="button"
                        key={skill.id}
                        onClick={() => form.addTagFromSuggestion(skill)}
                        className="px-3 py-1 rounded-2xl text-accent-lm bg-primary-lm border border-stroke-peach hover:bg-hover-lm duration-150 transition text-sm"
                      >
                        {skill.skill}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {form.tags.map((tag) => (
                    <span
                      key={tag.skill_id}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium  bg-accent-lm text-primary-lm"
                    >
                      {tag.name}
                      <button
                        type="button"
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

            <div className="flex justify-end gap-3 lg:pt-4">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => {
                  if (!isSaving) onClose();
                }}
                className="bg-secondary-lm text-text-lm border border-stroke-grey px-4 py-2 rounded-lg hover:bg-hover-lm transition duration-150 disabled:opacity-60"
              >
                Cancel
              </button>
              <ButtonCTA
                type="submit"
                label={isSaving ? "Saving..." : "Save"}
                loading={isSaving}
                disabled={isSaving}
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
    </>,
    document.body
  );
}
