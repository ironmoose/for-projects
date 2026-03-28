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
import { useWorkflows } from "../hooks";
import { useToastContext } from "../components/ToastContext";
import { ApiError } from "../api";
import { formatDate } from "../utils";

// ---------------------------------------------------------------------------
// WorkflowTableRow
// ---------------------------------------------------------------------------

function WorkflowTableRow({
  workflow,
  onClick,
}: {
  workflow: { id: string; goal: string; created_at: string; updated_at: string };
  onClick: () => void;
}) {
  const { theme } = useTheme();

  return (
    <HighlightOnChange trackValue={workflow.updated_at}>
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
        <Icon name="account_tree" size={16} style={{ color: theme.color.primary, flexShrink: 0 }} />

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
          {workflow.goal}
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
          {formatDate(workflow.updated_at)}
        </span>

        <Icon name="chevron_right" size={16} style={{ color: theme.color.textFaint, flexShrink: 0 }} />
      </div>
    </HighlightOnChange>
  );
}

// ---------------------------------------------------------------------------
// WorkflowsPage
// ---------------------------------------------------------------------------

export function WorkflowsPage({ onOpenWorkflow }: { onOpenWorkflow: (id: string) => void }) {
  const { theme } = useTheme();
  const { workflows, createWorkflow } = useWorkflows();
  const { showToast } = useToastContext();
  const [goal, setGoal] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!goal.trim()) return;
    setCreating(true);
    try {
      await createWorkflow(goal);
      setGoal("");
      setShowCreateForm(false);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to create workflow");
    } finally {
      setCreating(false);
    }
  }

  return (
    <ListPageLayout>
      <PageHeader
        title="Workflows"
        subtitle="Orchestrate phases, instructions, and bind them to resources."
        trailing={
          <Button onClick={() => setShowCreateForm(!showCreateForm)}>
            <span style={{ display: "flex", alignItems: "center", gap: theme.spacing.sm }}>
              <Icon name="add" size={16} />
              New Workflow
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
            placeholder="What is this workflow for?"
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
        {workflows.map((wf) => (
          <WorkflowTableRow
            key={wf.id}
            workflow={wf}
            onClick={() => onOpenWorkflow(wf.id)}
          />
        ))}
      </div>

      {workflows.length === 0 && (
        <EmptyState
          icon="account_tree"
          message='No workflows yet. Click "New Workflow" to get started.'
          variant="card"
        />
      )}
    </ListPageLayout>
  );
}
