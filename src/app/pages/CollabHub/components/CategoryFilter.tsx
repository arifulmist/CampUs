import React from "react";

import type { Category } from "./Category.tsx";

interface CategoryFilterProps {
  categories: Category[];
  selected: Category;
  onChange: React.Dispatch<React.SetStateAction<Category>>;
}


interface CategoryFilterProps {
  categories: Category[];
  selected: Category;
  onChange: React.Dispatch<React.SetStateAction<Category>>;
}


export function CategoryFilter({ categories, selected, onChange }: CategoryFilterProps) {
  return (
    <div className="flex flex-col gap-4 w-80 h-fit bg-primary-lm p-4 rounded-2xl border-2 border-stroke-grey">
      <h6 className="font-[Poppins] font-semibold text-text-lm mb-2">
        Categories
      </h6>
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
          className={`text-left px-3 py-2 rounded-lg font-medium transition-colors duration-200 ${
            selected === cat
              ? "bg-[#C23D00] text-[#FFFFFF]"
              : "hover:bg-secondary-lm text-text-lighter-lm"
          }`}
        >
          {cat.charAt(0).toUpperCase() + cat.slice(1)}
        </button>
      ))}
    </div>
  );
}
