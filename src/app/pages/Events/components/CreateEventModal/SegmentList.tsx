import SegmentItem from "./SegmentItem";
import type { Segment } from "../types";

export default function SegmentList({
  segments,
  onAdd,
  onUpdate,
  onRemove,
}: {
  segments: Segment[];
  onAdd: () => void;
  onUpdate: (id: string, data: Partial<Segment>) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="mb-6">
      <h3 className="font-medium mb-2">Segments</h3>

      {segments.map((s, i) => (
        <SegmentItem
          key={s.id}
          segment={s}
          removable={segments.length > 1}
          onUpdate={onUpdate}
          onRemove={onRemove}
        />
      ))}

      <button onClick={onAdd} className="mt-2 text-blue-600">
        + Add segment
      </button>
    </div>
  );
}
