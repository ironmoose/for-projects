import { semantic as t } from "@4lt7ab/ui/core";
import { Button } from "@4lt7ab/ui/ui";
import { ModalShell } from "./ModalShell";

function ButtonSpinner() {
  return (
    <span
      style={{
        display: "inline-block",
        width: 14,
        height: 14,
        border: "2px solid currentColor",
        borderTopColor: "transparent",
        borderRadius: "50%",
        animation: "spin 0.6s linear infinite",
      }}
    />
  );
}

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
  return (
    <ModalShell onClose={onClose} maxWidth={480} title={title}>
      {children}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: t.spaceSm }}>
        <Button variant="ghost" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={onSubmit}
          disabled={loading || submitDisabled}
        >
          {loading ? <ButtonSpinner /> : submitLabel}
        </Button>
      </div>
    </ModalShell>
  );
}
