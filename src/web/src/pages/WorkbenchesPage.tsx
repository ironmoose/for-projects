import { useState } from "react";
import {
  Button,
  Icon,
  Input,
  useTheme,
  ListPageLayout,
  PageHeader,
  CreateForm,
  EmptyState,
  HighlightOnChange,
} from "../components";
import { useWorkbenches } from "../hooks";
import { useToastContext } from "../components/ToastContext";
import { ApiError } from "../api";
import { formatDate } from "../utils";

// ---------------------------------------------------------------------------
// WorkbenchTableRow
// ---------------------------------------------------------------------------

function WorkbenchTableRow({
  workbench,
  onClick,
}: {
  workbench: { id: string; goal: string; created_at: string; updated_at: string };
  onClick: () => void;
}) {
  const { theme } = useTheme();

  return (
    <HighlightOnChange trackValue={workbench.updated_at}>
      <div
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
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
          cursor: "pointer",
          transition: `background ${theme.animation.duration.fast} ${theme.animation.easing.default}`,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = theme.color.surfaceContainerHigh; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = theme.color.surfaceContainer; }}
      >
        <Icon name="construction" size={16} style={{ color: theme.color.primary, flexShrink: 0 }} />

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
          {workbench.goal}
        </span>

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
          {formatDate(workbench.updated_at)}
        </span>

        <Icon name="chevron_right" size={16} style={{ color: theme.color.textFaint, flexShrink: 0 }} />
      </div>
    </HighlightOnChange>
  );
}

// ---------------------------------------------------------------------------
// WorkbenchesPage
// ---------------------------------------------------------------------------

export function WorkbenchesPage({ onOpenWorkbench }: { onOpenWorkbench: (id: string) => void }) {
  const { theme } = useTheme();
  const { workbenches, createWorkbench } = useWorkbenches();
  const { showToast } = useToastContext();
  const [goal, setGoal] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!goal.trim()) return;
    setCreating(true);
    try {
      await createWorkbench(goal);
      setGoal("");
      setShowCreateForm(false);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to create workbench");
    } finally {
      setCreating(false);
    }
  }

  return (
    <ListPageLayout>
      <PageHeader
        title="Workbenches"
        subtitle="Orchestrate instructions and bind them to resources."
        trailing={
          <Button onClick={() => setShowCreateForm(!showCreateForm)}>
            <span style={{ display: "flex", alignItems: "center", gap: theme.spacing.sm }}>
              <Icon name="add" size={16} />
              New Workbench
            </span>
          </Button>
        }
        style={{ marginBottom: theme.spacing.xl }}
      />

      <CreateForm
        visible={showCreateForm}
        onCancel={() => setShowCreateForm(false)}
        onSubmit={handleCreate}
        creating={creating}
      >
        <div style={{ flex: "1 1 300px", minWidth: 0 }}>
          <Input
            label="Goal"
            placeholder="What is this workbench for?"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            required
          />
        </div>
      </CreateForm>

      <div
        style={{
          borderRadius: theme.radius.lg,
          overflow: "hidden",
          border: `1px solid ${theme.color.borderSubtle}`,
        }}
      >
        {workbenches.map((wb) => (
          <WorkbenchTableRow
            key={wb.id}
            workbench={wb}
            onClick={() => onOpenWorkbench(wb.id)}
          />
        ))}
      </div>

      {workbenches.length === 0 && (
        <EmptyState
          icon="construction"
          message='No workbenches yet. Click "New Workbench" to get started.'
          variant="card"
        />
      )}
    </ListPageLayout>
  );
}
