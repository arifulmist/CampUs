export const eventCategoryClassMap: Record<string, string> = {
  workshop: "bg-[#75ea92]",
  seminar: "bg-[#71bdff]",
  course: "bg-[#c09ffa]",
  competition: "bg-[#e98181]",
};

export const collabCategoryClassMap: Record<string, string> = {
  research: "bg-[#c09ffa]",
  competition: "bg-[#e98181]",
  project: "bg-[#71bdff]",
};

export const lostFoundCategoryClassMap: Record<string, string> = {
  lost: "bg-[#f5b0b0]",
  found: "bg-[#b0f5d6]",
};

const mergedDefault: Record<string, string> = {
  ...eventCategoryClassMap,
  ...collabCategoryClassMap,
  ...lostFoundCategoryClassMap,
};

export function getCategoryClass(category?: string | null, set?: "events" | "collab" | "lostfound") {
  if (!category) return "bg-secondary-lm border border-stroke-grey";
  const key = String(category).toLowerCase();

  if (set === "events") {
    return eventCategoryClassMap[key] ?? "bg-secondary-lm border border-stroke-grey";
  }
  if (set === "collab") {
    return collabCategoryClassMap[key] ?? "bg-secondary-lm border border-stroke-grey";
  }
  if (set === "lostfound") {
    return lostFoundCategoryClassMap[key] ?? "bg-secondary-lm border border-stroke-grey";
  }

  return mergedDefault[key] ?? "bg-secondary-lm border border-stroke-grey";
}
