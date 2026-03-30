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
import { ApiError, fetchAgents, createAgents, updateAgents, deleteAgents } from "../api";
import { useEventSubscription } from "../hooks/useEventSubscription";
import { useThrottledCallback } from "../hooks/useThrottledCallback";
import type { Agent } from "../types";
import { formatDate } from "../utils";

const agentOptions = [
  { value: "tab:orchestrator", label: "Orchestrator" },
  { value: "tab:executor", label: "Executor" },
];

// ---------------------------------------------------------------------------
// AgentsPage
// ---------------------------------------------------------------------------

export function AgentsPage() {
  const { theme } = useTheme();
  const { showToast } = useToastContext();
  const { subscribeEvents } = useEventSubscription();

  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateOverlay, setShowCreateOverlay] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Create form state
  const [identifier, setIdentifier] = useState("");
  const [prompt, setPrompt] = useState("");
  const [agent, setAgent] = useState("tab:orchestrator");
  const [enabled, setEnabled] = useState(true);

  // Edit form state
  const [editIdentifier, setEditIdentifier] = useState("");
  const [editPrompt, setEditPrompt] = useState("");
  const [editAgent, setEditAgent] = useState("");
  const [editEnabled, setEditEnabled] = useState(true);

  async function load() {
    try {
      const body = await fetchAgents();
      setAgents(body.data);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to load agents");
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
      if (event.entity_type === "agent") throttledLoad();
    });
  }, [subscribeEvents, throttledLoad]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCreate() {
    if (!identifier.trim() || !prompt.trim()) return;
    setCreating(true);
    try {
      await createAgents([{ identifier, prompt, agent, enabled }]);
      setIdentifier("");
      setPrompt("");
      setAgent("tab:orchestrator");
      setEnabled(true);
      setShowCreateOverlay(false);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to create agent");
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdate(id: string) {
    try {
      await updateAgents([{ id, identifier: editIdentifier, prompt: editPrompt, agent: editAgent, enabled: editEnabled }]);
      setEditingId(null);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to update agent");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteAgents([id]);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to delete agent");
    }
  }

  function startEdit(agentRow: Agent) {
    setEditingId(agentRow.id);
    setEditIdentifier(agentRow.identifier);
    setEditPrompt(agentRow.prompt);
    setEditAgent(agentRow.agent);
    setEditEnabled(agentRow.enabled);
  }

  const labelStyle: React.CSSProperties = {
    fontSize: theme.font.size.xs,
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase" as const,
    color: theme.color.textFaint,
    fontFamily: theme.font.body,
  };

  return (
    <ListPageLayout>
      <PageHeader
        title="Agents"
        subtitle="Define agent configurations for project orchestration."
        trailing={
          <Button onClick={() => setShowCreateOverlay(true)}>
            <span style={{ display: "flex", alignItems: "center", gap: theme.spacing.sm }}>
              <Icon name="add" size={16} />
              New Agent
            </span>
          </Button>
        }
        style={{ marginBottom: theme.spacing.xl }}
      />

      {showCreateOverlay && (
        <CreateEntityOverlay
          title="Create Agent"
          onSubmit={handleCreate}
          onClose={() => setShowCreateOverlay(false)}
          loading={creating}
          submitDisabled={!identifier.trim() || !prompt.trim()}
        >
          <Input
            label="Identifier"
            id="agent-identifier"
            placeholder="e.g. plan, goal, requirements..."
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
          <Input
            label="Prompt"
            id="agent-prompt"
            placeholder="Describe the agent action..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.xs }}>
            <label htmlFor="agent-agent" style={labelStyle}>
              Agent
            </label>
            <Select
              id="agent-agent"
              value={agent}
              onChange={(e) => setAgent(e.target.value)}
              options={agentOptions}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: theme.spacing.sm }}>
            <label htmlFor="agent-enabled" style={labelStyle}>
              Enabled
            </label>
            <input
              id="agent-enabled"
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              style={{ width: 18, height: 18 }}
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
        {agents.map((agentRow) => (
          <div
            key={agentRow.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: theme.spacing.md,
              padding: `${theme.spacing.md} ${theme.spacing.lg}`,
              background: theme.color.surfaceContainer,
              borderBottom: `1px solid ${theme.color.borderSubtle}`,
            }}
          >
            {editingId === agentRow.id ? (
              <div style={{ flex: 1, display: "flex", gap: theme.spacing.md, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ flex: "0 1 140px", minWidth: 0 }}>
                  <Input
                    placeholder="Identifier"
                    value={editIdentifier}
                    onChange={(e) => setEditIdentifier(e.target.value)}
                  />
                </div>
                <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                  <Input value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)} />
                </div>
                <Select value={editAgent} onChange={(e) => setEditAgent(e.target.value)} options={agentOptions} />
                <div style={{ display: "flex", alignItems: "center", gap: theme.spacing.xs }}>
                  <label style={{ fontSize: theme.font.size.xs, color: theme.color.textMuted }}>Enabled</label>
                  <input
                    type="checkbox"
                    checked={editEnabled}
                    onChange={(e) => setEditEnabled(e.target.checked)}
                    style={{ width: 16, height: 16 }}
                  />
                </div>
                <Button onClick={() => handleUpdate(agentRow.id)}>Save</Button>
                <Button onClick={() => setEditingId(null)}>Cancel</Button>
              </div>
            ) : (
              <>
                <Badge variant={agentRow.enabled ? "active" : "archived"}>
                  {agentRow.enabled ? "enabled" : "disabled"}
                </Badge>
                <Badge variant="default">{agentRow.identifier}</Badge>
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
                  {agentRow.prompt}
                </span>
                <span style={{ fontSize: theme.font.size.xs, color: theme.color.textMuted, flexShrink: 0 }}>
                  {agentRow.agent}
                </span>
                <span style={{ fontSize: theme.font.size.xxs, color: theme.color.textFaint, fontFamily: theme.font.mono, flexShrink: 0 }}>
                  {formatDate(agentRow.updated_at)}
                </span>
                <Button onClick={() => startEdit(agentRow)}>Edit</Button>
                <Button onClick={() => handleDelete(agentRow.id)}>Delete</Button>
              </>
            )}
          </div>
        ))}
      </div>

      {!loading && agents.length === 0 && (
        <EmptyState
          icon="bolt"
          message='No agents defined yet. Click "New Agent" to create one.'
          variant="card"
        />
      )}
    </ListPageLayout>
  );
}
