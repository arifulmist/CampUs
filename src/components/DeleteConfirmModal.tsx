import { useState } from "react";
import { createPortal } from "react-dom";
import crossBtn from "@/assets/icons/cross_btn.svg";
import { toast } from "react-hot-toast";

export function DeleteConfirmModal({
  open,
  onClose,
  onConfirm,
  title = "Delete",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title?: string;
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await onConfirm();
    } catch (err: unknown) {
      console.error("Failed to delete:", err);
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      toast.error("Failed to delete: " + msg);
      setIsDeleting(false);
      return;
    }
  }

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-1000"
        onClick={() => {
          if (!isDeleting) onClose();
        }}
        style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      />

      <div className="fixed inset-0 z-1001 flex items-center justify-center p-6">
        <div
          className="lg:w-full lg:max-w-2xl lg:p-10 lg:border border-stroke-grey"
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 8,
            boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
            maxHeight: "calc(100vh - 96px)",
            overflowY: "auto",
          }}
        >
          <div className="lg:flex lg:justify-between lg:items-center lg:mb-6">
            <h2 className="text-xl lg:font-semibold text-text-lm">{title}</h2>
            <button
              onClick={() => {
                if (!isDeleting) onClose();
              }}
              className="cursor-pointer"
              aria-label="Close modal"
            >
              <img src={crossBtn} />
            </button>
          </div>

          <div className="lg:space-y-6">
            <p className="text-text-lm">
              Are you sure you want to delete this item? This can’t be undone.
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={onClose}
                className="bg-secondary-lm text-text-lm border border-stroke-grey px-4 py-2 rounded-lg hover:bg-hover-lm transition duration-150 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => void handleDelete()}
                className="bg-primary-lm text-danger-lm border border-stroke-grey px-4 py-2 rounded-lg hover:bg-hover-lm transition duration-150 disabled:opacity-60"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}

export default DeleteConfirmModal;
