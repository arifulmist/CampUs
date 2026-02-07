import type { Segment } from "../types";

export default function SegmentItem({
  segment,
  removable,
  onUpdate,
  onRemove,
}: {
  segment: Segment;
  removable: boolean;
  onUpdate: (id: string, data: Partial<Segment>) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="border p-4 rounded-lg mb-3">
      <input
        className="w-full border px-3 py-1 mb-2"
        placeholder="Segment name"
        value={segment.name}
        onChange={e => onUpdate(segment.id, { name: e.target.value })}
      />

      <textarea
        className="w-full border px-3 py-1 mb-2"
        placeholder="Description"
        value={segment.description}
        onChange={e => onUpdate(segment.id, { description: e.target.value })}
      />

      <div className="flex gap-2 mb-2">
        <input type="date" value={segment.date}
          onChange={e => onUpdate(segment.id, { date: e.target.value })} />
        <input type="time" value={segment.time}
          onChange={e => onUpdate(segment.id, { time: e.target.value })} />
      </div>

      {removable && (
        <button className="text-sm text-red-500"
          onClick={() => onRemove(segment.id)}>
          Remove
        </button>
      )}
    </div>
  );
}
