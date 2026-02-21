interface Props {
  // Legacy single-image props (still supported)
  image?: string | null;
  imageName?: string | null;

  // Multi-image props
  images?: string[];
  imageNames?: Array<string | null | undefined>;
  onSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPreview: (index?: number) => void;
  onRemove?: (index?: number) => void;
}

export default function ImageUploader({
  image,
  imageName,
  images,
  imageNames,
  onSelect,
  onPreview,
  onRemove,
}: Props) {
  const urls = Array.isArray(images) && images.length ? images : (image ? [image] : []);
  const names = Array.isArray(imageNames) && imageNames.length
    ? imageNames
    : (imageName ? [imageName] : []);

  const buttonLabel = urls.length > 0 ? "Add More" : "Choose File";

  return (
    <div className="mt-6">
      <h6 className="font-medium text-text-lm">
        Upload Image
      </h6>

      <div className="flex gap-3 items-center lg:mt-3">
        <label className="bg-accent-lm text-primary-lm px-5 py-2 rounded-lg hover:bg-hover-btn-lm transition duration-150 cursor-pointer">
          {buttonLabel}
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={onSelect}
          />
        </label>

        <div className="flex-1 border border-stroke-grey bg-primary-lm rounded-lg px-3 py-2 flex items-center justify-between">
          {urls.length === 0 ? (
            <span className="text-text-lighter-lm">No file chosen</span>
          ) : (
            <div className="flex flex-col gap-2">
              {urls.map((src, idx) => {
                const rawName = names[idx] ?? null;
                const displayName =
                  rawName && rawName.length > 30 ? rawName.slice(0, 27) + "..." : rawName;

                return (
                  <div key={src + idx} className="flex items-center justify-between gap-3">
                    <button type="button" onClick={() => onPreview(idx)} className="flex items-center gap-3">
                      <img
                        src={src}
                        alt="Preview"
                        className="h-20 w-28 object-cover rounded-md border border-stroke-grey"
                      />
                      <div className="text-left">
                        <div className="text-sm font-medium text-text-lm">{displayName ?? "Selected image"}</div>
                        <div className="text-xs text-text-lighter-lm">Click to expand</div>
                      </div>
                    </button>

                    {onRemove ? (
                      <button
                        type="button"
                        onClick={() => onRemove(idx)}
                        className="ml-3 text-danger-lm hover:underline text-sm"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
