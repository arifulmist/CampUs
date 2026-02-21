import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";

import { supabase } from "@/supabase/supabaseClient";
import { LikeButton, CommentButton } from "../../../../components/PostButtons";
import { PostComments } from "../../../../components/PostComments";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { Post, PostCategory } from "../types";
import { categoryStyles } from "../types";

interface PostDetailProps {
  post: Post;
  onBack: () => void;
  onDelete?: (postId: string) => void;
  onUpdate?: (updatedPost: Post) => void;
}

export default function PostDetail({ post, onBack, onDelete, onUpdate }: PostDetailProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const [editTitle, setEditTitle] = useState(post.title);
  const [editContent, setEditContent] = useState(post.content);
  const [editCategory, setEditCategory] = useState<PostCategory>(post.category);
  const [tags, setTags] = useState<string[]>(post.tags || []);
  const [tagInput, setTagInput] = useState("");
  const [skills, setSkills] = useState<string[]>([]);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(post.imageUrl || null);

  const [saving, setSaving] = useState(false);

  // Fetch skills when edit modal opens
  useEffect(() => {
    async function fetchSkills() {
      const { data, error } = await supabase.from("skills_lookup").select("skill");
      if (error) console.error("Error fetching skills:", error);
      else setSkills(data.map((s) => s.skill));
    }
    if (editOpen) fetchSkills();
  }, [editOpen]);

  // Current user
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id ?? null);
    })();
  }, []);

  const isAuthor = userId === post.authorUid;

  // Tags helpers
  const addTag = (t?: string) => {
    const v = (t ?? tagInput).trim();
    if (!v) return;
    if (!skills.includes(v)) {
      toast.error("That tag is not available. Please choose from suggestions.");
      return;
    }
    if (!tags.includes(v)) setTags((p) => [...p, v]);
    setTagInput("");
  };

  const removeTag = (t: string) => setTags((p) => p.filter((x) => x !== t));

  const filteredSuggestions =
    tagInput.trim().length >= 1
      ? skills.filter((s) => s.toLowerCase().includes(tagInput.toLowerCase()) && !tags.includes(s))
      : [];

  // Delete post
  const handleDelete = async () => {
    if (!post.id) return;
    if (!confirm("Are you sure you want to delete this post?")) return;

    try {
      const { error } = await supabase
        .from("all_posts")
        .delete()
        .eq("post_id", post.id)
        .eq("author_uid", userId); // <- corrected column
      if (error) throw error;
      toast.success("Post deleted");
      onDelete?.(post.id);
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete post");
    }
  };

  


