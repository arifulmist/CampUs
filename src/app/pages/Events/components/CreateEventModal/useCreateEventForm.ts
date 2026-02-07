import { useState, useEffect } from "react";
import type { EventPostType, Segment } from "../EventPost";

function generateId() {
  return Date.now().toString() + Math.random().toString(36).slice(2);
}

export function useCreateEventForm(open: boolean) {
  const [category, setCategory] = useState<"workshop" | "seminar" | "course" | "competition">("workshop");
  const [title, setTitle] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [segments, setSegments] = useState<Segment[]>([{ id: generateId(), name: "", description: "", date: "", time: "" }]);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [titleError, setTitleError] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

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

  useEffect(() => { if(open) resetForm(); }, [open]);

  function addSegment() { setSegments(prev => [...prev, { id: generateId(), name: "", description: "", date: "", time: "" }]); }
  function updateSegment(id: string, data: Partial<Segment>) { setSegments(prev => prev.map(s => s.id === id ? { ...s, ...data } : s)); }
  function removeSegment(id: string) { setSegments(prev => prev.filter(s => s.id !== id)); }
  function addTag() { const t = tagInput.trim(); if(!t) return; setTags(prev => [...new Set([...prev, t])]); setTagInput(""); }
  function handleImage(e: React.ChangeEvent<HTMLInputElement>) { const file = e.target.files?.[0]; if(!file) return; setImageName(file.name); const reader = new FileReader(); reader.onload = () => setImageDataUrl(reader.result as string); reader.readAsDataURL(file); }

  function validate() { if(!title.trim()){ setTitleError(true); return false; } return true; }

  function buildPost(): EventPostType {
    return { id: generateId(), category, title, author: "You", excerpt: title, body: "", image: imageDataUrl, segments, tags };
  }

  return {
    category, setCategory,
    title, setTitle,
    tagInput, setTagInput,
    tags, addTag,
    segments, addSegment, updateSegment, removeSegment,
    imageDataUrl, imageName, handleImage,
    titleError,
    previewOpen, setPreviewOpen,
    resetForm, validate, buildPost
  };
}
