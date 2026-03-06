import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import crossBtn from "@/assets/icons/cross_btn.svg";
import { toast } from "react-hot-toast";

import ImagePreview from "@/app/pages/Events/components/CreateEventModal/ImagePreview";
import ImageUploader from "@/app/pages/Events/components/CreateEventModal/ImageUploader";
import CategorySelector from "@/components/CategorySelector";
import { ButtonCTA } from "@/components/ButtonCTA";
import { supabase } from "@/supabase/supabaseClient";
import { updateLostAndFoundPost } from "../backend/lostAndFoundService";
import { MAX_POST_ATTACHMENTS, tryReplacePostAttachments } from "@/utils/postAttachments";

type EditInitial = {
  postId: string;
  category: "lost" | "found";
  title: string;
  description: string;
  dateLostOrFound: string | null;
  timeLostOrFound: string | null;
  imageUrl: string | null;
  imageUrls?: string[];
};

export function EditLostFoundModal({
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
  const formRef = useRef<HTMLFormElement | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [category, setCategory] = useState<"lost" | "found">("lost");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState<string>("");
  const [time, setTime] = useState<string>("");
  const [imageDataUrls, setImageDataUrls] = useState<string[]>([]);
  const [imageNames, setImageNames] = useState<string[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  useEffect(() => {
    if (!open) return;
    setCategory(initial.category);
    setTitle(initial.title);
    setDescription(initial.description);
    setDate(initial.dateLostOrFound ?? "");
    setTime(initial.timeLostOrFound ?? "");
    setImageDataUrls(
      Array.isArray(initial.imageUrls) && initial.imageUrls.length
        ? initial.imageUrls
        : (initial.imageUrl ? [initial.imageUrl] : [])
    );
    setImageNames([]);
    setPreviewIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial.postId]);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.onload = () => {
        if (typeof reader.result === "string") resolve(reader.result);
        else reject(new Error("Unexpected file result"));
      };
      reader.readAsDataURL(file);
    });
  }

  async function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const remaining = Math.max(0, MAX_POST_ATTACHMENTS - imageDataUrls.length);
    if (remaining <= 0) {
      toast.error("Cannot add more than 5 images");
      return;
    }

    if (files.length > remaining) {
      toast.error("Cannot add more than 5 images");
    }

    const selected = files.slice(0, remaining);
    const urls = await Promise.all(selected.map((f) => fileToDataUrl(f)));
    setImageDataUrls((prev) => [...prev, ...urls]);
    setImageNames((prev) => [...prev, ...selected.map((f) => f.name)]);
  }

  function removeImageAt(index: number) {
    setImageDataUrls((prev) => prev.filter((_, i) => i !== index));
    setImageNames((prev) => prev.filter((_, i) => i !== index));
    setPreviewIndex((prev) => {
      if (index < prev) return prev - 1;
      if (index === prev) return 0;
      return prev;
    });
  }

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

      await updateLostAndFoundPost({
        postId: initial.postId,
        updates: {
          category,
          title: title.trim(),
          description: description.trim(),
          dateLostOrFound: date || null,
          timeLostOrFound: time || null,
          imgUrl: imageDataUrls[0] ?? null,
        },
      });

      await tryReplacePostAttachments(initial.postId, imageDataUrls);

      toast.success("Post updated successfully!");
      setIsSaving(false);
      onClose();
      onSaved();
    } catch (err: unknown) {
      console.error("Failed to update lost & found post:", err);
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      toast.error("Failed to update post: " + msg);
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
            <h2 className="text-xl lg:font-semibold text-text-lm">Edit Post</h2>
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
            <div className="flex flex-col gap-2">
              <label className="text-text-lm font-semibold">Category</label>
              <div>
                <CategorySelector
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  value={category as any}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onChange={(v: any) => setCategory(v as "lost" | "found")}
                  options={[{ value: "lost", label: "Lost" }, { value: "found", label: "Found" }]}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-text-lm font-semibold">Title</label>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-secondary-lm border border-stroke-grey rounded-lg px-3 py-2 text-text-lm"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-text-lm font-semibold">Description</label>
              <textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-secondary-lm border border-stroke-grey rounded-lg px-3 py-2 text-text-lm min-h-28"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-text-lm font-semibold">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-secondary-lm border border-stroke-grey rounded-lg px-3 py-2 text-text-lm"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-text-lm font-semibold">Time</label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="bg-secondary-lm border border-stroke-grey rounded-lg px-3 py-2 text-text-lm"
                />
              </div>
            </div>

            <ImageUploader
              images={imageDataUrls}
              imageNames={imageNames}
              onSelect={handleFileInput}
              onPreview={(idx) => {
                setPreviewIndex(typeof idx === "number" ? idx : 0);
                setPreviewOpen(true);
              }}
              onRemove={(idx) => {
                if (typeof idx !== "number") return;
                removeImageAt(idx);
              }}
            />

            <div className="flex justify-end gap-3">
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
                disabled={isSaving}
                loading={isSaving}
                label={isSaving ? "Saving..." : "Save"}
              />
            </div>
          </form>
        </div>
      </div>

      <ImagePreview
        open={previewOpen}
        image={imageDataUrls[previewIndex] ?? null}
        name={imageNames[previewIndex] ?? null}
        onClose={() => setPreviewOpen(false)}
      />
    </>,
    document.body
  );
}
