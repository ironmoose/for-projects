import { useEffect, useId, useRef } from "react";
import { useTheme } from "../theme/ThemeContext";
import { Overlay } from "../atoms/Overlay";
import { useShortcutSuppression } from "../../hooks/useKeyboardShortcuts";
import { useFocusTrap } from "../../hooks/useFocusTrap";

interface ModalShellProps {
  onClose: () => void;
  children: React.ReactNode;
  /** Optional title rendered as an h2 inside the modal. Sets aria-labelledby automatically. */
  title?: string;
  maxWidth?: number;
  maxHeight?: string;
  zIndex?: number;
  suppressShortcuts?: boolean;
  handleEscape?: boolean;
  variant?: "default" | "danger";
  style?: React.CSSProperties;
  /** Custom aria-labelledby ID when title is rendered by the consumer instead of via the title prop. */
  ariaLabelledBy?: string;
}

export function ModalShell({
  onClose,
  children,
  title,
  maxWidth = 480,
  maxHeight,
  zIndex = 200,
  suppressShortcuts = true,
  handleEscape = true,
  variant = "default",
  style,
  ariaLabelledBy,
}: ModalShellProps) {
  const { theme } = useTheme();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // Conditionally suppress keyboard shortcuts
  useShortcutSuppression(suppressShortcuts);

  // Focus trap: traps Tab/Shift+Tab within the modal panel, restores focus on unmount
  useFocusTrap(panelRef);

  // Escape key handler (can be disabled when consumer manages its own)
  useEffect(() => {
    if (!handleEscape) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, handleEscape]);

  const isDanger = variant === "danger";

  const boxShadow = theme.glow.animated
    ? isDanger
      ? theme.glow.dangerShadow
      : theme.glow.shadowXl
    : theme.shadow.lg;

  const borderColor = theme.glow.animated
    ? isDanger
      ? theme.glow.dangerBorder
      : theme.glow.borderMedium
    : theme.color.borderSubtle;

  // Resolve aria-labelledby: explicit prop takes priority, then auto-generated title ID
  const resolvedLabelledBy = ariaLabelledBy ?? (title ? titleId : undefined);

  return (
    <>
      <Overlay onClick={onClose} zIndex={zIndex} style={{ background: "rgba(0,0,0,0.5)" }} />
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: zIndex + 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={resolvedLabelledBy}
          onClick={(e) => e.stopPropagation()}
          style={{
            pointerEvents: "auto",
            background: theme.color.surfaceContainer,
            borderRadius: theme.radius.lg,
            boxShadow,
            border: `1px solid ${borderColor}`,
            width: "100%",
            maxWidth,
            ...(maxHeight ? { maxHeight } : {}),
            display: "flex",
            flexDirection: "column",
            gap: theme.spacing.lg,
            padding: theme.spacing.xl,
            ...style,
          }}
        >
          {title && (
            <h2
              id={titleId}
              style={{
                margin: 0,
                fontFamily: theme.font.body,
                fontSize: theme.font.size.lg,
                fontWeight: 600,
                color: theme.color.text,
              }}
            >
              {title}
            </h2>
          )}
          {children}
        </div>
      </div>
    </>
  );
}
