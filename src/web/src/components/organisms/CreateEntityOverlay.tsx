import { useEffect } from "react";
import { useTheme } from "../theme/ThemeContext";
import { sg } from "../theme/synthGlow";
import { Button } from "../atoms/Button";
import { Overlay } from "../atoms/Overlay";

interface CreateEntityOverlayProps {
  title: string;
  onSubmit: () => Promise<void>;
  onClose: () => void;
  loading: boolean;
  submitDisabled?: boolean;
  submitLabel?: string;
  children: React.ReactNode;
}

export function CreateEntityOverlay({
  title,
  onSubmit,
  onClose,
  loading,
  submitDisabled,
  submitLabel = "Create",
  children,
}: CreateEntityOverlayProps) {
  const { theme, themeName } = useTheme();
  const isSynth = themeName === "synth";

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <>
      <Overlay onClick={onClose} zIndex={200} style={{ background: "rgba(0,0,0,0.5)" }} />
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 201,
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
            boxShadow: isSynth
              ? `0 0 30px ${sg(19)}, 0 0 60px ${sg(9)}, 0 8px 40px rgba(0,0,0,0.5)`
              : theme.shadow.lg,
            border: `1px solid ${isSynth ? sg(27) : theme.color.borderSubtle}`,
            width: "100%",
            maxWidth: 480,
            display: "flex",
            flexDirection: "column",
            gap: theme.spacing.lg,
            padding: theme.spacing.xl,
          }}
        >
          <h2
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

          {children}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: theme.spacing.sm }}>
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={onSubmit}
              loading={loading}
              disabled={submitDisabled}
            >
              {submitLabel}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