async function handleSaveEdit() {
  if (!post.id) return;
  setSaving(true);

  try {
    let imgUrl = post.imageUrl || null; // fallback to existing image

    // 1️⃣ Handle image upload if a new file is selected
    if (imageFile) {
      const filePath = `private/${crypto.randomUUID()}-${imageFile.name}`; // use public bucket
      const { error: uploadError } = await supabase.storage
        .from("post_images")
        .upload(filePath, imageFile, { cacheControl: "3600", upsert: true });
      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage.from("post_images").getPublicUrl(filePath);
      imgUrl = publicUrl.publicUrl; 
    }

    // 2️⃣ Update main post table (title, content, image)
    const { error: postError } = await supabase
      .from("all_posts")
      .update({ title: editTitle, description: editContent })
      .eq("post_id", post.id)
      .eq("author_id", userId);
    if (postError) throw postError;

    // 3️⃣ Update category
    const { error: catError } = await supabase
  .from("qna_posts")
  .update({ category_id: editCategory, img_url: imgUrl })
  .eq("post_id", post.id);

    if (catError) throw catError;

    // 4️⃣ Update tags
    // Delete old tags
    const { error: delError } = await supabase.from("post_tags").delete().eq("post_id", post.id);
    if (delError) throw delError;

    // Insert new tags
    const { data: skillRows } = await supabase
      .from("skills_lookup")
      .select("id")
      .in("skill", tags);
    const skillIds = skillRows?.map((s) => s.id) ?? [];

    const inserts = skillIds.map((skillId) => ({
      post_id: post.id,
      skill_id: skillId,
    }));
    if (inserts.length > 0) {
      const { error: insertError } = await supabase.from("post_tags").insert(inserts);
      if (insertError) throw insertError;
    }

    // 5️⃣ Fetch updated category name for UI
    const { data: catRow } = await supabase
  .from("qna_category")
  .select("category_name")
  .eq("category_id", editCategory)  
  .maybeSingle();

    const updatedCategoryName = catRow?.category_name || post.category;

    // 6️⃣ Update local state/UI
    onUpdate?.({
      ...post,
      title: editTitle,
      content: editContent,
      category: updatedCategoryName,
      tags,
      imageUrl: imgUrl,
    });

    toast.success("Post updated successfully!");
    setEditOpen(false);
  } catch (err) {
    console.error(err);
    toast.error("Failed to update post");
  } finally {
    setSaving(false);
  }
}

  return (
    <div className="lg:space-y-6 lg:animate-fade-in">
      <button
        onClick={onBack}
        className="lg:flex lg:items-center lg:gap-2 text-accent-lm hover:opacity-80 lg:transition-colors"
      >
        ← Go Back
      </button>

     {/* Post Card */}
<div className="bg-primary-lm lg:rounded-xl lg:p-6 lg:shadow-sm lg:border border-stroke-grey">
  <div className="lg:flex lg:items-center lg:justify-between lg:mb-4">
    <span className={`px-3 py-1 font-semibold rounded-full ${categoryStyles[post.category]}`}>
      {post.category}
    </span>

    {isAuthor && (
      <div className="flex gap-2 items-center">
        <button
          className="text-accent-lm hover:underline text-sm"
          onClick={() => setEditOpen(true)}
        >
          Edit
        </button>
        <button
          className="text-accent-lm hover:underline text-sm"
          onClick={handleDelete}
        >
          Delete
        </button>
      </div>
    )}
  </div>

  <h1 className="text-2xl lg:font-bold text-text-lm lg:mb-4">{post.title}</h1>
 
  <div className="lg:flex lg:items-center lg:gap-3 lg:mb-4">
    <Avatar className="lg:h-10 lg:w-10 lg:border border-stroke-grey">
      <AvatarImage src={post.authorAvatar || "/placeholder.svg"} />
      <AvatarFallback>{post.author[0]}</AvatarFallback>
    </Avatar>
    <div>
      <div className="text-sm lg:font-bold text-accent-lm">{post.author}</div>
      <div className="text-xs text-text-lighter-lm lg:font-medium">{post.authorCourse}</div>
    </div>
  </div>
   {/* Tags */}
  {post.tags.length > 0 && (
    <div className="lg:flex lg:flex-wrap lg:gap-2 lg:mb-4">
      {post.tags.map((tag) => (
        <span
          key={tag}
          className="bg-secondary-lm text-accent-lm px-3 py-1 rounded-full text-sm"
        >
          #{tag}
        </span>
      ))}
    </div>
  )}
   <p className="text-text-lm lg:leading-relaxed lg:mb-4">{post.content}</p>
  {/* Image */}
  {post.imageUrl && (
    <div className="lg:mb-4">
      <img
        src={post.imageUrl}
        alt="Post Image"
        className="max-h-64 w-full object-cover rounded-lg border border-stroke-grey"
      />
    </div>
  )}

 

 

  {/* Action Buttons */}
  <div className="lg:flex lg:items-center lg:gap-4 lg:pt-4 border-t border-stroke-grey">
    <LikeButton postId={post.id} initialLikeCount={post.reactions} />
    <CommentButton postId={post.id} initialCommentCount={post.comments} />
  </div>
</div>

      {/* Comments */}
      <PostComments postId={post.id} />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
  <DialogContent className="sm:max-w-lg bg-primary-lm border-stroke-grey text-text-lm">
    <DialogHeader>
      <DialogTitle>Edit Post</DialogTitle>
    </DialogHeader>

    <div className="lg:space-y-4 mt-2">
      {/* Title */}
      <Input
        placeholder="Title"
        value={editTitle}
        onChange={(e) => setEditTitle(e.target.value)}
        className="bg-primary-lm border-stroke-grey text-text-lm placeholder:text-text-lighter-lm focus-visible:ring-accent-lm focus-visible:border-accent-lm"
      />

      {/* Content */}
      <Textarea
        placeholder="Content"
        rows={5}
        value={editContent}
        onChange={(e) => setEditContent(e.target.value)}
        className="bg-primary-lm border-stroke-grey text-text-lm placeholder:text-text-lighter-lm focus-visible:ring-accent-lm focus-visible:border-accent-lm"
      />

      {/* Tags */}
      <div className="lg:space-y-2">
        <div className="lg:flex lg:items-center lg:gap-2 text-text-lm">
          <span className="text-sm lg:font-medium">Tags</span>
        </div>
        <div className="lg:flex lg:gap-2 lg:items-center">
          <Input
            placeholder="Add tag"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag(tagInput);
              }
            }}
            className="bg-primary-lm border-stroke-grey text-text-lm"
          />
          <Button onClick={() => addTag(tagInput)} className="bg-accent-lm text-primary-lm">
            Add
          </Button>
        </div>

        {/* Suggestions */}
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

        {/* Selected tags */}
        <div className="lg:flex lg:flex-wrap lg:gap-2 mt-2">
          {tags.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => removeTag(t)}
              className="lg:inline-flex lg:items-center lg:gap-2 lg:rounded-full lg:px-3 lg:py-1 text-sm lg:border bg-primary-lm"
            >
              #{t}
            </button>
          ))}
        </div>
      </div>

      {/* Category */}
      <div className="lg:space-y-2">
        <div className="lg:flex lg:items-center lg:gap-2 text-text-lm">
          <span className="text-sm lg:font-medium">Category</span>
        </div>
        <div className="lg:flex lg:flex-wrap lg:gap-2">
          {(["Question", "Advice", "Resource"] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setEditCategory(cat)}
              aria-pressed={editCategory === cat}
              className={`group inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm border transition focus:outline-none focus:ring-2 focus:ring-accent-lm ${
                editCategory === cat
                  ? "border-stroke-peach bg-secondary-lm text-accent-lm shadow-sm ring-2 ring-accent-lm"
                  : "border-stroke-grey bg-primary-lm text-text-lm hover:bg-hover-lm"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Image */}
      <div className="lg:space-y-2">
        <Input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0] || null;
            setImageFile(file);
            if (file) setImagePreview(URL.createObjectURL(file));
          }}
          className="bg-primary-lm border-stroke-grey text-text-lm"
        />
        {imagePreview && (
          <div className="mt-2 space-y-2">
            <img src={imagePreview} alt="Preview" className="max-h-40 rounded border" />
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

      {/* Action Buttons */}
      <div className="flex gap-2 justify-end mt-4">
        <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
        <Button onClick={handleSaveEdit} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  </DialogContent>
</Dialog>

    </div>
  );
}
