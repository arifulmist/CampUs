export default function ImageUploader({
  image,
  imageName,
  onSelect,
  onPreview,
}: {
  image: string | null;
  imageName: string | null;
  onSelect: (file: File) => void;
  onPreview: () => void;
}) {
  return (
    <div className="mb-6">
      <label className="font-medium block mb-2">Upload Image</label>

      <input
        type="file"
        accept="image/*"
        onChange={e => e.target.files && onSelect(e.target.files[0])}
      />

      {image && (
        <div className="mt-2 cursor-pointer" onClick={onPreview}>
          <img src={image} alt={imageName ?? ""} className="h-20 rounded" />
        </div>
      )}
    </div>
  );
}
