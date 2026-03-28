import { useState } from "react";
import {
  PageHeader,
  Badge,
  useTheme,
  EmptyState,
  ActionDetailPanel,
} from "../components";
import { useActionsDashboard } from "../hooks";
import { ActionCard } from "../components/molecules/ActionCard";
import type { Action } from "../types";

// ---------------------------------------------------------------------------
// Column
// ---------------------------------------------------------------------------

function Column({
  title,
  count,
  emptyMessage,
  compact,
  children,
}: {
  title: string;
  count: number;
  emptyMessage: string;
  compact?: boolean;
  children: React.ReactNode;
}) {
  const { theme } = useTheme();

  return (
    <div style={{ flex: compact ? "1 1 160px" : "1 1 300px", minWidth: 0 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: theme.spacing.sm,
          marginBottom: theme.spacing.md,
        }}
      >
        <span
          style={{
            fontSize: theme.font.size.sm,
            fontWeight: 700,
            color: theme.color.text,
          }}
        >
          {title}
        </span>
        <Badge variant="default">{count}</Badge>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.sm }}>
        {count === 0 ? (
          <EmptyState icon="check_circle" message={emptyMessage} variant="card" />
        ) : (
          children
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ActionsDashboardPage
// ---------------------------------------------------------------------------

export function ActionsDashboardPage() {
  const { theme } = useTheme();
  const { data, loading } = useActionsDashboard();
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);

  const selectedAction: Action | undefined = selectedActionId
    ? [...data.executable, ...data.inProgress, ...data.recentlyTerminal].find(
        (a) => a.id === selectedActionId,
      )
    : undefined;

  if (loading) {
    return (
      <div style={{ flex: 1, width: "100%", padding: `${theme.spacing["2xl"]} ${theme.spacing.xl}`, boxSizing: "border-box" }}>
        <PageHeader title="Actions" subtitle="Loading..." />
      </div>
    );
  }

  const totalCount = data.executable.length + data.inProgress.length + data.recentlyTerminal.length;

  return (
    <div style={{ flex: 1, width: "100%", display: "flex", minHeight: 0 }}>
      <div style={{ flex: 1, minWidth: 0, padding: `${theme.spacing["2xl"]} ${theme.spacing.xl}`, boxSizing: "border-box", overflowY: "auto" }}>
        <PageHeader
          title="Actions"
          subtitle={`${totalCount} action${totalCount === 1 ? "" : "s"} across all targets`}
          style={{ marginBottom: theme.spacing.xl }}
        />

        <div
          style={{
            display: "flex",
            gap: theme.spacing.xl,
            flexWrap: "wrap",
          }}
        >
          <Column title="Ready" count={data.executable.length} emptyMessage="No actions ready" compact={!!selectedAction}>
            {data.executable.map((a) => (
              <ActionCard
                key={a.id}
                action={a}
                onClick={() => setSelectedActionId(a.id)}
                isSelected={selectedActionId === a.id}
              />
            ))}
          </Column>

          <Column title="In Progress" count={data.inProgress.length} emptyMessage="Nothing in progress" compact={!!selectedAction}>
            {data.inProgress.map((a) => (
              <ActionCard
                key={a.id}
                action={a}
                onClick={() => setSelectedActionId(a.id)}
                isSelected={selectedActionId === a.id}
              />
            ))}
          </Column>

          <Column title="Recently Done" count={data.recentlyTerminal.length} emptyMessage="No recent activity" compact={!!selectedAction}>
            {data.recentlyTerminal.map((a) => (
              <ActionCard
                key={a.id}
                action={a}
                onClick={() => setSelectedActionId(a.id)}
                isSelected={selectedActionId === a.id}
              />
            ))}
          </Column>
        </div>
      </div>

      {selectedAction && (
        <ActionDetailPanel
          action={selectedAction}
          onClose={() => setSelectedActionId(null)}
        />
      )}
    </div>
  );
}
