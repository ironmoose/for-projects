import { useState } from "react";
import { useTheme } from "../theme/ThemeContext";
import { Card } from "./Card";
import { Stack } from "./Stack";
import { Button } from "../atoms/Button";

interface CreateFormProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: () => Promise<void>;
  creating: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function CreateForm({ visible, onCancel, onSubmit, creating, children, style }: CreateFormProps) {
  const { theme } = useTheme();

  if (!visible) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit();
  }

  return (
    <Card variant="default" padding="lg" style={{ marginBottom: theme.spacing.xl, ...style }}>
      <form onSubmit={handleSubmit}>
        <Stack direction="row" gap="sm" align="flex-end" wrap>
          {children}
          <Stack direction="row" gap="sm">
            <Button type="submit" disabled={creating}>{creating ? "Creating..." : "Create"}</Button>
            <Button variant="ghost" onClick={onCancel} type="button">
              Cancel
            </Button>
          </Stack>
        </Stack>
      </form>
    </Card>
  );
}
