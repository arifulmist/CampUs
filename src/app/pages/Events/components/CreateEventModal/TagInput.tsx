export default function TagInput({
  value,
  tags,
  onChange,
  onAdd,
}: {
  value: string;
  tags: string[];
  onChange: (v: string) => void;
  onAdd: () => void;
}) {
  return (
    <div className="mb-6">
      <h3 className="mb-2 font-medium">Tags</h3>

      <div className="flex gap-2 mb-2">
        {tags.map(t => (
          <span key={t} className="px-3 py-1 border rounded-full text-sm">
            #{t}
          </span>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 border px-3 py-2 rounded"
          value={value}
          onChange={e => onChange(e.target.value)}
        />
        <button onClick={onAdd} className="bg-gray-200 px-3 rounded">
          Add
        </button>
      </div>
    </div>
  );
}
