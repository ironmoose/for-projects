import { Badge, useTheme } from "..";
import type { ActionLogEntry } from "../../types";
import { formatDate } from "../../utils";

type BadgeVariant = "running" | "done" | "failed" | "default";

function statusVariant(status: string): BadgeVariant {
  if (status === "running") return "running";
  if (status === "done") return "done";
  if (status === "failed") return "failed";
  return "default";
}

function truncateId(id: string): string {
  return id.length > 10 ? `${id.slice(0, 10)}...` : id;
}

function snippetOutput(output: string | null, maxLen = 80): string {
  if (!output) return "-";
  return output.length > maxLen ? `${output.slice(0, maxLen)}...` : output;
}

interface ActionLogTableProps {
  entries: ActionLogEntry[];
}

export function ActionLogTable({ entries }: ActionLogTableProps) {
  const { theme } = useTheme();

  return (
    <div
      style={{
        borderRadius: theme.radius.lg,
        overflow: "hidden",
        border: `1px solid ${theme.color.borderSubtle}`,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          gap: theme.spacing.md,
          padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
          background: theme.color.surfaceContainerHigh,
          borderBottom: `1px solid ${theme.color.borderSubtle}`,
          fontSize: theme.font.size.xs,
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: theme.color.textFaint,
          fontFamily: theme.font.body,
        }}
      >
        <span style={{ width: 80, flexShrink: 0 }}>Status</span>
        <span style={{ width: 80, flexShrink: 0 }}>Entity</span>
        <span style={{ width: 110, flexShrink: 0 }}>Entity ID</span>
        <span style={{ flex: 1, minWidth: 0 }}>Output</span>
        <span style={{ width: 150, flexShrink: 0 }}>Started</span>
        <span style={{ width: 150, flexShrink: 0 }}>Finished</span>
      </div>

      {/* Rows */}
      {entries.map((entry) => (
        <div
          key={entry.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: theme.spacing.md,
            padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
            background: theme.color.surfaceContainer,
            borderBottom: `1px solid ${theme.color.borderSubtle}`,
            fontSize: theme.font.size.sm,
            color: theme.color.text,
          }}
        >
          <span style={{ width: 80, flexShrink: 0 }}>
            <Badge variant={statusVariant(entry.status)}>{entry.status}</Badge>
          </span>
          <span style={{ width: 80, flexShrink: 0, color: theme.color.textMuted }}>
            {entry.entity_type}
          </span>
          <span
            style={{
              width: 110,
              flexShrink: 0,
              fontFamily: theme.font.mono,
              fontSize: theme.font.size.xxs,
              color: theme.color.textMuted,
            }}
            title={entry.entity_id}
          >
            {truncateId(entry.entity_id)}
          </span>
          <span
            style={{
              flex: 1,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              color: theme.color.text,
            }}
            title={entry.output ?? undefined}
          >
            {snippetOutput(entry.output)}
          </span>
          <span
            style={{
              width: 150,
              flexShrink: 0,
              fontSize: theme.font.size.xxs,
              color: theme.color.textFaint,
              fontFamily: theme.font.mono,
            }}
          >
            {formatDate(entry.started_at)}
          </span>
          <span
            style={{
              width: 150,
              flexShrink: 0,
              fontSize: theme.font.size.xxs,
              color: theme.color.textFaint,
              fontFamily: theme.font.mono,
            }}
          >
            {entry.finished_at ? formatDate(entry.finished_at) : "-"}
          </span>
        </div>
      ))}
    </div>
  );
}
