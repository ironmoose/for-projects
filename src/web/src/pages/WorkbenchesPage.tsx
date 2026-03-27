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
import { WorkbenchCard } from "../components/organisms/WorkbenchCard";
import { useWorkbenches } from "../hooks";
import { useToastContext } from "../components/ToastContext";
import { ApiError } from "../api";

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

      <div style={{ display: "flex", flexWrap: "wrap", gap: theme.spacing.lg }}>
        {workbenches.map((wb) => (
          <div
            key={wb.id}
            style={{ flex: `1 1 calc(50% - ${theme.spacing.lg})`, maxWidth: "100%", minWidth: 280 }}
          >
            <HighlightOnChange trackValue={wb.updated_at}>
              <WorkbenchCard workbench={wb} onClick={() => onOpenWorkbench(wb.id)} />
            </HighlightOnChange>
          </div>
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
