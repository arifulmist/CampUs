import React, { useEffect, useState } from "react";
import { supabase } from "../../../../../../supabase/supabaseClient";

interface Category {
  category_id: number;
  category_name: string;
}

interface Props {
  category: number; // store numeric ID
  onChange: (v: number) => void;
}

export default function CategorySelector({ category, onChange }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);

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

  return (
    <div className="lg:flex lg:gap-6">
      {categories.map(c => (
        <label key={c.category_id} className="lg:flex lg:items-center lg:gap-2">
          <input
            type="radio"
            checked={category === c.category_id}
            onChange={() => onChange(c.category_id)}
            className="accent-accent-lm"
          />
          <span>{c.category_name}</span>
        </label>
      ))}
    </div>
  );
}
