import React from "react";
import type { EventPostType } from "../EventPost";
import CategorySelector from "./CategorySelector";
import TitleInput from "./TitleInput";
import SegmentList from "./SegmentList";
import TagInput from "./TagInput";
import ImageUploader from "./ImageUploader";
import ImagePreview from "./ImagePreview";
import { useCreateEventForm } from "./useCreateEventForm";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (post: EventPostType) => void;
}

export default function CreateEventModal({ open, onClose, onCreate }: Props) {
  const form = useCreateEventForm(open);

  if (!open) return null;

  function handlePost() {
    if (!form.validate()) return;
    onCreate(form.buildPost());
    form.resetForm();
    onClose();
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
            <TitleInput value={form.title} error={form.titleError} onChange={form.setTitle} />
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
