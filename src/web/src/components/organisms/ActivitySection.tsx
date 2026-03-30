import type { ActionLogEntry } from "../../types";
import { relativeTime, formatDate } from "../../utils";
import { useTheme } from "../theme/ThemeContext";
import { SectionLabel } from "../atoms/SectionLabel";
import { Select } from "../atoms/Select";
import { StatusDot } from "../atoms/StatusDot";
import { Badge } from "../atoms/Badge";
import { AnimatedList } from "../molecules/AnimatedList";
import { EmptyState } from "../molecules/EmptyState";

interface ActivitySectionProps {
  running: ActionLogEntry[];
  recent: ActionLogEntry[];
  loading: boolean;
  timeframeMinutes: number;
  onTimeframeChange: (minutes: number) => void;
}

const timeframeOptions = [
  { value: "15", label: "Last 15 min" },
  { value: "60", label: "Last hour" },
  { value: "240", label: "Last 4 hours" },
  { value: "1440", label: "Last 24 hours" },
  { value: "10080", label: "Last 7 days" },
];

function statusToBadgeVariant(status: string): "running" | "complete" | "failed" | "default" {
  switch (status) {
    case "running": return "running";
    case "complete": return "complete";
    case "failed": return "failed";
    default: return "default";
  }
}

export function ActivitySection({ running, recent, loading, timeframeMinutes, onTimeframeChange }: ActivitySectionProps) {
  const { theme } = useTheme();

  const isEmpty = running.length === 0 && recent.length === 0 && !loading;

  return (
    <div style={{ marginBottom: theme.spacing.xl }}>
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: theme.spacing.md,
        }}
      >
        <SectionLabel>Live Activity</SectionLabel>
        <Select
          value={String(timeframeMinutes)}
          onChange={(e) => onTimeframeChange(Number(e.target.value))}
          options={timeframeOptions}
          style={{ fontSize: theme.font.size.xxs }}
        />
      </div>

      {isEmpty && (
        <EmptyState
          icon="bolt"
          message="No activity in this timeframe."
          variant="card"
        />
      )}

      {/* Running subsection */}
      {running.length > 0 && (
        <div style={{ marginBottom: theme.spacing.md }}>
          <SectionLabel style={{ marginBottom: theme.spacing.sm, color: theme.color.primary }}>
            Running
          </SectionLabel>
          <div
            style={{
              borderRadius: theme.radius.lg,
              overflow: "hidden",
              border: `1px solid ${theme.color.borderSubtle}`,
            }}
          >
            <AnimatedList
              items={running}
              renderItem={(entry) => (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: theme.spacing.sm,
                    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                    background: theme.color.surfaceContainer,
                    borderBottom: `1px solid ${theme.color.borderSubtle}`,
                  }}
                >
                  <StatusDot color={theme.color.primary} animate="pulse" glowColor={`${theme.color.primary}33`} />
                  <span style={{ fontSize: theme.font.size.xs, color: theme.color.textMuted, minWidth: 0 }}>
                    {entry.entity_type}/{entry.entity_id.slice(0, 8)}
                  </span>
                  <Badge variant="running">{entry.status}</Badge>
                  <span style={{ marginLeft: "auto", fontSize: theme.font.size.xxs, color: theme.color.textFaint, fontFamily: theme.font.mono, flexShrink: 0 }}>
                    {relativeTime(entry.started_at)}
                  </span>
                </div>
              )}
            />
          </div>
        </div>
      )}

      {/* Recent subsection */}
      {recent.length > 0 && (
        <div>
          <SectionLabel style={{ marginBottom: theme.spacing.sm }}>
            Recent
          </SectionLabel>
          <div
            style={{
              borderRadius: theme.radius.lg,
              overflow: "hidden",
              border: `1px solid ${theme.color.borderSubtle}`,
            }}
          >
            <AnimatedList
              items={recent}
              renderItem={(entry) => {
                const dotColor = entry.status === "failed" ? theme.color.danger : theme.color.success;
                const badgeVariant = statusToBadgeVariant(entry.status);
                return (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: theme.spacing.sm,
                      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                      background: theme.color.surfaceContainer,
                      borderBottom: `1px solid ${theme.color.borderSubtle}`,
                    }}
                  >
                    <StatusDot color={dotColor} />
                    <span style={{ fontSize: theme.font.size.xs, color: theme.color.textMuted, minWidth: 0 }}>
                      {entry.entity_type}/{entry.entity_id.slice(0, 8)}
                    </span>
                    <Badge variant={badgeVariant}>{entry.status}</Badge>
                    <span style={{ marginLeft: "auto", fontSize: theme.font.size.xxs, color: theme.color.textFaint, fontFamily: theme.font.mono, flexShrink: 0 }}>
                      {entry.finished_at ? formatDate(entry.finished_at) : relativeTime(entry.started_at)}
                    </span>
                  </div>
                );
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
