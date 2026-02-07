interface Props {
  image: string | null;
  imageName: string | null;
  onSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPreview: () => void;
}

export default function ImageUploader({
  image,
  imageName,
  onSelect,
  onPreview,
}: Props) {
  return (
    <div className="mt-6">
      <label className="block mb-2 font-medium text-text-lm">
        Upload Image
      </label>

      <div className="flex gap-3 items-center">
        <label className="bg-accent-lm text-white px-5 py-2 rounded-lg cursor-pointer">
          Choose File
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onSelect}
          />
        </label>

        <div className="flex-1 border border-stroke-grey rounded-lg px-3 py-2 flex items-center">
          {!image ? (
            <span className="text-sm text-text-lighter-lm">
              No file chosen
            </span>
          ) : (
            <button
              type="button"
              onClick={onPreview}
              className="flex items-center gap-3"
            >
              <img
                src={image}
                alt="Preview"
                className="h-20 w-28 object-cover rounded-md border border-stroke-grey"
              />
              <div className="text-left">
                <div className="text-sm font-medium text-text-lm">
                  {imageName}
                </div>
                <div className="text-xs text-text-lighter-lm">
                  Click to expand
                </div>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
