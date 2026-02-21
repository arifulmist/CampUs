import { useCallback } from "react";

/**
 * Returns an onKeyDown handler for a <form> element that moves focus
 * to the next focusable field when the user presses Enter, instead of
 * submitting the form.  On the *last* field the default submit
 * behaviour is preserved.
 */
export function useEnterToNextField() {
  return useCallback((e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key !== "Enter") return;

    const target = e.target as HTMLElement;
    const tag = target.tagName.toLowerCase();

    // Only intercept Enter on input / select elements (not buttons or textareas)
    if (tag !== "input" && tag !== "select") return;

    // Don't intercept if the input type is "submit"
    if (tag === "input" && (target as HTMLInputElement).type === "submit")
      return;

    const form = e.currentTarget;
    const focusable = Array.from(
      form.querySelectorAll<HTMLElement>(
        'input:not([disabled]):not([type="hidden"]):not([type="file"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])',
      ),
    );

    const currentIndex = focusable.indexOf(target);
    if (currentIndex === -1) return;

    // Find the next focusable element that is an input or select (skip buttons)
    for (let i = currentIndex + 1; i < focusable.length; i++) {
      const next = focusable[i];
      const nextTag = next.tagName.toLowerCase();

      if (
        nextTag === "input" ||
        nextTag === "select" ||
        nextTag === "textarea"
      ) {
        e.preventDefault();
        next.focus();
        return;
      }

      // If we hit a submit button, let the form submit naturally
      if (
        nextTag === "button" &&
        ((next as HTMLButtonElement).type === "submit" ||
          !(next as HTMLButtonElement).type)
      ) {
        return; // allow default submit
      }
    }

    // If no next input found, allow default (submit)
  }, []);
}
