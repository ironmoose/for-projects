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
import { ProjectCard } from "../components/organisms/ProjectCard";
import { useProjects } from "../hooks";
import { useToastContext } from "../components/ToastContext";
import { ApiError } from "../api";

// ---------------------------------------------------------------------------
// DashboardPage
// ---------------------------------------------------------------------------

export function DashboardPage({ onOpenProject }: { onOpenProject: (id: string) => void }) {
  const { theme } = useTheme();
  const { projects, createProject } = useProjects();
  const { showToast } = useToastContext();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!name.trim()) return;
    setCreating(true);
    try {
      await createProject(name, description);
      setName("");
      setDescription("");
      setShowCreateForm(false);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to create project");
    } finally {
      setCreating(false);
    }
  }

  return (
    <ListPageLayout>
      <PageHeader
        title="Workspace Overview"
        subtitle="Manage your active projects and track progress from a centralized view."
        trailing={
          <Button onClick={() => setShowCreateForm(!showCreateForm)}>
            <span style={{ display: "flex", alignItems: "center", gap: theme.spacing.sm }}>
              <Icon name="add" size={16} />
              New Project
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
        <div style={{ flex: "1 1 180px", minWidth: 0 }}>
          <Input
            label="Project Name"
            placeholder="e.g. Riverfront Pavilion"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div style={{ flex: "1 1 180px", minWidth: 0 }}>
          <Input
            label="Description"
            placeholder="Brief description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </CreateForm>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: theme.spacing.lg,
        }}
      >
        {projects.map((p) => (
          <div
            key={p.id}
            style={{ flex: `1 1 calc(50% - ${theme.spacing.lg})`, maxWidth: "100%", minWidth: 280 }}
          >
            <HighlightOnChange trackValue={p.updated_at}>
              <ProjectCard project={p} onClick={() => onOpenProject(p.id)} />
            </HighlightOnChange>
          </div>
        ))}
      </div>

      {projects.length === 0 && (
        <EmptyState
          icon="folder_open"
          message='No projects yet. Click "New Project" to get started.'
          variant="card"
        />
      )}
    </ListPageLayout>
  );
}
