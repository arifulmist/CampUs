// src/components/CreateEventModal.tsx
import React, { useEffect, useState } from "react";
import type { EventPostType, Segment } from "./EventPost";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (post: EventPostType) => void;
}

function generateId() {
  return Date.now().toString() + Math.random().toString(36).slice(2);
}

export default function CreateEventModal({ open, onClose, onCreate }: Props) {
  const [category, setCategory] = useState<
    "workshop" | "seminar" | "course" | "competition"
  >("workshop");
  const [title, setTitle] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]); // no default tags
  const [segments, setSegments] = useState<Segment[]>([
    { id: generateId(), name: "", description: "", date: "", time: "" },
  ]);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);

  // validation state for title
  const [titleError, setTitleError] = useState(false);

  // preview modal open state (for expanded image view)
  const [previewOpen, setPreviewOpen] = useState(false);

  // Reset function to clear the form
  function resetForm() {
    setCategory("workshop");
    setTitle("");
    setTagInput("");
    setTags([]);
    setSegments([{ id: generateId(), name: "", description: "", date: "", time: "" }]);
    setImageDataUrl(null);
    setImageName(null);
    setTitleError(false);
    setPreviewOpen(false);
  }

  // Ensure the modal opens with cleared state every time `open` becomes true
  useEffect(() => {
    if (open) {
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous || "";
    };
  }, [open]);

  // close expanded preview on Escape
  useEffect(() => {
    if (!previewOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [previewOpen]);

  function addSegment() {
    setSegments(prev => [
      ...prev,
      { id: generateId(), name: "", description: "", date: "", time: "" },
    ]);
  }

  function updateSegment(id: string, data: Partial<Segment>) {
    setSegments(prev =>
      prev.map(seg => (seg.id === id ? { ...seg, ...data } : seg))
    );
  }

  function removeSegment(id: string) {
    setSegments(prev => prev.filter(seg => seg.id !== id));
  }

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageName(file.name ?? null);

    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  function addTag() {
    const t = tagInput.trim();
    if (!t) return;
    // preserve uniqueness
    setTags(prev => [...new Set([...prev, t])]);
    setTagInput("");
  }

  function removeTag(tag: string) {
    setTags(prev => prev.filter(t => t !== tag));
  }

  function handlePost() {
    // make title mandatory
    if (!title.trim()) {
      setTitleError(true);
      return;
    }

    const post: EventPostType = {
      id: generateId(),
      category,
      title,
      author: "You",
      excerpt: title,
      body: "",
      image: imageDataUrl,
      segments,
      tags
    };

    onCreate(post);

    // clear internal state immediately so nothing lingers
    resetForm();

    // then tell parent to close
    onClose();
  }

  // clear title error when user types
  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setTitle(v);
    if (titleError && v.trim()) setTitleError(false);
  }

  if (!open) return null;

  return (
    <>
      {/* OVERLAY (below modal) */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        style={{
          backgroundColor: "rgba(14,21,31,0.35)",
        }}
      />

      {/* MODAL WRAPPER (above overlay) */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
        <div
          // Actual modal card: SOLID white, fixed max height and scrollable content
          className="w-full max-w-3xl p-6 border border-stroke-grey"
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "8px",
            boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
            // keep modal from growing beyond viewport and make it scrollable
            maxHeight: "calc(100vh - 96px)",
            overflowY: "auto",
          }}
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-text-lm">Announce Event</h2>
            <button
              onClick={onClose}
              className="text-text-lighter-lm text-2xl hover:text-gray-900"
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>

          <div className="space-y-6">
            {/* Category */}
            <div className="flex gap-6">
              {["Workshop", "Seminar", "Course", "Competition"].map(c => (
                <label key={c} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="category"
                    checked={category === c.toLowerCase()}
                    onChange={() => setCategory(c.toLowerCase() as any)}
                  />
                  <span>{c}</span>
                </label>
              ))}
            </div>

            <hr className="border-stroke-grey" />

            {/* Title */}
            <div>
              <h3 className="mb-2 text-lg font-medium">Title</h3>
              <input
                className={`w-full border border-stroke-grey rounded-lg px-4 py-2 focus:outline-none focus:ring-1 focus:ring-[#C23D00] ${
                  titleError ? "border-red-500" : ""
                }`}
                placeholder="Enter event title"
                value={title}
                onChange={handleTitleChange}
              />
              {titleError && (
                <p className="text-sm text-red-600 mt-1">Title field is mandatory.</p>
              )}
            </div>

            {/* Segment list */}
            <div>
              <div className="flex items-center mb-4">
                <div className="flex-1 h-px bg-gray-300" />
                <h3 className="px-4 text-lg text-text-lm font-medium">Segment</h3>
                <div className="flex-1 h-px bg-gray-300" />
              </div>

              {segments.map((seg, idx) => (
                <div
                  key={seg.id}
                  className="mb-4 border border-stroke-grey bg-secondary-lm rounded-lg p-4"
                >
                  <div className="mb-3">
                    <div className="flex justify-between items-center text-text-lm">
                      <strong>Name</strong>
                      {segments.length > 1 && (
                        <button
                          onClick={() => removeSegment(seg.id)}
                          className="text-sm text-text-lighter-lm hover:text-gray-700"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <input
                      className="w-full border border-stroke-grey bg-primary-lm rounded-lg px-3 py-2 mt-1"
                      value={seg.name}
                      onChange={e => updateSegment(seg.id, { name: e.target.value })}
                    />
                  </div>

                  <div className="mb-3">
                    <strong>Description</strong>
                    <textarea
                      className="w-full border border-stroke-grey bg-primary-lm rounded-lg px-3 py-2 mt-1"
                      rows={3}
                      value={seg.description}
                      onChange={e =>
                        updateSegment(seg.id, { description: e.target.value })
                      }
                    />
                  </div>

                  <div className="border border-stroke-grey bg-primary-lm rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="text-text-lm">
                        <tr>
                          <th className="px-4 py-2 border-r">Date</th>
                          <th className="px-4 py-2">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border-r">
                            <input
                              type="date"
                              className="w-full px-4 py-2"
                              value={seg.date}
                              onChange={e =>
                                updateSegment(seg.id, { date: e.target.value })
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="time"
                              className="w-full px-4 py-2"
                              value={seg.time}
                              onChange={e =>
                                updateSegment(seg.id, { time: e.target.value })
                              }
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              <div className="text-right">
                <button
                  onClick={addSegment}
                  className="bg-accent-lm text-primary-lm px-5 py-2 rounded-full"
                  style={{ color: "white" }}
                >
                  + Add segment
                </button>
              </div>
            </div>

            <hr className="border-stroke-grey" />

            {/* Tags */}
            <div>
              <h3 className="mb-2 text-lg text-text-lm font-medium">Tags</h3>
              <div className="flex gap-2 mb-3">
                {tags.length > 0 &&
                  tags.map(t => (
                    <span
                      key={t}
                      className="border border-accent-lm text-accent-lm rounded-full px-3 py-1 text-sm"
                    >
                      #{t}
                    </span>
                  ))}
              </div>
              <div className="flex gap-2 items-center">
                <input
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  className="flex-1 border border-stroke-grey rounded-lg px-3 py-2"
                  placeholder="Add tag (press Add)"
                />
                <button
                  onClick={addTag}
                  className="bg-accent-lm text-primary-lm px-3 py-2 rounded-lg"
                  style={{ color: "white" }}
                >
                  Add
                </button>
              </div>
            </div>

            {/* Upload */}
            <div>
              <label className="block mb-2 font-medium">Upload Image</label>
              <div className="flex gap-3 items-center">
                <label
                  className="bg-accent-lm text-primary-lm px-5 py-2 rounded-lg cursor-pointer"
                  style={{ color: "white" }}
                >
                  Choose File
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImage}
                  />
                </label>

                {/* preview area */}
                <div className="flex-1 border border-stroke-grey rounded-lg px-3 py-2 flex items-center">
                  {!imageDataUrl ? (
                    <div className="text-sm text-text-lighter-lm">No file chosen</div>
                  ) : (
                    <div className="flex items-center gap-3">
                      {/* clickable thumbnail */}
                      <button
                        type="button"
                        onClick={() => setPreviewOpen(true)}
                        className="inline-block rounded-md overflow-hidden border border-stroke-grey"
                        aria-label="Open image preview"
                      >
                        <img
                          src={imageDataUrl}
                          alt={imageName ?? "Selected image"}
                          className="h-20 w-28 object-cover"
                        />
                      </button>

                      <div className="flex flex-col">
                        <div className="text-sm font-medium text-text-lm">
                          {imageName ?? "Image selected"}
                        </div>
                        <div className="text-xs text-text-lighter-lm">Click to expand</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="text-right pt-4">
              <button
                onClick={handlePost}
                className="bg-[#C23D00] text-white px-6 py-2 rounded-full"
                style={{ color: "white" }}
              >
                Post
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded image preview lightbox */}
      {previewOpen && imageDataUrl && (
        <>
          <div
            className="fixed inset-0 z-60"
            onClick={() => setPreviewOpen(false)}
            style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
          />
          <div className="fixed inset-0 z-70 flex items-center justify-center p-6 pointer-events-none">
            <div
              className="pointer-events-auto max-w-[90vw] max-h-[90vh] relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setPreviewOpen(false)}
                className="absolute top-2 right-2 z-80 rounded-full bg-white/90 p-2 border border-stroke-grey"
                aria-label="Close preview"
              >
                ✕
              </button>
              <img
                src={imageDataUrl}
                alt={imageName ?? "Selected image preview"}
                className="max-w-full max-h-[80vh] object-contain rounded-md shadow-lg"
              />
              {imageName && (
                <div className="mt-2 text-sm text-center text-text-lighter-lm">
                  {imageName}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
