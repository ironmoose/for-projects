import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

/**
 * Traps focus within a container element. On mount, saves the previously
 * focused element and auto-focuses the first focusable child. On unmount,
 * restores focus to the saved element.
 *
 * Tab and Shift+Tab cycle through focusable elements without escaping.
 */
export function useFocusTrap(containerRef: React.RefObject<HTMLElement | null>) {
  const triggerRef = useRef<Element | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Save the element that had focus before the trap was activated
    triggerRef.current = document.activeElement;

    // Auto-focus the first focusable element inside the container
    const focusables = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    if (focusables.length > 0) {
      focusables[0].focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      const currentFocusables = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (currentFocusables.length === 0) return;

      const first = currentFocusables[0];
      const last = currentFocusables[currentFocusables.length - 1];

      if (e.shiftKey) {
        // Shift+Tab on first element wraps to last
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab on last element wraps to first
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    container.addEventListener("keydown", handleKeyDown);

    return () => {
      container.removeEventListener("keydown", handleKeyDown);

      // Restore focus to the element that triggered the modal
      const trigger = triggerRef.current;
      if (trigger && trigger instanceof HTMLElement) {
        trigger.focus();
      }
    };
  }, [containerRef]);
}
