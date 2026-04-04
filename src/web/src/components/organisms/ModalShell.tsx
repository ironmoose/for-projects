import { useEffect } from "react";
import { useTheme } from "../theme/ThemeContext";
import { sg } from "../theme/synthGlow";
import { Overlay } from "../atoms/Overlay";
import { useShortcutSuppression } from "../../hooks/useKeyboardShortcuts";

interface ModalShellProps {
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: number;
  maxHeight?: string;
  zIndex?: number;
  suppressShortcuts?: boolean;
  handleEscape?: boolean;
  variant?: "default" | "danger";
  style?: React.CSSProperties;
}

export function ModalShell({
  onClose,
  children,
  maxWidth = 480,
  maxHeight,
  zIndex = 200,
  suppressShortcuts = true,
  handleEscape = true,
  variant = "default",
  style,
}: ModalShellProps) {
  const { theme, themeName } = useTheme();
  const isSynth = themeName === "synth";

  // Conditionally suppress keyboard shortcuts
  useShortcutSuppression(suppressShortcuts);

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

  const boxShadow = isSynth
    ? isDanger
      ? `0 0 25px ${theme.color.danger}25, 0 0 50px ${theme.color.tertiary}10, 0 8px 40px rgba(0,0,0,0.5)`
      : `0 0 30px ${sg(19)}, 0 0 60px ${sg(9)}, 0 8px 40px rgba(0,0,0,0.5)`
    : theme.shadow.lg;

  const borderColor = isSynth
    ? isDanger
      ? `${theme.color.danger}44`
      : sg(27)
    : theme.color.borderSubtle;

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
          {children}
        </div>
      </div>
    </>
  );
}
