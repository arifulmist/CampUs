import { useEffect, useState } from "react";
import type { Segment } from "../../components/types";

interface Props {
  segments: Segment[];
  onAdd: () => void;
  onUpdate: (id: string, data: Partial<Segment>) => void;
  onRemove: (id: string) => void;
  parentOnline?: boolean;
}

export default function SegmentList({
  segments,
  onAdd,
  onUpdate,
  onRemove,
  parentOnline = false,
}: Props) {
  const [sameMap, setSameMap] = useState<Record<string, boolean>>({});

  // initialize sameMap when segments change
  useEffect(() => {
    const map: Record<string, boolean> = {};
    for (const s of segments) {
      map[s.id] = s.endDate === s.startDate && s.startDate !== "";
    }
    setSameMap(map);
  }, [segments]);

  // When parent event is marked Online, force all segment locations to Online
  useEffect(() => {
    if (!parentOnline) return;
    for (const s of segments) {
      if (s.location !== "Online") {
        onUpdate(s.id, { location: "Online" });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentOnline, segments]);

  function toggleSame(segId: string, checked: boolean, startDate: string) {
    // don't allow enabling if there's no start date yet
    if (checked && !startDate) return;
    setSameMap(prev => ({ ...prev, [segId]: checked }));
    if (checked) onUpdate(segId, { endDate: startDate });
  }
  return (
    <div className="space-y-4">
      {/* Divider title */}
      <div className="lg:my-5">
        <h6 className="font-medium text-text-lm">Segment</h6>
      </div>

      {segments.map((seg) => (
        <div key={seg.id} className="border border-stroke-grey bg-background-lm rounded-lg p-4">
          <button
            onClick={() => onRemove(seg.id)}
            className="text-text-lighter-lm/60 hover:text-text-lighter-lm w-full text-right transition duration-150 cursor-pointer"
          >
            Remove
          </button>

          {/* Name */}
          <div className="mb-3">
            <div className="flex justify-between items-center text-text-lm">
              <p className="font-medium text-text-lm">Segment Name</p>
            </div>
            <input
              className="w-full mt-1 border border-stroke-grey bg-primary-lm focus:outline-0 focus:border-accent-lm rounded-lg px-3 py-2"
              value={seg.name}
              onChange={e => onUpdate(seg.id, { name: e.target.value })}
              required
            />
          </div>

          {/* Description */}
          <div className="mb-3">
            <p className="font-medium text-text-lm">Description</p>
            <textarea
              rows={3}
              className="w-full mt-1 border border-stroke-grey bg-primary-lm focus:outline-0 focus:border-stroke-peach rounded-lg px-3 py-2 resize-none overflow-y-auto"
              style={{ maxHeight: "150px" }}
              value={seg.description}
              onChange={e => onUpdate(seg.id, { description: e.target.value })}
            />
          </div>

          {/* Location */}
          <div className="mb-3">
            <p className="font-medium text-text-lm">Location</p>
            <label className="flex gap-2 lg:my-2 items-center">
              <input
                type="checkbox"
                className="lg:size-4 accent-accent-lm"
                checked={parentOnline ? true : seg.location === "Online"}
                onChange={e => onUpdate(seg.id, { location: e.target.checked ? "Online" : "" })}
                disabled={parentOnline}
              />
              <p className="text-text-lm">Online Segment</p>
            </label>
            {seg.location !== "Online" && (
              <input
                type="text"
                className="w-full mt-1 border border-stroke-grey bg-primary-lm focus:outline-0 focus:border-accent-lm rounded-lg px-3 py-2"
                placeholder="e.g: Room-302, Hall of Fame etc"
                value={seg.location ?? ""}
                onChange={e => onUpdate(seg.id, { location: e.target.value })}
              />
            )}
          </div>

          {/* Date / Time*/}
          <div className="flex flex-col lg:gap-4">
            <div>
              <label className="flex flex-col">
                <p className="font-medium text-text-lm">Start Date</p>
                <input
                  type="date"
                  className="px-4 py-2 bg-primary-lm border border-stroke-grey rounded-md w-fit"
                  value={seg.startDate}
                  onChange={e => {
                    onUpdate(seg.id, { startDate: e.target.value });
                    if (sameMap[seg.id]) onUpdate(seg.id, { endDate: e.target.value });
                  }}
                  required
                />
              </label>
            </div>

            <div>
              <label className="flex flex-col">
                <p className="font-medium text-text-lm">End Date</p>
                <label className="flex gap-2 items-center mt-1">
                  <input
                    type="checkbox"
                    className="accent-accent-lm size-4"
                    checked={!!sameMap[seg.id]}
                    onChange={e => toggleSame(seg.id, e.target.checked, seg.startDate)}
                    disabled={seg.startDate === ""}
                  />
                  <p className="text-text-lm">Same as Start Date</p>
                </label>
                  {!sameMap[seg.id] && (
                    <input
                      type="date"
                      className="px-4 py-2 bg-primary-lm border border-stroke-grey rounded-md w-fit mt-2"
                      value={seg.endDate}
                      onChange={e => onUpdate(seg.id, { endDate: e.target.value })}
                    />
                  )}
              </label>
            </div>
          </div>

          <div className="flex lg:gap-5 lg:mt-4">
            <div>
              <label className="flex flex-col">
                <p className="font-medium text-text-lm">Start Time</p>
                <input
                  type="time"
                  className="px-4 py-2 bg-primary-lm border border-stroke-grey rounded-md w-fit"
                  value={seg.startTime}
                  onChange={e => onUpdate(seg.id, { startTime: e.target.value })}
                  required
                />
              </label>
            </div>

            <div>
              <label className="flex flex-col">
                <p className="font-medium text-text-lm">End Time</p>
                <input
                  type="time"
                  className="px-4 py-2 bg-primary-lm border border-stroke-grey rounded-md w-fit"
                  value={seg.endTime}
                  onChange={e => onUpdate(seg.id, { endTime: e.target.value })}
                  required
                />
              </label>
            </div>
          </div>
        </div>
      ))}

      {/* Add segment button */}
      <div className="text-right">
        <button
          onClick={onAdd}
          className="bg-accent-lm text-primary-lm font-medium px-5 py-2 rounded-lg hover:bg-hover-btn-lm transition duration-150 cursor-pointer"
        >
          + Add segment
        </button>
      </div>
    </div>
  );
}
