import { useCallback, useEffect, useRef, useState } from "react";
import { semantic as t } from "@4lt7ab/ui/core";
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
  if (toasts.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
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
      {toasts.map((toast) => (
        <div
          key={toast.id}
          onClick={() => dismiss(toast.id)}
          style={{
            pointerEvents: "auto",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            borderRadius: t.radiusLg,
            background: toast.type === "error" ? t.colorActionDestructive : t.colorSuccess,
            color: "#fff",
            fontSize: t.fontSizeSm,
            lineHeight: 1.4,
            boxShadow: t.shadowMd,
            cursor: "pointer",
            animation: "toast-in 0.2s ease-out",
          }}
        >
          <Icon
            name={toast.type === "error" ? "error_outline" : "check_circle"}
            size={16}
            style={{ flexShrink: 0 }}
          />
          <span style={{ flex: 1, minWidth: 0 }}>{toast.message}</span>
        </div>
      ))}
    </div>
  );
}
