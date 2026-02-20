import { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { Tag as LucideTag } from "lucide-react";

import crossBtn from "@/assets/icons/cross_btn.svg";
import { ButtonCTA } from "@/components/ButtonCTA";
import { supabase } from "@/supabase/supabaseClient";
import { updateQnaPost } from "../backend/qnaService";

type QnATag = "Question" | "Advice" | "Resource";

type EditInitial = {
  postId: string;
  title: string;
  description: string;
  tag: QnATag;
};

export function EditQnAPostModal({
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
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tag, setTag] = useState<QnATag | null>(null);
  const [isPosting, setIsPosting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(initial.title);
    setDescription(initial.description);
    setTag(initial.tag);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial.postId]);

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
        toast.error("You must be logged in to edit this post.");
        setIsPosting(false);
        return;
      }

      await updateQnaPost({
        postId: initial.postId,
        authorId: authUid,
        title,
        description,
        tag,
      });

      toast.success("Post updated successfully!");
      setIsPosting(false);
      onClose();
      onSaved();
    } catch (e: unknown) {
      console.error(e);
      const message = e instanceof Error ? e.message : "Unknown error";
      toast.error("Failed to save post: " + message);
      setIsPosting(false);
    }
  }

  return (
    <>
      {/* overlay */}
      <div
        className="lg:fixed lg:inset-0 lg:z-50"
        onClick={() => {
          if (!isPosting) onClose();
        }}
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
            <h2 className="text-xl lg:font-semibold text-text-lm">Edit Post</h2>
            <button
              onClick={() => {
                if (!isPosting) onClose();
              }}
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
                          : "bg-hover-lm text-accent-lm border-stroke-peach hover:bg-accent-lm hover:text-primary-lm hover:border-accent-lm"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 lg:pt-4">
              <button
                type="button"
                disabled={isPosting}
                onClick={() => {
                  if (!isPosting) onClose();
                }}
                className="bg-secondary-lm text-text-lm border border-stroke-grey px-4 py-2 rounded-lg hover:bg-hover-lm transition duration-150 disabled:opacity-60"
              >
                Cancel
              </button>
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
    </>
  );
}
