import { createContext, useCallback, useContext, useEffect, useRef } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ShortcutEntry {
  /** Display key(s), e.g. "n", "g h", "?" */
  keys: string;
  /** Human-readable description */
  description: string;
  /** Handler to invoke */
  handler: () => void;
  /** Scope label for grouping in the help overlay */
  scope: string;
}

export interface KeyboardShortcutContextValue {
  /** Register a shortcut. Returns an unregister function. */
  register: (entry: ShortcutEntry) => () => void;
  /** Get all currently registered shortcuts (for the help overlay). */
  getShortcuts: () => ShortcutEntry[];
  /** Whether any overlay/modal is currently suppressing shortcuts. */
  suppressRef: React.RefObject<number>;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export const KeyboardShortcutContext = createContext<KeyboardShortcutContextValue | null>(null);

// ---------------------------------------------------------------------------
// Core hook — manages the registry and global keydown listener.
// Call this ONCE at the App root.
// ---------------------------------------------------------------------------

export function useKeyboardShortcutManager() {
  const entriesRef = useRef<ShortcutEntry[]>([]);
  const pendingKeyRef = useRef<string | null>(null);
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Positive value means shortcuts are suppressed (overlay count). */
  const suppressRef = useRef<number>(0);

  const register = useCallback((entry: ShortcutEntry): (() => void) => {
    entriesRef.current = [...entriesRef.current, entry];
    return () => {
      entriesRef.current = entriesRef.current.filter((e) => e !== entry);
    };
  }, []);

  const getShortcuts = useCallback((): ShortcutEntry[] => {
    return entriesRef.current;
  }, []);

  // Global keydown listener
  useEffect(() => {
    function isInputFocused(): boolean {
      const el = document.activeElement;
      if (!el) return false;
      const tag = el.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      if ((el as HTMLElement).isContentEditable) return true;
      return false;
    }

    function handleKeyDown(e: KeyboardEvent) {
      // Never intercept modifier-heavy combos (let browser/existing handlers handle them)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // Allow "?" even when suppressed (it toggles the help overlay)
      const key = e.key;
      const isSuppressed = suppressRef.current > 0;

      // Don't fire shortcuts when typing in inputs
      if (isInputFocused()) return;

      // Check for two-key sequence completion
      if (pendingKeyRef.current !== null) {
        const combo = `${pendingKeyRef.current} ${key}`;
        pendingKeyRef.current = null;
        if (pendingTimerRef.current !== null) {
          clearTimeout(pendingTimerRef.current);
          pendingTimerRef.current = null;
        }

        if (!isSuppressed) {
          const match = entriesRef.current.find((entry) => entry.keys === combo);
          if (match) {
            e.preventDefault();
            match.handler();
            return;
          }
        }
        // No match for combo — fall through (don't try to match the second key alone)
        return;
      }

      // Check if this key starts a two-key sequence
      const hasSequence = entriesRef.current.some((entry) => entry.keys.startsWith(`${key} `));
      if (hasSequence && !isSuppressed) {
        pendingKeyRef.current = key;
        pendingTimerRef.current = setTimeout(() => {
          pendingKeyRef.current = null;
          pendingTimerRef.current = null;
        }, 500);
        return;
      }

      // "?" always works (toggles help overlay)
      if (key === "?") {
        const match = entriesRef.current.find((entry) => entry.keys === "?");
        if (match) {
          e.preventDefault();
          match.handler();
          return;
        }
      }

      // Single-key shortcuts — only when not suppressed
      if (isSuppressed) return;

      const match = entriesRef.current.find((entry) => entry.keys === key);
      if (match) {
        e.preventDefault();
        match.handler();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return { register, getShortcuts, suppressRef };
}

// ---------------------------------------------------------------------------
// Consumer hook — pages and components use this to register shortcuts.
// ---------------------------------------------------------------------------

export function useShortcut(
  keys: string,
  description: string,
  handler: () => void,
  scope: string = "Global",
) {
  const ctx = useContext(KeyboardShortcutContext);
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!ctx) return;
    const entry: ShortcutEntry = {
      keys,
      description,
      handler: () => handlerRef.current(),
      scope,
    };
    return ctx.register(entry);
  }, [ctx, keys, description, scope]);
}

// ---------------------------------------------------------------------------
// Hook to suppress shortcuts while an overlay is open.
// Call at mount of any overlay/modal.
// ---------------------------------------------------------------------------

export function useShortcutSuppression(active = true) {
  const ctx = useContext(KeyboardShortcutContext);

  useEffect(() => {
    if (!ctx || !active) return;
    (ctx.suppressRef as React.MutableRefObject<number>).current += 1;
    return () => {
      (ctx.suppressRef as React.MutableRefObject<number>).current -= 1;
    };
  }, [ctx, active]);
}

// ---------------------------------------------------------------------------
// Hook to read all registered shortcuts (for help overlay).
// ---------------------------------------------------------------------------

export function useRegisteredShortcuts(): ShortcutEntry[] {
  const ctx = useContext(KeyboardShortcutContext);
  if (!ctx) return [];
  return ctx.getShortcuts();
}
