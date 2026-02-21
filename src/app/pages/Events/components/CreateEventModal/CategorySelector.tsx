import { useEffect, useState } from "react";
import { supabase } from "@/supabase/supabaseClient";

interface Category {
  category_id: number;
  category_name: string;
}

interface Props {
  category: number;
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
      {categories.map((c) => (
        <label key={c.category_id} className="flex items-center lg:gap-3 cursor-pointer">
          <input
            type="radio"
            name="category"
            value={c.category_id}
            checked={category === c.category_id}
            onChange={() => onChange(c.category_id)}
            required
            className="sr-only"
          />

          <span
            aria-hidden
            className={`flex items-center justify-center w-5 h-5 rounded-full transition-all border-[1.5px] ${
              category === c.category_id ? "border-accent-lm" : "border-text-lighter-lm/60"
            }`}
          >
            {category === c.category_id ? <span className="w-2.5 h-2.5 rounded-full bg-accent-lm" /> : null}
          </span>

          <span className="text-text-lm font-medium">{c.category_name}</span>
        </label>
      ))}
    </div>
  );
}
