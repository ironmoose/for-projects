import { useEffect, useRef, useState } from "react";
import {
  Button,
  Icon,
  Input,
  Select,
  useTheme,
  ListPageLayout,
  PageHeader,
  CreateEntityOverlay,
  EmptyState,
  Badge,
} from "../components";
import { useToastContext } from "../components/ToastContext";
import { ApiError, fetchActions, createActions, updateActions, deleteActions } from "../api";
import { useEventSubscription } from "../hooks/useEventSubscription";
import { useThrottledCallback } from "../hooks/useThrottledCallback";
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

  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateOverlay, setShowCreateOverlay] = useState(false);
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
      setShowCreateOverlay(false);
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
          <Button onClick={() => setShowCreateOverlay(true)}>
            <span style={{ display: "flex", alignItems: "center", gap: theme.spacing.sm }}>
              <Icon name="add" size={16} />
              New Action
            </span>
          </Button>
        }
        style={{ marginBottom: theme.spacing.xl }}
      />

      {showCreateOverlay && (
        <CreateEntityOverlay
          title="Create Action"
          onSubmit={handleCreate}
          onClose={() => setShowCreateOverlay(false)}
          loading={creating}
          submitDisabled={!prompt.trim()}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.xs }}>
            <label
              htmlFor="action-kind"
              style={{
                fontSize: theme.font.size.xs,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase" as const,
                color: theme.color.textFaint,
                fontFamily: theme.font.body,
              }}
            >
              Kind
            </label>
            <Select
              id="action-kind"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              options={kindOptions}
            />
          </div>
          <Input
            label="Prompt"
            id="action-prompt"
            placeholder="Describe the action..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.xs }}>
            <label
              htmlFor="action-agent"
              style={{
                fontSize: theme.font.size.xs,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase" as const,
                color: theme.color.textFaint,
                fontFamily: theme.font.body,
              }}
            >
              Agent
            </label>
            <Select
              id="action-agent"
              value={agent}
              onChange={(e) => setAgent(e.target.value)}
              options={agentOptions}
            />
          </div>
        </CreateEntityOverlay>
      )}

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
