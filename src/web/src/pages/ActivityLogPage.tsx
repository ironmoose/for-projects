import { useMemo, useState } from "react";
import {
  Badge,
  EmptyState,
  ListPageLayout,
  PageHeader,
  Pagination,
  Select,
  useTheme,
} from "../components";
import { useActivityLog } from "../hooks/useActivityLog";
import type { ActivityLog } from "../types";
import { relativeTime, formatDate } from "../utils";

// ---------------------------------------------------------------------------
// Action badge mapping
// ---------------------------------------------------------------------------

const ACTION_VARIANTS: Record<string, "complete" | "active" | "failed" | "default"> = {
  created: "complete",
  updated: "active",
  deleted: "failed",
};

function ActionBadge({ action }: { action: string }) {
  return <Badge variant={ACTION_VARIANTS[action] ?? "default"}>{action}</Badge>;
}

// ---------------------------------------------------------------------------
// Summary renderer
// ---------------------------------------------------------------------------

function SummaryCell({ summary }: { summary: string }) {
  const { theme } = useTheme();

  const parsed = useMemo(() => {
    try {
      return JSON.parse(summary) as Record<string, unknown>;
    } catch {
      return null;
    }
  }, [summary]);

  if (!parsed || Object.keys(parsed).length === 0) {
    return <span style={{ color: theme.color.textFaint }}>--</span>;
  }

  const parts: string[] = [];

  if (typeof parsed.title === "string") {
    parts.push(parsed.title);
  }
  if (Array.isArray(parsed.fields) && parsed.fields.length > 0) {
    parts.push((parsed.fields as string[]).join(", "));
  }
  if (typeof parsed.project_id === "string") {
    parts.push(`project ${(parsed.project_id as string).slice(-6)}`);
  }

  return (
    <span
      style={{
        fontFamily: theme.font.mono,
        fontSize: theme.font.size.xxs,
        color: theme.color.textMuted,
      }}
    >
      {parts.join(" \u00b7 ") || summary}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Table row
// ---------------------------------------------------------------------------

function LogRow({ log }: { log: ActivityLog }) {
  const { theme } = useTheme();

  return (
    <tr>
      <td style={cellStyle(theme)}>
        <ActionBadge action={log.action} />
      </td>
      <td style={cellStyle(theme)}>
        <Badge variant="default">{log.entity_type}</Badge>
      </td>
      <td
        style={{
          ...cellStyle(theme),
          fontFamily: theme.font.mono,
          fontSize: theme.font.size.xxs,
          color: theme.color.textFaint,
        }}
      >
        {log.entity_id ? log.entity_id.slice(-8) : "--"}
      </td>
      <td style={cellStyle(theme)}>
        <SummaryCell summary={log.summary} />
      </td>
      <td
        style={{
          ...cellStyle(theme),
          fontFamily: theme.font.mono,
          fontSize: theme.font.size.xxs,
          color: theme.color.textFaint,
          whiteSpace: "nowrap",
        }}
        title={formatDate(log.created_at)}
      >
        {relativeTime(log.created_at)}
      </td>
    </tr>
  );
}

function cellStyle(theme: ReturnType<typeof useTheme>["theme"]): React.CSSProperties {
  return {
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    borderBottom: `1px solid ${theme.color.border}`,
    verticalAlign: "middle",
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function ActivityLogPage() {
  const { theme } = useTheme();
  const [entityType, setEntityType] = useState<string | undefined>(undefined);

  const filter = useMemo(
    () => (entityType ? { entity_type: entityType } : undefined),
    [entityType],
  );

  const { logs, total, totalPages, page, setPage, loading } = useActivityLog(filter);

  return (
    <ListPageLayout>
      <PageHeader
        title="Activity Log"
        subtitle={`${total} events recorded`}
        trailing={
          <Select
            value={entityType ?? ""}
            onChange={(e) => {
              setEntityType(e.target.value || undefined);
              setPage(1);
            }}
            options={[
              { value: "", label: "All types" },
              { value: "project", label: "Projects" },
              { value: "task", label: "Tasks" },
            ]}
            style={{ minWidth: 140 }}
          />
        }
        style={{ marginBottom: theme.spacing.xl }}
      />

      {loading ? (
        <div style={{ textAlign: "center", padding: theme.spacing.xl, color: theme.color.textMuted }}>
          Loading...
        </div>
      ) : logs.length === 0 ? (
        <EmptyState icon="history" message="No activity recorded yet." variant="card" />
      ) : (
        <div
          style={{
            overflowX: "auto",
            borderRadius: theme.radius.lg,
            border: `1px solid ${theme.color.border}`,
            background: theme.color.surface,
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: theme.font.size.sm,
              color: theme.color.text,
            }}
          >
            <thead>
              <tr>
                {["Action", "Type", "Entity", "Details", "When"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                      textAlign: "left",
                      fontWeight: 600,
                      fontSize: theme.font.size.xxs,
                      color: theme.color.textMuted,
                      textTransform: "uppercase",
                      letterSpacing: theme.font.letterSpacing.wide,
                      borderBottom: `2px solid ${theme.color.border}`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <LogRow key={log.id} log={log} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          onPageChange={setPage}
        />
      )}
    </ListPageLayout>
  );
}
