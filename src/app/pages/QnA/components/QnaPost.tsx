import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tag as TagIcon, Check } from "lucide-react";
import toast from "react-hot-toast";
import {supabase} from "@/supabase/supabaseClient";

export default function QnaPost({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (payload: { title: string; description: string; tags: string[]; category: "Question" | "Advice" | "Resource"; imageFile?: File | null;   }) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [category, setCategory] = useState<"Question" | "Advice" | "Resource">("Question");
  const [titleError, setTitleError] = useState(false);
const [imageFile, setImageFile] = useState<File | null>(null);
const [imagePreview, setImagePreview] = useState<string | null>(null);
useEffect(() => {
  async function fetchSkills() {
    const { data, error } = await supabase.from("skills_lookup").select("skill");
    if (error) {
      console.error("Error fetching skills:", error);
    } else {
      setSkills(data.map((s) => s.skill));
    }
  }
  if (open) fetchSkills();
}, [open]);

 function addTag(t?: string) {
  const v = (t ?? tagInput).trim();
  if (!v) return;

  if (!skills.includes(v)) {
    toast.error("That tag is not available. Please choose from suggestions.");
    return;
  }

  if (!tags.includes(v)) setTags((p) => [...p, v]);
  setTagInput("");
}

  function removeTag(t: string) {
    setTags((p) => p.filter((x) => x !== t));
  }

  async function handlePost() {
  if (!title.trim()) {
    setTitleError(true);
    toast.error("Title is required");
    return;
  }

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      toast.error("You must be logged in to post");
      return;
    }

    let imgUrl: string | null = null;
    if (imageFile) {
      const filePath = `private/${crypto.randomUUID()}-${imageFile.name}`;
      const { error: uploadError } = await supabase
        .storage
        .from("post_images")
        .upload(filePath, imageFile);

      if (uploadError) {
        toast.error("Image upload failed");
        return;
      }

      const { data: publicUrl } = await supabase
        .storage
        .from("post_images")
        .getPublicUrl(filePath);
      imgUrl = publicUrl.publicUrl;
    }

   // Trim and ensure category is valid
const safeCategory = category.trim();

if (!safeCategory) {
  toast.error("Category is required");
  return;
}

const { data: categoryRow, error: catError } = await supabase
  .from("qna_category")
  .select("category_id")
  .ilike("category_name", safeCategory)
  .maybeSingle();

if (catError || !categoryRow) {
  console.error("Category fetch error:", catError);
  toast.error(`Invalid category selected: ${safeCategory}`);
  return;
}




    

    const categoryId = categoryRow.category_id;

    const { data: skillRows } = await supabase
      .from("skills_lookup")
      .select("id")
      .in("skill", tags);

    const skillIds = skillRows?.map(s => s.id) ?? [];

    const { data, error } = await supabase.rpc("create_qna_post", {
      p_title: title.trim(),
      p_description: description.trim(),
      p_author: user.id,
      p_category_id: categoryId,
      p_img_url: imgUrl,
      p_skill_ids: skillIds
    });

    if (error) {
      console.error(error);
      toast.error("Failed to create post");
      return;
    }

    toast.success("Post created successfully!");
    setTitle("");
    setDescription("");
    setTags([]);
    setTagInput("");
    setImageFile(null);
    setImagePreview(null);
    setTitleError(false);
    onOpenChange(false);

  } catch (err) {
    console.error(err);
    toast.error("Something went wrong while creating the post");
  }
}


  const filteredSuggestions =
  tagInput.trim().length >= 1
    ? skills.filter(
        (s) =>
          s.toLowerCase().includes(tagInput.toLowerCase()) &&
          !tags.includes(s)
      )
    : [];


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-primary-lm border-stroke-grey text-text-lm">
        <DialogHeader>
          <DialogTitle>New Post</DialogTitle>
        </DialogHeader>

        <div className="lg:space-y-4">
          <Input
            placeholder="Title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (titleError && e.target.value.trim()) setTitleError(false);
            }}
            className="bg-primary-lm border-stroke-grey text-text-lm placeholder:text-text-lighter-lm focus-visible:ring-accent-lm focus-visible:border-accent-lm"
          />
          {titleError && <p className="text-sm text-accent-lm">Title is required.</p>}

          <Textarea
            placeholder="Description"
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="bg-primary-lm border-stroke-grey text-text-lm placeholder:text-text-lighter-lm focus-visible:ring-accent-lm focus-visible:border-accent-lm"
          />

          <div className="lg:space-y-4">
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
 

                  {filteredSuggestions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {filteredSuggestions.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => addTag(s)}
                          className="px-2 py-1 rounded bg-secondary-lm text-sm hover:bg-hover-lm"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}

              <Button onClick={() => addTag()} className="bg-accent-lm text-primary-lm">
                Add
              </Button>
            </div>
            

            <div className="lg:flex lg:flex-wrap lg:gap-2">
              {tags.map((t) => (
                <button key={t} type="button" onClick={() => removeTag(t)} className="lg:inline-flex lg:items-center lg:gap-2 lg:rounded-full lg:px-3 lg:py-1 text-sm lg:border bg-primary-lm">
                  #{t}
                </button>
              ))}
            </div>
          </div>

          <div className="lg:space-y-2">
            <div className="lg:flex lg:items-center lg:gap-2 text-text-lm">
              <span className="text-sm lg:font-medium">Category</span>
            </div>
            <div className="lg:flex lg:flex-wrap lg:gap-2">
              {(["Question", "Advice", "Resource"] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  aria-pressed={category === cat}
                  className={`group inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm border transition focus:outline-none focus:ring-2 focus:ring-accent-lm ${
                    category === cat ? "border-stroke-peach bg-secondary-lm text-accent-lm shadow-sm ring-2 ring-accent-lm" : "border-stroke-grey bg-primary-lm text-text-lm hover:bg-hover-lm"
                  }`}
                >
                  {category === cat && <Check className="lg:h-3.5 lg:w-3.5 text-accent-lm" />}
                  {cat}
                </button>
              ))}
            </div>
        
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setImageFile(file);
                  if (file) {
                    setImagePreview(URL.createObjectURL(file));
                  }
                }}
                className="bg-primary-lm border-stroke-grey text-text-lm"
              />

              {imagePreview && (
                <div className="mt-2 space-y-2">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-h-40 rounded border"
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                    }}
                    className="bg-accent-lm text-primary-lm hover:ring-hover-btn-lm"
                  >
                    Remove Image
                  </Button>
                </div>
              )}
            </div>


          <Button className="lg:w-full bg-accent-lm hover:bg-hover-btn-lm text-primary-lm" onClick={handlePost}>
            Post
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

