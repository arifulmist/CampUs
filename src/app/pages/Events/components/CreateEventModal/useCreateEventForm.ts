import { useState, useEffect } from "react";
import type { Segment, EventPostType } from "../types";

export function useCreateEventForm(open: boolean) {
  const [category, setCategory] = useState<"workshop" | "seminar" | "course" | "competition">("workshop");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState(""); 
  const [titleError, setTitleError] = useState(false);
  const [segments, setSegments] = useState<Segment[]>([{ id: generateId(), name: "", description: "", date: "", time: "" }]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  function generateId() {
    return Date.now().toString() + Math.random().toString(36).slice(2);
  }

  
  function resetForm() {
    setCategory("workshop");
    setTitle("");
    setDescription(""); 
    setTitleError(false);
    setSegments([{ id: generateId(), name: "", description: "", date: "", time: "" }]);
    setTags([]);
    setTagInput("");
    setImageDataUrl(null);
    setImageName(null);
    setPreviewOpen(false);
  }

  useEffect(() => {
    if (open) resetForm();
  }, [open]);

  function validate() {
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
      body: description, 
      excerpt: title,
      author: "You",
      segments,
      tags,
      image: imageDataUrl,
    };
  }

  // Segment handlers
  function addSegment() {
    setSegments(prev => [...prev, { id: generateId(), name: "", description: "", date: "", time: "" }]);
  }

  function updateSegment(id: string, data: Partial<Segment>) {
    setSegments(prev => prev.map(seg => seg.id === id ? { ...seg, ...data } : seg));
  }

  function removeSegment(id: string) {
    setSegments(prev => prev.filter(seg => seg.id !== id));
  }

  // Tag handlers
  function addTag() {
    const t = tagInput.trim();
    if (!t) return;
    setTags(prev => [...new Set([...prev, t])]);
    setTagInput("");
  }

  function removeTag(tag: string) {
    setTags(prev => prev.filter(t => t !== tag));
  }

  // Image handler
  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageName(file.name);
    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  return {
    category,
    setCategory,
    title,
    setTitle,
    description,
    setDescription, 
    titleError,
    segments,
    addSegment,
    updateSegment,
    removeSegment,
    tags,
    tagInput,
    setTagInput,
    addTag,
    removeTag,
    imageDataUrl,
    imageName,
    handleImage,
    previewOpen,
    setPreviewOpen,
    validate,
    buildPost,
    resetForm,
  };
}
