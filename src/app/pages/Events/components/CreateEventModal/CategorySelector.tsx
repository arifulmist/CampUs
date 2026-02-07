
import type { EventCategory } from "./types";

export default function CategorySelector({
  category,
  onChange,
}: {
  category: EventCategory;
  onChange: (c: EventCategory) => void;
}) {
  return (
    <div className="flex gap-6 mb-4">
      {["workshop", "seminar", "course", "competition"].map(c => (
        <label key={c} className="flex items-center gap-2">
          <input
            type="radio"
            checked={category === c}
            onChange={() => onChange(c as EventCategory)}
          />
          {c}
        </label>
      ))}
    </div>
  );
}
