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
    <div className="lg:flex lg:flex-col lg:gap-4 lg:w-80 lg:h-fit bg-primary-lm lg:p-4 lg:rounded-2xl border-2 border-stroke-grey">
      <h6 className="lg:font-[Poppins] lg:font-semibold text-text-lm lg:mb-2">
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
