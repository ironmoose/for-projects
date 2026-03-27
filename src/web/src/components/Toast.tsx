import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "./theme/ThemeContext";
import { Icon } from "./atoms/Icon";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ToastType = "error" | "success";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

// ---------------------------------------------------------------------------
// Hook — useToast
// ---------------------------------------------------------------------------

let toastIdCounter = 0;

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "error") => {
      const id = `toast-${++toastIdCounter}`;
      setToasts((prev) => [...prev, { id, message, type }]);
      const timer = setTimeout(() => dismiss(id), type === "error" ? 6000 : 3000);
      timersRef.current.set(id, timer);
    },
    [dismiss],
  );

  // Cleanup on unmount
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    };
  }, []);

  return { toasts, showToast, dismiss };
}

// ---------------------------------------------------------------------------
// Component — ToastContainer
// ---------------------------------------------------------------------------

export function ToastContainer({
  toasts,
  dismiss,
}: {
  toasts: Toast[];
  dismiss: (id: string) => void;
}) {
  const { theme } = useTheme();

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        maxWidth: 400,
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => dismiss(t.id)}
          style={{
            pointerEvents: "auto",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            borderRadius: theme.radius.lg,
            background: t.type === "error" ? theme.color.danger : theme.color.success,
            color: "#fff",
            fontSize: theme.font.size.sm,
            lineHeight: 1.4,
            boxShadow: theme.shadow.md,
            cursor: "pointer",
            animation: "toast-in 0.2s ease-out",
          }}
        >
          <Icon
            name={t.type === "error" ? "error_outline" : "check_circle"}
            size={16}
            style={{ flexShrink: 0 }}
          />
          <span style={{ flex: 1, minWidth: 0 }}>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
