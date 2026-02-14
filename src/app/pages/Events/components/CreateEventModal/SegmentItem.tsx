import type { Segment } from "../../components/types";

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

      <input
        className="w-full border px-3 py-1 mb-2"
        placeholder="Location"
        value={segment.location ?? ""}
        onChange={e => onUpdate(segment.id, { location: e.target.value })}
      />


      <div className="flex gap-2 mb-2">
  <div className="flex-1">
    <label className="block text-sm">Start Date</label>
    <input
      type="date"
      value={segment.startDate}
      onChange={e => onUpdate(segment.id, { startDate: e.target.value })}
      className="w-full border px-3 py-1"
        />
      </div>
      <div className="flex-1">
        <label className="block text-sm">End Date</label>
        <input
          type="date"
          value={segment.endDate}
          onChange={e => onUpdate(segment.id, { endDate: e.target.value })}
          className="w-full border px-3 py-1"
        />
      </div>
    </div>

    <div className="flex gap-2 mb-2">
      <div className="flex-1">
        <label className="block text-sm">Start Time</label>
        <input
          type="time"
          value={segment.startTime}
          onChange={e => onUpdate(segment.id, { startTime: e.target.value })}
          className="w-full border px-3 py-1"
        />
      </div>
      <div className="flex-1">
        <label className="block text-sm">End Time</label>
        <input
          type="time"
          value={segment.endTime}
          onChange={e => onUpdate(segment.id, { endTime: e.target.value })}
          className="w-full border px-3 py-1"
        />
      </div>
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
