import { useTheme } from "../theme/ThemeContext";
import { Button } from "../atoms/Button";
import { ModalShell } from "./ModalShell";

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
  const { theme } = useTheme();

  return (
    <ModalShell onClose={onClose} maxWidth={480}>
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
    </ModalShell>
  );
}
