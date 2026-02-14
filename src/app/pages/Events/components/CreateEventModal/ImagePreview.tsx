export default function ImagePreview({
  open,
  image,
  name,
  onClose,
}: {
  open: boolean;
  image: string | null;
  name: string | null;
  onClose: () => void;
}) {
  if (!open || !image) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-60 flex items-center justify-center">
      <div className="relative">
        <button
          onClick={onClose}
          className="absolute -top-4 -right-4 bg-white rounded-full px-2">
          ✕
        </button>
        <img src={image} alt={name ?? ""} className="max-h-[80vh]" />
      </div>
    </div>
  );
}
