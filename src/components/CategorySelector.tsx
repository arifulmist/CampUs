import { useEffect, useState } from "react";
import { supabase } from "@/supabase/supabaseClient";

type Option = { value: string | number; label: string };

export default function CategorySelector({
  value,
  onChange,
  options,
  table,
}: {
  value: string | number;
  onChange: (v: string | number) => void;
  options?: Option[];
  table?: string; // optional DB table to fetch (defaults to events_category)
}) {
  const [fetched, setFetched] = useState<Option[]>([]);

  useEffect(() => {
    if (options && options.length) return;
    let alive = true;

    (async () => {
      try {
        const tbl = table ?? "events_category";
        const { data, error } = await supabase.from(tbl).select("category_id, category_name").order("category_id");
        if (error) throw error;
        if (!alive) return;
        const mapped = (data || []).map((r: any) => ({ value: r.category_id, label: r.category_name } as Option));
        setFetched(mapped);
      } catch (e) {
        console.error("Failed to fetch categories", e);
      }
    })();

    return () => {
      alive = false;
    };
  }, [options, table]);

  const list = options && options.length ? options : fetched;

  return (
    <div className="flex flex-wrap lg:gap-6 lg:mt-2">
      {list.map((opt) => (
        <label key={String(opt.value)} className="flex items-center gap-3 cursor-pointer">
          <input
            type="radio"
            name="category"
            value={String(opt.value)}
            checked={String(value) === String(opt.value)}
            onChange={() => onChange(opt.value)}
            required
            className="sr-only"
          />

          <span
            aria-hidden
            className={`flex items-center justify-center w-5 h-5 rounded-full transition-all border-[1.5px] ${
              String(value) === String(opt.value) ? "border-accent-lm" : "border-text-lighter-lm/60"
            }`}
          >
            {String(value) === String(opt.value) ? <span className="w-2.5 h-2.5 rounded-full bg-accent-lm" /> : null}
          </span>

          <span className="text-text-lm font-medium">{opt.label}</span>
        </label>
      ))}
    </div>
  );
}
