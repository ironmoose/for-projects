import { Badge, useTheme } from "..";
import type { Session } from "../../types";
import { formatDate } from "../../utils";

function truncateId(id: string): string {
  return id.length > 10 ? `${id.slice(0, 10)}...` : id;
}

function snippetSummary(summary: string | null, maxLen = 120): string {
  if (!summary) return "-";
  return summary.length > maxLen ? `${summary.slice(0, maxLen)}...` : summary;
}

interface SessionTableProps {
  entries: Session[];
}

export function SessionTable({ entries }: SessionTableProps) {
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
        <span style={{ width: 110, flexShrink: 0 }}>Project ID</span>
        <span style={{ flex: 1, minWidth: 0 }}>Summary</span>
        <span style={{ width: 150, flexShrink: 0 }}>Started</span>
        <span style={{ width: 150, flexShrink: 0 }}>Finished</span>
      </div>

      {/* Rows */}
      {entries.map((entry) => {
        const isActive = !entry.finished_at;
        return (
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
              <Badge variant={isActive ? "running" : "done"}>
                {isActive ? "active" : "closed"}
              </Badge>
            </span>
            <span
              style={{
                width: 110,
                flexShrink: 0,
                fontFamily: theme.font.mono,
                fontSize: theme.font.size.xxs,
                color: theme.color.textMuted,
              }}
              title={entry.project_id}
            >
              {truncateId(entry.project_id)}
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
              title={entry.summary ?? undefined}
            >
              {snippetSummary(entry.summary)}
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
        );
      })}
    </div>
  );
}
