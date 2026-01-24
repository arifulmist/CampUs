import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Check, Tag as TagIcon } from "lucide-react";

type CollabPayload = {
  title: string;
  description: string;
  tags: string[];
  category: "research" | "competition" | "project";
};

export default function CreateCollabPost({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (payload: CollabPayload) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [category, setCategory] = useState<CollabPayload["category"]>("research");

  const [titleError, setTitleError] = useState(false);
  const [descriptionError, setDescriptionError] = useState(false);

  function addTag() {
    const v = tagInput.trim();
    if (v && !tags.includes(v)) setTags([...tags, v]);
    setTagInput("");
  }

  function handlePost() {
    const trimmedTitle = title.trim();
    const trimmedDesc = description.trim();

    let hasError = false;
    if (!trimmedTitle) {
      setTitleError(true);
      hasError = true;
    }
    if (!trimmedDesc) {
      setDescriptionError(true);
      hasError = true;
    }

    if (hasError) return;

    onCreate({ title: trimmedTitle, description: trimmedDesc, tags, category });

    // reset
    setTitle("");
    setDescription("");
    setTags([]);
    setTagInput("");
    setCategory("research");
    setTitleError(false);
    setDescriptionError(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-primary-lm border-stroke-grey text-text-lm lg:max-h-[80vh] lg:overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Collaboration</DialogTitle>
        </DialogHeader>

        <div className="lg:space-y-4 lg:px-0">
         {/* Title */}
<Input
  placeholder="Title"
  value={title}
  onChange={(e) => {
    setTitle(e.target.value);
    if (titleError && e.target.value.trim()) setTitleError(false);
  }}
  required
  className={`w-full bg-primary-lm border-stroke-grey text-text-lm placeholder:text-text-lighter-lm focus-visible:ring-accent-lm focus-visible:border-accent-lm ${
    titleError ? "border-red-500" : ""
            }`}
            />
            {titleError && (
            <p className="text-accent-lm">Required to fill this field.</p>
            )}

            {/* Description */}
            <Textarea
            placeholder="Description"
            rows={5}
            value={description}
            onChange={(e) => {
                setDescription(e.target.value);
                if (descriptionError && e.target.value.trim()) setDescriptionError(false);
            }}
            required
            className={`w-full bg-primary-lm border-stroke-grey text-text-lm placeholder:text-text-lighter-lm focus-visible:ring-accent-lm focus-visible:border-accent-lm ${
                descriptionError ? "border-accent-lm" : ""
            }`}
            />
            {descriptionError && (
            <p className="text-accent-lm">Required to fill this field.</p>
            )}


          {/* Tags */}
          <div className="lg:space-y-2">
            <div className="lg:flex lg:items-center lg:gap-2 text-text-lm">
              <TagIcon className="lg:h-4 lg:w-4 text-accent-lm" />
              <span className="text-sm lg:font-medium text-text-lm">Tag</span>
            </div>
            <div className="lg:flex lg:gap-2 lg:items-center">
              <Input
                placeholder="Add tag"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                className="bg-primary-lm border-stroke-grey text-text-lm placeholder:text-text-lighter-lm"
              />
              <Button onClick={addTag} className="bg-accent-lm text-primary-lm">
                Add
              </Button>
            </div>

            <div className="lg:flex lg:flex-wrap lg:gap-2">
              {tags.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTags(tags.filter((x) => x !== t))}
                  className="lg:inline-flex lg:items-center lg:gap-2 lg:rounded-full lg:px-3 lg:py-1 text-sm lg:border bg-primary-lm"
                >
                  #{t}
                </button>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div className="lg:space-y-2">
            <div className="lg:flex lg:items-center lg:gap-2 text-text-lm">
              <span className="text-sm lg:font-medium">Category</span>
            </div>
            <div className="lg:flex lg:flex-wrap lg:gap-2">
              {(["research", "competition", "project"] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  aria-pressed={category === cat}
                  className={`group inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm border transition focus:outline-none focus:ring-2 focus:ring-accent-lm ${
                    category === cat
                      ? "border-stroke-peach bg-secondary-lm text-accent-lm shadow-sm ring-2 ring-accent-lm"
                      : "border-stroke-grey bg-primary-lm text-text-lm hover:bg-hover-lm"
                  }`}
                >
                  {category === cat && <Check className="lg:h-3.5 lg:w-3.5 text-accent-lm" />}
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <Button
            className="lg:w-full bg-accent-lm hover:bg-hover-btn-lm text-primary-lm"
            onClick={handlePost}
          >
            Post
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
