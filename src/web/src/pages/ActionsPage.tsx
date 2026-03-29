import { useState, useMemo } from "react";
import {
  Badge,
  StatusDot,
  useTheme,
  ListPageLayout,
  PageHeader,
  EmptyState,
  HighlightOnChange,
} from "../components";
import { useActionsDashboard } from "../hooks";
import type { EntityActionDashboardRow } from "../types";
import { formatDate } from "../utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FilterTab = "all" | "in_progress" | "complete" | "failed" | "todo";

const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "in_progress", label: "In Progress" },
  { value: "complete", label: "Complete" },
  { value: "failed", label: "Failed" },
  { value: "todo", label: "To Do" },
];

// ---------------------------------------------------------------------------
// Status color helper
// ---------------------------------------------------------------------------

function statusColor(theme: ReturnType<typeof useTheme>["theme"], status: string): string {
  switch (status) {
    case "in_progress": return theme.color.tertiary;
    case "complete": return theme.color.success;
    case "failed": return theme.color.danger;
    case "todo": return theme.color.textMuted;
    default: return theme.color.textFaint;
  }
}

// ---------------------------------------------------------------------------
// StatusSummaryBar
// ---------------------------------------------------------------------------

function StatusSummaryBar({ rows }: { rows: EntityActionDashboardRow[] }) {
  const { theme } = useTheme();
  const counts: Record<string, number> = { todo: 0, in_progress: 0, complete: 0, failed: 0 };
  for (const r of rows) {
    if (r.status in counts) counts[r.status]++;
  }

  const items: Array<{ status: string; label: string }> = [
    { status: "in_progress", label: "in progress" },
    { status: "complete", label: "complete" },
    { status: "failed", label: "failed" },
    { status: "todo", label: "to do" },
  ];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: theme.spacing.lg,
        height: 40,
        background: theme.color.surfaceContainerLow,
        borderRadius: theme.radius.lg,
        padding: `${theme.spacing.sm} ${theme.spacing.xl}`,
        marginBottom: theme.spacing.xl,
      }}
    >
      {items.map((item, i) => (
        <div key={item.status} style={{ display: "flex", alignItems: "center", gap: theme.spacing.sm }}>
          {i > 0 && (
            <div
              style={{
                width: 1,
                height: 16,
                background: theme.color.borderSubtle,
                marginRight: theme.spacing.sm,
              }}
            />
          )}
          <StatusDot color={statusColor(theme, item.status)} />
          <span
            style={{
              fontFamily: theme.font.mono,
              fontSize: theme.font.size.sm,
              color: theme.color.text,
              fontWeight: 600,
            }}
          >
            {counts[item.status]}
          </span>
          <span
            style={{
              fontSize: theme.font.size.xs,
              color: theme.color.textMuted,
            }}
          >
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FilterTabs
// ---------------------------------------------------------------------------

function FilterTabs({
  active,
  onChange,
}: {
  active: FilterTab;
  onChange: (tab: FilterTab) => void;
}) {
  const { theme } = useTheme();

  return (
    <div
      style={{
        display: "flex",
        gap: theme.spacing.xs,
        marginBottom: theme.spacing.lg,
      }}
    >
      {FILTER_TABS.map((tab) => {
        const isActive = tab.value === active;
        return (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            style={{
              padding: `${theme.spacing.xs} ${theme.spacing.md}`,
              borderRadius: theme.radius.md,
              border: "none",
              cursor: "pointer",
              fontSize: theme.font.size.xs,
              fontWeight: isActive ? 700 : 500,
              fontFamily: theme.font.body,
              background: isActive ? theme.color.primary : theme.color.surfaceContainerHigh,
              color: isActive ? theme.color.onPrimary : theme.color.textMuted,
              transition: `background 150ms, color 150ms`,
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ActionRow
// ---------------------------------------------------------------------------

function ActionRow({
  row,
  onNavigate,
}: {
  row: EntityActionDashboardRow;
  onNavigate: (path: string) => void;
}) {
  const { theme } = useTheme();

  const targetPath = row.entity_type === "task" && row.project_id
    ? `/projects/${row.project_id}`
    : row.entity_type === "project"
    ? `/projects/${row.entity_id}`
    : null;

  function handleClick() {
    if (targetPath) onNavigate(targetPath);
  }

  const badgeVariant = row.status === "in_progress"
    ? "in_progress"
    : row.status === "complete"
    ? "complete"
    : row.status === "failed"
    ? "failed"
    : "todo";

  return (
    <HighlightOnChange trackValue={row.updated_at}>
      <div
        onClick={handleClick}
        role={targetPath ? "button" : undefined}
        tabIndex={targetPath ? 0 : undefined}
        onKeyDown={(e) => {
          if (targetPath && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            handleClick();
          }
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: theme.spacing.md,
          height: theme.layout.tableRowHeight,
          padding: `0 ${theme.spacing.lg}`,
          background: theme.color.surfaceContainer,
          borderBottom: `1px solid ${theme.color.borderSubtle}`,
          cursor: targetPath ? "pointer" : "default",
          transition: `background ${theme.animation.duration.fast} ${theme.animation.easing.default}`,
        }}
        onMouseEnter={(e) => {
          if (targetPath) e.currentTarget.style.background = theme.color.surfaceContainerHigh;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = theme.color.surfaceContainer;
        }}
      >
        <StatusDot color={statusColor(theme, row.status)} />

        <Badge variant={badgeVariant} style={{ flexShrink: 0, minWidth: 80, textAlign: "center" }}>
          {row.status.replace("_", " ")}
        </Badge>

        <span
          style={{
            flexShrink: 0,
            fontSize: theme.font.size.xxs,
            fontWeight: 600,
            fontFamily: theme.font.mono,
            color: theme.color.textMuted,
            textTransform: "uppercase",
            minWidth: 60,
          }}
        >
          {row.entity_type}
        </span>

        <span
          style={{
            flex: "1 1 auto",
            minWidth: 0,
            fontSize: theme.font.size.sm,
            fontWeight: 600,
            color: theme.color.text,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {row.entity_name || row.entity_id}
        </span>

        <span
          style={{
            flexShrink: 0,
            fontSize: theme.font.size.xxs,
            fontFamily: theme.font.mono,
            color: theme.color.textFaint,
            textTransform: "uppercase",
            minWidth: 90,
          }}
        >
          {row.role}
        </span>

        {row.action_agent && (
          <span
            style={{
              flexShrink: 0,
              fontSize: theme.font.size.xxs,
              fontFamily: theme.font.mono,
              color: theme.color.textFaint,
              minWidth: 60,
            }}
          >
            {row.action_agent}
          </span>
        )}

        <span
          style={{
            flexShrink: 0,
            fontSize: theme.font.size.xxs,
            color: theme.color.textFaint,
            fontFamily: theme.font.mono,
            minWidth: 100,
            textAlign: "right" as const,
          }}
        >
          {formatDate(row.updated_at)}
        </span>
      </div>
    </HighlightOnChange>
  );
}

// ---------------------------------------------------------------------------
// ActionsPage
// ---------------------------------------------------------------------------

export function ActionsPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { rows, loading } = useActionsDashboard();
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const filtered = useMemo(() => {
    if (activeTab === "all") return rows;
    return rows.filter((r) => r.status === activeTab);
  }, [rows, activeTab]);

  return (
    <ListPageLayout>
      <PageHeader
        title="Actions"
        subtitle="Monitor entity actions being worked on and completed in real time."
        style={{ marginBottom: "1rem" }}
      />

      {rows.length > 0 && <StatusSummaryBar rows={rows} />}

      <FilterTabs active={activeTab} onChange={setActiveTab} />

      <div
        style={{
          borderRadius: "0.75rem",
          overflow: "hidden",
          border: "1px solid var(--border-subtle, #333)",
        }}
      >
        {filtered.map((row) => (
          <ActionRow
            key={`${row.entity_type}-${row.entity_id}-${row.role}`}
            row={row}
            onNavigate={onNavigate}
          />
        ))}
      </div>

      {!loading && rows.length === 0 && (
        <EmptyState
          icon="play_arrow"
          message="No entity actions yet. Actions will appear here once linked to projects or tasks."
          variant="card"
        />
      )}

      {!loading && rows.length > 0 && filtered.length === 0 && (
        <EmptyState
          icon="filter_list"
          message={`No actions with status "${activeTab.replace("_", " ")}".`}
          variant="card"
        />
      )}
    </ListPageLayout>
  );
}
