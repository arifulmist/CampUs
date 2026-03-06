import { useState, useEffect } from "react";
import type { Segment, EventPostType } from "../../components/types";
import { searchSkills } from "../../backend/eventService"; 
import { supabase } from "@/supabase/supabaseClient";
import { toast } from "react-hot-toast";
import { MAX_POST_ATTACHMENTS } from "@/utils/postAttachments";
export function useCreateEventForm(open: boolean) {
  const [category, setCategory] = useState<number>(0); // default to 0 or first category_id
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState(""); 
  const [titleError, setTitleError] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
const [suggestions, setSuggestions] = useState<{ id: number; skill: string }[]>([]);
const [tags, setTags] = useState<{ skill_id: number; name: string }[]>([]);
const [categories, setCategories] = useState<{ category_id: number; category_name: string }[]>([]);

useEffect(() => {
  async function fetchCategories() {
    const { data, error } = await supabase
      .from("events_category")
      .select("category_id, category_name")
      .order("category_id");
    if (error) {
      console.error("Failed to fetch categories:", error);
      return;
    }
    setCategories(data || []);
  }
  fetchCategories();
}, []);

useEffect(() => {
  if (searchTerm.length > 0) {
    searchSkills(searchTerm)
      .then(setSuggestions)
      .catch(console.error);
  } else {
    setSuggestions([]);
  }
}, [searchTerm]);

function addTagFromSuggestion(skill: { id: number; skill: string }) {
  setTags(prev => [...prev, { skill_id: skill.id, name: skill.skill }]);
  setSearchTerm("");
  setSuggestions([]);
}

function removeTag(skill_id: number) {
  setTags(prev => prev.filter(t => t.skill_id !== skill_id));
}


const [segments, setSegments] = useState<Segment[]>([]);

  // event-level start/end (separate from per-segment dates)
  const [eventStartDate, setEventStartDate] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");



  const [imageDataUrls, setImageDataUrls] = useState<string[]>([]);
  const [imageNames, setImageNames] = useState<string[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

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

  function generateId() {
    return Date.now().toString() + Math.random().toString(36).slice(2);
  }


  
  function resetForm() {
  setCategory(0);
  setTitle("");
  setDescription(""); 
  setLocation(""); 
  setTitleError(false);
  setSegments([]);
  setEventStartDate("");
  setEventEndDate("");
  setTags([]);
  setSearchTerm("");
  setSuggestions([]);

  setImageDataUrls([]);
  setImageNames([]);
  setPreviewOpen(false);
  setPreviewIndex(0);
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
  const categoryName = categories.find(c => c.category_id === category)?.category_name ?? "uncategorized";
    return {
      id: generateId(),
      category:categoryName,
      title,
      body: description, 
      location,
      excerpt: title,
      author: "You",
      segments,
      tags: tags,
      image: imageDataUrls[0] ?? null,
      images: imageDataUrls,
    };
  }

  // Segment handlers
  function addSegment() {
  setSegments(prev => [
    ...prev,
    {
      id: generateId(),
      name: "",
      description: "",
      startDate: "",
      endDate: "",
      startTime: "",
      endTime: "",
      location: ""
    }
  ]);
}


  function updateSegment(id: string, data: Partial<Segment>) {
    setSegments(prev => prev.map(seg => seg.id === id ? { ...seg, ...data } : seg));
  }

  function removeSegment(id: string) {
    setSegments(prev => prev.filter(seg => seg.id !== id));
  }

  

  // Image handler
  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
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

  return {
    category,
    setCategory,
    categories,
    title,
    setTitle,
    description,
    setDescription, 
    location,
    setLocation,
    titleError,
    segments,
    setSegments,
    addSegment,
    updateSegment,
    removeSegment,
    eventStartDate,
    setEventStartDate,
    eventEndDate,
    setEventEndDate,
    tags, 
    setTags,
    addTagFromSuggestion, 
    removeTag, 
    searchTerm, 
    setSearchTerm, 
    suggestions,
    imageDataUrls,
    setImageDataUrls,
    imageNames,
    setImageNames,
    handleImage,
    removeImageAt,
    previewOpen,
    setPreviewOpen,
    previewIndex,
    setPreviewIndex,
    validate,
    buildPost,
    resetForm,
  };
}
