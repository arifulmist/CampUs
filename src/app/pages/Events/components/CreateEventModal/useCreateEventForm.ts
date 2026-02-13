import { useState, useEffect } from "react";
import type { Segment, EventPostType } from "../types";
import { searchSkills } from "../../backend/eventService"; 
import {supabase} from "../../../../../../supabase/supabaseClient";
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


const [segments, setSegments] = useState<Segment[]>([
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



  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  function generateId() {
    return Date.now().toString() + Math.random().toString(36).slice(2);
  }


  
  function resetForm() {
  setCategory(0);
  setTitle("");
  setDescription(""); 
  setLocation(""); 
  setTitleError(false);
  setSegments([{
    id: generateId(),
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    startTime: "",
    endTime: "",
    location: ""
  }]);
  setTags([]);
  setSearchTerm("");
  setSuggestions([]);

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
      image: imageDataUrl,
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
    categories,
    title,
    setTitle,
    description,
    setDescription, 
    location,
    setLocation,
    titleError,
    segments,
    addSegment,
    updateSegment,
    removeSegment,
    tags, 
    addTagFromSuggestion, 
    removeTag, 
    searchTerm, 
    setSearchTerm, 
    suggestions,
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
