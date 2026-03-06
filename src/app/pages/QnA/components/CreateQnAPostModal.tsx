import { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { Tag as LucideTag } from "lucide-react";

import { supabase } from "@/supabase/supabaseClient";
import crossBtn from "@/assets/icons/cross_btn.svg";
import { ButtonCTA } from "@/components/ButtonCTA";
import ImageUploader from "@/app/pages/Events/components/CreateEventModal/ImageUploader";
import ImagePreview from "@/app/pages/Events/components/CreateEventModal/ImagePreview";
import { MAX_POST_ATTACHMENTS, tryReplacePostAttachments } from "@/utils/postAttachments";

type QnATag = "Question" | "Advice" | "Resource";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function getScalarId(v: unknown): string | number | null {
  if (!isRecord(v)) return null;
  const id = v.category_id ?? v.post_id;
  return typeof id === "string" || typeof id === "number" ? id : null;
}

export function CreateQnAPostModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (postId: string) => void;
}) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tag, setTag] = useState<QnATag | null>(null);
  const [isPosting, setIsPosting] = useState(false);

  const [imageDataUrls, setImageDataUrls] = useState<string[]>([]);
  const [imageNames, setImageNames] = useState<string[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  useEffect(() => {
    if (!open) return;
    setImageDataUrls([]);
    setImageNames([]);
    setPreviewOpen(false);
    setPreviewIndex(0);
  }, [open]);

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

  if (!open) return null;

  async function handlePost() {
    setIsPosting(true);

    if (formRef.current) {
      const valid = formRef.current.reportValidity();
      if (!valid) {
        const invalids = Array.from(formRef.current.querySelectorAll(":invalid")) as HTMLElement[];
        invalids.forEach((el) => {
          const prev = el.style.boxShadow;
          el.style.boxShadow = "0 0 0 3px rgba(194,61,0,0.18)";
          setTimeout(() => {
            el.style.boxShadow = prev;
          }, 3000);
        });
        if (invalids[0]) invalids[0].focus();
        toast.error("Please fill all required fields");
        setIsPosting(false);
        return;
      }
    }

    if (!tag) {
      toast.error("Please select a tag");
      setIsPosting(false);
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
        toast.error("You must be logged in to create a post.");
        setIsPosting(false);
        return;
      }

      const { data: categoryRow, error: categoryError } = await supabase
        .from("qna_category")
        .select("category_id")
        .eq("category_name", tag)
        .maybeSingle();

      if (categoryError) throw categoryError;
      const categoryId = getScalarId(categoryRow);
      if (categoryId === null || categoryId === undefined) {
        toast.error("Failed to find tag category.");
        setIsPosting(false);
        return;
      }

      const { data: createdPost, error: createError } = await supabase
        .from("all_posts")
        .insert([
          {
            type: "qna",
            title: title.trim(),
            description: description.trim(),
            author_id: authUid,
          },
        ])
        .select("post_id")
        .single();

      if (createError) throw createError;

      const postIdValue = getScalarId(createdPost);
      if (typeof postIdValue !== "string") {
        throw new Error("Failed to create post");
      }

      const postId = postIdValue;

      const { error: qnaError } = await supabase.from("qna_posts").insert([
        {
          post_id: postId,
          category_id: categoryId,
          img_url: imageDataUrls[0] ?? null,
        },
      ]);

      if (qnaError) {
        await supabase.from("all_posts").delete().eq("post_id", postId);
        throw qnaError;
      }

      toast.success("Post added successfully!");
      setTitle("");
      setDescription("");
      setTag(null);

      await tryReplacePostAttachments(postId, imageDataUrls);

      onClose();
      onCreated(postId);
    } catch (e: unknown) {
      console.error(e);
      const message = e instanceof Error ? e.message : "Unknown error";
      toast.error("Failed to save post: " + message);
    } finally {
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
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 8,
            boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
            maxHeight: "calc(100vh - 96px)",
            overflowY: "auto",
          }}
        >
          {/* modal header */}
          <div className="lg:flex lg:justify-between lg:items-center lg:mb-6">
            <h2 className="text-xl lg:font-semibold text-text-lm">New Post</h2>
            <button
              onClick={onClose}
              className="cursor-pointer"
              aria-label="Close modal"
              type="button"
            >
              <img src={crossBtn} />
            </button>
          </div>

          <form
            ref={formRef}
            className="lg:space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              void handlePost();
            }}
          >
            <div className="bg-secondary-lm lg:p-5 border border-stroke-grey rounded-xl lg:space-y-4">
              <div className="lg:space-y-2">
                <p className="font-medium text-md text-text-lm">Title</p>
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Type a title"
                  className="border px-3 py-2 rounded-lg w-full bg-primary-lm border-stroke-grey focus:outline-0 focus:border-accent-lm"
                />
              </div>

              <div className="lg:space-y-2">
                <p className="font-medium text-text-lm text-md">Description</p>
                <textarea
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Type a description"
                  rows={5}
                  className="border px-3 py-2 rounded-lg w-full bg-primary-lm border-stroke-grey focus:outline-0 focus:border-accent-lm resize-none"
                />
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <LucideTag size={18} className="text-accent-lm" />
                  <p className="font-medium text-text-lm text-md">Tag</p>
                </div>

                <div className="flex items-center gap-2">
                  {(["Question", "Advice", "Resource"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTag(t)}
                      aria-pressed={tag === t}
                      className={`w-fit lg:px-2.5 lg:py-0.5 text-sm border rounded-xl transition cursor-pointer ${
                        tag === t
                          ? "bg-accent-lm text-primary-lm border-accent-lm"
                          : "bg-hover-lm text-accent-lm border-stroke-peach hover:bg-accent-lm/70 hover:text-primary-lm hover:border-accent-lm"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
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
        open={previewOpen}
        image={imageDataUrls[previewIndex] ?? null}
        name={imageNames[previewIndex] ?? null}
        onClose={() => setPreviewOpen(false)}
      />
    </>
  );
}
