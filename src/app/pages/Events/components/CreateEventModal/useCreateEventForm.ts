import { useEffect, useState } from "react";
import type { Segment, EventPostType } from "../types";

function generateId() {
  return Date.now().toString() + Math.random().toString(36).slice(2);
}

export function useCreateEventForm(open: boolean) {
  const [category, setCategory] = useState<
    "workshop" | "seminar" | "course" | "competition"
  >("workshop");

  const [title, setTitle] = useState("");
  const [titleError, setTitleError] = useState(false);

  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const [segments, setSegments] = useState<Segment[]>([
    { id: generateId(), name: "", description: "", date: "", time: "" },
  ]);

  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);

  const [previewOpen, setPreviewOpen] = useState(false);

  function resetForm() {
    setCategory("workshop");
    setTitle("");
    setTitleError(false);
    setTagInput("");
    setTags([]);
    setSegments([{ id: generateId(), name: "", description: "", date: "", time: "" }]);
    setImageDataUrl(null);
    setImageName(null);
    setPreviewOpen(false);
  }

  useEffect(() => {
    if (open) resetForm();
  }, [open]);

  function addSegment() {
    setSegments(prev => [
      ...prev,
      { id: generateId(), name: "", description: "", date: "", time: "" },
    ]);
  }

  function updateSegment(id: string, data: Partial<Segment>) {
    setSegments(prev =>
      prev.map(s => (s.id === id ? { ...s, ...data } : s))
    );
  }

  function removeSegment(id: string) {
    setSegments(prev => prev.filter(s => s.id !== id));
  }

  function addTag() {
    const t = tagInput.trim();
    if (!t) return;
    setTags(prev => [...new Set([...prev, t])]);
    setTagInput("");
  }

  function removeTag(tag: string) {
    setTags(prev => prev.filter(t => t !== tag));
  }

  function handleImage(file: File) {
    setImageName(file.name);
    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  function validate(): boolean {
    if (!title.trim()) {
      setTitleError(true);
      return false;
    }
    return true;
  }

  function buildPost(): EventPostType {
    return {
      id: generateId(),
      category,
      title,
      author: "You",
      excerpt: title,
      body: "",
      image: imageDataUrl,
      segments,
      tags,
    };
  }

  return {
    category, setCategory,
    title, setTitle, titleError, setTitleError,
    tags, tagInput, setTagInput,
    segments,
    imageDataUrl, imageName,
    previewOpen, setPreviewOpen,

    addSegment,
    updateSegment,
    removeSegment,
    addTag,
    removeTag,
    handleImage,

    validate,
    buildPost,
    resetForm,
  };
}
