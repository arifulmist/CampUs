import { createPortal } from "react-dom";
import { ArrowDownToLine, X } from "lucide-react";
import { useEffect, useRef, useCallback } from "react";

export default function ImagePreview({
  src,
  alt,
  filename,
  onClose,
}: {
  src: string;
  alt?: string;
  filename?: string;
  onClose: () => void;
}) {
  const downloadImage = useCallback(async () => {
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || "image";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Failed to download image:", e);
      // fallback: open in new tab
      window.open(src, "_blank");
    }
  }, [src, filename]);

  const downloadBtnRef = useRef<HTMLButtonElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const downloadBtn = downloadBtnRef.current;
    const closeBtn = closeBtnRef.current;
    if (!downloadBtn && !closeBtn) return;

    const onDownloadPointer = (ev: Event) => {
      try {
        const pev = ev as PointerEvent;
        pev.stopPropagation();
        pev.stopImmediatePropagation();
      } catch {}
      downloadImage();
    };

    const onDownloadMouse = (ev: Event) => {
      try {
        const mev = ev as MouseEvent;
        mev.stopPropagation();
        mev.stopImmediatePropagation();
      } catch {}
      // intentionally do not call downloadImage here to avoid double-invocation
    };

    const onClosePointer = (ev: Event) => {
      try {
        const pev = ev as PointerEvent;
        pev.stopPropagation();
        pev.stopImmediatePropagation();
      } catch {}
      // Defer closing until after the current event loop so global preview
      // flag remains set for any document-level handlers that check it.
      setTimeout(() => onClose(), 0);
    };

    const onCloseMouse = (ev: Event) => {
      try {
        const mev = ev as MouseEvent;
        mev.stopPropagation();
        mev.stopImmediatePropagation();
      } catch {}
      // intentionally do not call onClose here to avoid double-invocation
    };

    if (downloadBtn) {
      downloadBtn.addEventListener("pointerdown", onDownloadPointer as EventListener, { capture: true });
      downloadBtn.addEventListener("mousedown", onDownloadMouse as EventListener, { capture: true });
    }
    if (closeBtn) {
      closeBtn.addEventListener("pointerdown", onClosePointer as EventListener, { capture: true });
      closeBtn.addEventListener("mousedown", onCloseMouse as EventListener, { capture: true });
    }

    return () => {
      if (downloadBtn) {
        downloadBtn.removeEventListener("pointerdown", onDownloadPointer as EventListener, { capture: true });
        downloadBtn.removeEventListener("mousedown", onDownloadMouse as EventListener, { capture: true });
      }
      if (closeBtn) {
        closeBtn.removeEventListener("pointerdown", onClosePointer as EventListener, { capture: true });
        closeBtn.removeEventListener("mousedown", onCloseMouse as EventListener, { capture: true });
      }
    };
  }, [downloadImage, onClose]);

  // Signal to other UI (MessageDrawer) that an image preview is open so
  // outside-click-to-close behavior can be temporarily disabled.
  useEffect(() => {
    try {
      (window as any).__campusImagePreviewOpen = true;
    } catch {}
    return () => {
      try {
        delete (window as any).__campusImagePreviewOpen;
      } catch {}
    };
  }, []);

  const content = (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.6)] p-4"
    >
      {/* buttons attached to the backdrop top-right */}
      <div className="absolute top-4 right-4 z-60 flex gap-2 pointer-events-auto">
          <button
            ref={downloadBtnRef}
            aria-label="Download image"
            type="button"
            className="bg-primary-lm p-1 rounded hover:bg-hover-lm pointer-events-auto z-70"
          >
            <ArrowDownToLine className="h-5 w-5" />
          </button>
          <button
            ref={closeBtnRef}
            aria-label="Close preview"
            type="button"
            className="bg-primary-lm p-1 rounded hover:bg-hover-lm pointer-events-auto z-70"
          >
            <X className="h-5 w-5" />
          </button>
      </div>

      <div className="relative max-w-[95%] max-h-[95%]" onClick={(e) => e.stopPropagation()}>
        <img src={src} alt={alt ?? filename ?? "image"} className="w-full h-auto max-h-[85vh] object-contain rounded-md" />
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}
