import { useEffect, useRef, useState } from "react";
import {
  Button,
  Icon,
  Input,
  Select,
  useTheme,
  ListPageLayout,
  PageHeader,
  CreateForm,
  EmptyState,
  Badge,
  ActivitySection,
} from "../components";
import { useToastContext } from "../components/ToastContext";
import { ApiError, fetchActions, createActions, updateActions, deleteActions } from "../api";
import { useEventSubscription } from "../hooks/useEventSubscription";
import { useThrottledCallback } from "../hooks/useThrottledCallback";
import { useActivityFeed } from "../hooks/useActivityFeed";
import type { Action } from "../types";
import { formatDate } from "../utils";

const kindOptions = [
  { value: "plan", label: "Plan" },
  { value: "goal", label: "Goal" },
  { value: "requirements", label: "Requirements" },
  { value: "design", label: "Design" },
];

const agentOptions = [
  { value: "tab:orchestrator", label: "Orchestrator" },
  { value: "tab:executor", label: "Executor" },
];

// ---------------------------------------------------------------------------
// ActionsPage
// ---------------------------------------------------------------------------

export function ActionsPage() {
  const { theme } = useTheme();
  const { showToast } = useToastContext();
  const { subscribeEvents } = useEventSubscription();
  const activity = useActivityFeed();

  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Create form state
  const [kind, setKind] = useState("plan");
  const [prompt, setPrompt] = useState("");
  const [agent, setAgent] = useState("tab:orchestrator");

  // Edit form state
  const [editKind, setEditKind] = useState("");
  const [editPrompt, setEditPrompt] = useState("");
  const [editAgent, setEditAgent] = useState("");

  async function load() {
    try {
      const body = await fetchActions();
      setActions(body.data);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to load actions");
    } finally {
      setLoading(false);
    }
  }

  const loadRef = useRef(load);
  loadRef.current = load;

  const throttledLoad = useThrottledCallback(() => {
    loadRef.current();
  }, 200);

  useEffect(() => {
    load();
    return subscribeEvents((event) => {
      if (event.entity_type === "action") throttledLoad();
    });
  }, [subscribeEvents, throttledLoad]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCreate() {
    if (!prompt.trim()) return;
    setCreating(true);
    try {
      await createActions([{ kind, prompt, agent }]);
      setPrompt("");
      setKind("plan");
      setAgent("tab:orchestrator");
      setShowCreateForm(false);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to create action");
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdate(id: string) {
    try {
      await updateActions([{ id, kind: editKind, prompt: editPrompt, agent: editAgent }]);
      setEditingId(null);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to update action");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteActions([id]);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to delete action");
    }
  }

  function startEdit(action: Action) {
    setEditingId(action.id);
    setEditKind(action.kind);
    setEditPrompt(action.prompt);
    setEditAgent(action.agent);
  }

  return (
    <ListPageLayout>
      <PageHeader
        title="Actions"
        subtitle="Define action templates for project orchestration."
        trailing={
          <Button onClick={() => setShowCreateForm(!showCreateForm)}>
            <span style={{ display: "flex", alignItems: "center", gap: theme.spacing.sm }}>
              <Icon name="add" size={16} />
              New Action
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
        <div style={{ flex: "0 0 auto" }}>
          <Select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            options={kindOptions}
          />
        </div>
        <div style={{ flex: "1 1 240px", minWidth: 0 }}>
          <Input
            label="Prompt"
            placeholder="Describe the action..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            required
          />
        </div>
        <div style={{ flex: "0 0 auto" }}>
          <Select
            value={agent}
            onChange={(e) => setAgent(e.target.value)}
            options={agentOptions}
          />
        </div>
      </CreateForm>

      <ActivitySection
        running={activity.running}
        recent={activity.recent}
        loading={activity.loading}
        timeframeMinutes={activity.timeframeMinutes}
        onTimeframeChange={activity.setTimeframeMinutes}
      />

      <div
        style={{
          borderRadius: theme.radius.lg,
          overflow: "hidden",
          border: `1px solid ${theme.color.borderSubtle}`,
        }}
      >
        {actions.map((action) => (
          <div
            key={action.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: theme.spacing.md,
              padding: `${theme.spacing.md} ${theme.spacing.lg}`,
              background: theme.color.surfaceContainer,
              borderBottom: `1px solid ${theme.color.borderSubtle}`,
            }}
          >
            {editingId === action.id ? (
              <div style={{ flex: 1, display: "flex", gap: theme.spacing.md, alignItems: "center", flexWrap: "wrap" }}>
                <Select value={editKind} onChange={(e) => setEditKind(e.target.value)} options={kindOptions} />
                <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                  <Input value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)} />
                </div>
                <Select value={editAgent} onChange={(e) => setEditAgent(e.target.value)} options={agentOptions} />
                <Button onClick={() => handleUpdate(action.id)}>Save</Button>
                <Button onClick={() => setEditingId(null)}>Cancel</Button>
              </div>
            ) : (
              <>
                <Badge variant="default">{action.kind}</Badge>
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: theme.font.size.sm,
                    color: theme.color.text,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {action.prompt}
                </span>
                <span style={{ fontSize: theme.font.size.xs, color: theme.color.textMuted, flexShrink: 0 }}>
                  {action.agent}
                </span>
                <span style={{ fontSize: theme.font.size.xxs, color: theme.color.textFaint, fontFamily: theme.font.mono, flexShrink: 0 }}>
                  {formatDate(action.updated_at)}
                </span>
                <Button onClick={() => startEdit(action)}>Edit</Button>
                <Button onClick={() => handleDelete(action.id)}>Delete</Button>
              </>
            )}
          </div>
        ))}
      </div>

      {!loading && actions.length === 0 && (
        <EmptyState
          icon="bolt"
          message='No actions defined yet. Click "New Action" to create one.'
          variant="card"
        />
      )}
    </ListPageLayout>
  );
}
