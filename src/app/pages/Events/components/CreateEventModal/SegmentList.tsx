import type { Segment } from "../types";

interface Props {
  segments: Segment[];
  onAdd: () => void;
  onUpdate: (id: string, data: Partial<Segment>) => void;
  onRemove: (id: string) => void;
}

export default function SegmentList({
  segments,
  onAdd,
  onUpdate,
  onRemove,
}: Props) {
  return (
    <div className="space-y-4">
      {/* Divider title */}
      <div className="flex items-center my-4">
        <div className="flex-1 h-px bg-gray-300" />
        <h3 className="px-4 text-lg font-medium text-text-lm">
          Segment
        </h3>
        <div className="flex-1 h-px bg-gray-300" />
      </div>

      {segments.map((seg, index) => (
        <div
          key={seg.id}
          className="border border-stroke-grey bg-secondary-lm rounded-lg p-4"
        >
          {/* Name */}
          <div className="mb-3">
            <div className="flex justify-between items-center text-text-lm">
              <strong>Name</strong>
              {segments.length > 1 && (
                <button
                  onClick={() => onRemove(seg.id)}
                  className="text-sm text-text-lighter-lm hover:text-gray-700"
                >
                  Remove
                </button>
              )}
            </div>
            <input
              className="w-full mt-1 border border-stroke-grey bg-primary-lm rounded-lg px-3 py-2"
              value={seg.name}
              onChange={e => onUpdate(seg.id, { name: e.target.value })}
            />
          </div>

          {/* Description */}
          <div className="mb-3">
            <strong className="text-text-lm">Description</strong>
            <textarea
              rows={3}
              className="w-full mt-1 border border-stroke-grey bg-primary-lm rounded-lg px-3 py-2"
              value={seg.description}
              onChange={e =>
                onUpdate(seg.id, { description: e.target.value })
              }
            />
          </div>

          {/* Date / Time table */}
          <div className="border border-stroke-grey bg-primary-lm rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="text-text-lm">
                  <th className="px-4 py-2 border-r">Date</th>
                  <th className="px-4 py-2">Time</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border-r">
                    <input
                      type="date"
                      className="w-full px-4 py-2 bg-transparent"
                      value={seg.date}
                      onChange={e =>
                        onUpdate(seg.id, { date: e.target.value })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="time"
                      className="w-full px-4 py-2 bg-transparent"
                      value={seg.time}
                      onChange={e =>
                        onUpdate(seg.id, { time: e.target.value })
                      }
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Add segment button */}
      <div className="text-right">
        <button
          onClick={onAdd}
          className="bg-accent-lm text-white px-5 py-2 rounded-full"
        >
          + Add segment
        </button>
      </div>
    </div>
  );
}
