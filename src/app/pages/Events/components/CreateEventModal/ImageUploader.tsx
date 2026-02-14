interface Props {
  image: string | null;
  imageName: string | null;
  onSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPreview: () => void;
  onRemove?: () => void;
}

export default function ImageUploader({
  image,
  imageName,
  onSelect,
  onPreview,
  onRemove,
}: Props) {
  const displayName =
    imageName && imageName.length > 30 ? imageName.slice(0, 27) + "..." : imageName;
  return (
    <div className="mt-6">
      <h6 className="font-medium text-text-lm">
        Upload Image
      </h6>

      <div className="flex gap-3 items-center lg:mt-3">
        <label className="bg-accent-lm text-primary-lm px-5 py-2 rounded-lg hover:bg-hover-btn-lm transition duration-150 cursor-pointer">
          Choose File
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onSelect}
          />
        </label>

        <div className="flex-1 border border-stroke-grey bg-primary-lm rounded-lg px-3 py-2 flex items-center justify-between">
          {!image ? (
            <span className="text-text-lighter-lm">No file chosen</span>
          ) : (
            <div className="flex items-center gap-3">
              <button type="button" onClick={onPreview} className="flex items-center gap-3">
                <img
                  src={image}
                  alt="Preview"
                  className="h-20 w-28 object-cover rounded-md border border-stroke-grey"
                />
                <div className="text-left">
                  <div className="text-sm font-medium text-text-lm">{displayName}</div>
                  <div className="text-xs text-text-lighter-lm">Click to expand</div>
                </div>
              </button>
            </div>
          )}

          {image && onRemove ? (
            <button
              type="button"
              onClick={onRemove}
              className="ml-3 text-danger-lm hover:underline text-sm"
            >
              Remove
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
