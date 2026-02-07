import { useCreateEventForm } from "./useCreateEventForm";
import CategorySelector from "./CategorySelector";
import TitleInput from "./TitleInput";
import SegmentList from "./SegmentList";
import TagInput from "./TagInput";
import ImageUploader from "./ImageUploader";
import ImagePreview from "./ImagePreview";
import type { EventPostType } from "../types";

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
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg w-full max-w-3xl"
             onClick={e => e.stopPropagation()}>

          <h2 className="text-xl font-semibold mb-4">Announce Event</h2>

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

          <div className="text-right mt-6">
            <button
              onClick={handlePost}
              className="bg-[#C23D00] text-white px-6 py-2 rounded-full">
              Post
            </button>
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
