import { useState } from "react";
import { useTheme } from "../theme/ThemeContext";
import { SidePanelLayout } from "../templates/SidePanelLayout";
import { Badge } from "../atoms/Badge";
import { IconButton } from "../atoms/IconButton";
import { Markdown } from "../molecules/Markdown";
import { MetadataTable } from "../molecules/MetadataTable";
import { Stack } from "../molecules/Stack";
import type { Action, ActionStatus } from "../../types";
import { actionStatusLabel, actionValidTransitions } from "../../types";
import { formatDate } from "../../utils";

interface ActionDetailPanelProps {
  action: Action;
  onClose: () => void;
  onStatusChange?: (status: ActionStatus) => Promise<void>;
}

export function ActionDetailPanel({ action, onClose, onStatusChange }: ActionDetailPanelProps) {
  const { theme } = useTheme();
  const transitions = actionValidTransitions[action.status];
  const [updating, setUpdating] = useState(false);

  const handleStatusChange = async (status: ActionStatus) => {
    if (updating || !onStatusChange) return;
    setUpdating(true);
    try {
      await onStatusChange(status);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <SidePanelLayout onClose={onClose}>
      {/* Header */}
      <div
        style={{
          padding: `${theme.spacing.xl} ${theme.spacing.xl} ${theme.spacing.lg}`,
          borderBottom: `1px solid ${theme.color.borderSubtle}`,
        }}
      >
        <Stack direction="row" justify="space-between" align="flex-start" gap="sm">
          <Stack direction="row" align="center" gap="sm" style={{ flex: 1, minWidth: 0, flexWrap: "wrap" }}>
            <Badge variant={action.status}>{actionStatusLabel[action.status]}</Badge>
            {action.agent && (
              <span
                style={{
                  fontSize: theme.font.size.xs,
                  color: theme.color.textMuted,
                }}
              >
                {action.agent}
              </span>
            )}
          </Stack>
          <IconButton icon="close" size={18} onClick={onClose} aria-label="Close detail panel" />
        </Stack>
      </div>

      {/* Body */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: theme.spacing.xl,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Prompt text */}
        <Markdown>{action.prompt}</Markdown>

        {/* Output */}
        <div style={{ marginTop: theme.spacing.xl, paddingTop: theme.spacing.lg, borderTop: `1px solid ${theme.color.borderSubtle}` }}>
          <span style={{ fontSize: theme.font.size.xs, fontWeight: 700, color: theme.color.textMuted, display: "block", marginBottom: theme.spacing.sm }}>
            Output
          </span>
          {action.output ? (
            <Markdown>{action.output}</Markdown>
          ) : (
            <p style={{ margin: 0, fontSize: theme.font.size.sm, color: theme.color.textFaint, fontStyle: "italic" }}>
              No output yet
            </p>
          )}
        </div>

        {/* Status transition controls */}
        {transitions.length > 0 && onStatusChange && (
          <div
            style={{
              display: "flex",
              gap: theme.spacing.sm,
              marginTop: theme.spacing.xl,
              paddingTop: theme.spacing.lg,
              borderTop: `1px solid ${theme.color.borderSubtle}`,
            }}
          >
            {transitions.map((next) => (
              <button
                key={next}
                disabled={updating}
                onClick={() => handleStatusChange(next)}
                style={{
                  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                  fontSize: theme.font.size.sm,
                  fontWeight: 600,
                  fontFamily: theme.font.body,
                  color: theme.color.primary,
                  background: `${theme.color.primary}11`,
                  border: `1px solid ${theme.color.primary}33`,
                  borderRadius: theme.radius.md,
                  cursor: updating ? "default" : "pointer",
                  transition: "background 0.15s, opacity 0.15s",
                  opacity: updating ? 0.5 : 1,
                }}
              >
                {next === "in_progress" ? "Start" : next === "complete" ? "Complete" : next === "failed" ? "Failed" : "Retry"}
              </button>
            ))}
          </div>
        )}

        {/* Metadata */}
        <div
          style={{
            marginTop: "auto",
            paddingTop: theme.spacing.xl,
            borderTop: `1px solid ${theme.color.borderSubtle}`,
          }}
        >
          <MetadataTable
            title="Metadata"
            rows={[
              { label: "ID", value: action.id },
{ label: "Created", value: formatDate(action.created_at) },
              { label: "Updated", value: formatDate(action.updated_at) },
            ]}
          />
        </div>
      </div>
    </SidePanelLayout>
  );
}
