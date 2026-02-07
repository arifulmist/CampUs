export default function TitleInput({
  value,
  error,
  onChange,
}: {
  value: string;
  error: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div className="mb-6">
      <h3 className="mb-2 font-medium">Title</h3>
      <input
        className={`w-full border rounded-lg px-4 py-2 ${
          error ? "border-red-500" : "border-gray-300"
        }`}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      {error && <p className="text-sm text-red-600 mt-1">Title is required</p>}
    </div>
  );
}
