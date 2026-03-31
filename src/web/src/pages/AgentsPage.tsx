import { useCallback, useState } from "react";
import {
  Button,
  Badge,
  Card,
  Icon,
  IconButton,
  Input,
  Select,
  Markdown,
  Stack,
  useTheme,
  ListPageLayout,
  DetailPageLayout,
  SidePanelLayout,
  PageHeader,
  CreateEntityOverlay,
  EmptyState,
  SectionLabel,
  MetadataTable,
  ConfirmDialog,
} from "../components";
import { useAgents } from "../hooks/useAgents";
import { useToastContext } from "../components/ToastContext";
import { ApiError } from "../api";
import type { Agent } from "../types";
import { formatDate } from "../utils";
import { harnessPrompts } from "../harness-prompts";

// ---------------------------------------------------------------------------
// AgentCard
// ---------------------------------------------------------------------------

function AgentCard({
  agent,
  selected,
  onClick,
  onDelete,
}: {
  agent: Agent;
  selected: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  const { theme } = useTheme();

  return (
    <Card
      hover
      variant={selected ? "elevated" : "default"}
      padding="lg"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      style={{
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.md,
        outline: selected ? `2px solid ${theme.color.primary}` : undefined,
      }}
    >
      <Stack direction="row" justify="space-between" align="center" gap="sm">
        <span
          style={{
            fontSize: theme.font.size.sm,
            fontWeight: 600,
            color: theme.color.text,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
            minWidth: 0,
          }}
        >
          {agent.name}
        </span>
        {agent.platform_agent && (
          <Badge>{agent.platform_agent}</Badge>
        )}
      </Stack>

      {agent.description && (
        <p
          style={{
            margin: 0,
            fontSize: theme.font.size.xs,
            color: theme.color.textMuted,
            lineHeight: theme.font.lineHeight.normal,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {agent.description}
        </p>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: "auto",
          fontSize: theme.font.size.xxs,
          color: theme.color.textFaint,
        }}
      >
        <span style={{ fontFamily: theme.font.mono }}>
          {formatDate(agent.updated_at)}
        </span>
        <IconButton
          icon="delete"
          size={16}
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          aria-label="Delete agent"
          style={{ flexShrink: 0 }}
        />
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// AgentDetailPanel
// ---------------------------------------------------------------------------

function AgentDetailPanel({ agent, onClose }: { agent: Agent; onClose: () => void }) {
  const { theme } = useTheme();

  const sections: Array<{ key: keyof Agent; label: string }> = [
    { key: "prompt", label: "Prompt" },
  ];

  return (
    <SidePanelLayout onClose={onClose}>
      {/* Header */}
      <div
        style={{
          padding: `${theme.spacing.xl} ${theme.spacing.xl} ${theme.spacing.lg}`,
          borderBottom: `1px solid ${theme.color.borderSubtle}`,
        }}
      >
        <Stack direction="row" justify="space-between" align="flex-start" gap="sm">
          <div style={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" align="center" gap="sm">
              <h2
                style={{
                  margin: 0,
                  fontFamily: theme.font.headline,
                  fontSize: theme.font.size.xl,
                  fontWeight: 800,
                  letterSpacing: theme.font.letterSpacing.tight,
                  color: theme.color.text,
                  lineHeight: 1.3,
                }}
              >
                {agent.name}
              </h2>
              {agent.platform_agent && (
                <Badge>{agent.platform_agent}</Badge>
              )}
            </Stack>
            {agent.description && (
              <p
                style={{
                  margin: `${theme.spacing.xs} 0 0`,
                  fontSize: theme.font.size.sm,
                  color: theme.color.textMuted,
                  lineHeight: theme.font.lineHeight.normal,
                }}
              >
                {agent.description}
              </p>
            )}
          </div>
          <IconButton icon="close" size={18} onClick={onClose} aria-label="Close detail panel" />
        </Stack>
      </div>

      {/* Body */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: theme.spacing.xl,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {sections.map(({ key, label }) => (
          <div key={key} style={{ marginBottom: theme.spacing.xl }}>
            <SectionLabel>{label}</SectionLabel>
            {agent[key] ? (
              <Markdown>{agent[key] as string}</Markdown>
            ) : (
              <p
                style={{
                  margin: 0,
                  fontSize: theme.font.size.sm,
                  color: theme.color.textFaint,
                  fontStyle: "italic",
                }}
              >
                Not set
              </p>
            )}
          </div>
        ))}

        {/* Metadata */}
        <div
          style={{
            marginTop: "auto",
            paddingTop: theme.spacing.xl,
            borderTop: `1px solid ${theme.color.borderSubtle}`,
          }}
        >
          <MetadataTable
            title="Metadata"
            rows={[
              { label: "ID", value: agent.id },
              ...(agent.platform_agent ? [{ label: "Platform Agent", value: agent.platform_agent }] : []),
              { label: "Created", value: formatDate(agent.created_at) },
              { label: "Updated", value: formatDate(agent.updated_at) },
            ]}
          />
        </div>
      </div>
    </SidePanelLayout>
  );
}

// ---------------------------------------------------------------------------
// CreateAgentOverlay
// ---------------------------------------------------------------------------

function CreateAgentOverlay({
  onSubmit,
  onClose,
  loading,
}: {
  onSubmit: (input: { name: string; description?: string; platform_agent?: string; prompt?: string }) => void;
  onClose: () => void;
  loading: boolean;
}) {
  const { theme } = useTheme();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [platformAgent, setPlatformAgent] = useState("");
  const [selectedHarness, setSelectedHarness] = useState("");

  const harness = harnessPrompts.find((h) => h.id === selectedHarness);

  return (
    <CreateEntityOverlay
      title="Register Agent"
      onSubmit={() =>
        onSubmit({
          name,
          ...(description.trim() ? { description } : {}),
          ...(platformAgent.trim() ? { platform_agent: platformAgent } : {}),
          ...(harness ? { prompt: harness.prompt } : {}),
        })
      }
      onClose={onClose}
      loading={loading}
      submitDisabled={!name.trim()}
    >
      <Stack gap="md">
        <Input
          label="Name"
          placeholder="e.g. code-explorer"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          label="Description"
          placeholder="What does this agent do?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <Input
          label="Platform Agent (optional)"
          placeholder="e.g. Explore, Plan, general-purpose"
          value={platformAgent}
          onChange={(e) => setPlatformAgent(e.target.value)}
        />
        <div>
          <Select
            value={selectedHarness}
            onChange={(e) => setSelectedHarness(e.target.value)}
            options={[
              { value: "", label: "No harness prompt" },
              ...harnessPrompts.map((h) => ({ value: h.id, label: h.label })),
            ]}
          />
          {harness && (
            <p
              style={{
                margin: `${theme.spacing.xs} 0 0`,
                fontSize: theme.font.size.xxs,
                color: theme.color.textMuted,
                lineHeight: theme.font.lineHeight.normal,
              }}
            >
              {harness.description}
            </p>
          )}
        </div>
      </Stack>
    </CreateEntityOverlay>
  );
}

// ---------------------------------------------------------------------------
// AgentsPage
// ---------------------------------------------------------------------------

export function AgentsPage() {
  const { theme } = useTheme();
  const { agents, create, remove } = useAgents();
  const { showToast } = useToastContext();
  const [showCreateOverlay, setShowCreateOverlay] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Agent | null>(null);

  const selectedAgent = selectedAgentId ? agents.find((a) => a.id === selectedAgentId) ?? null : null;

  const handleClosePanel = useCallback(() => setSelectedAgentId(null), []);

  async function handleCreate(input: { name: string; description?: string; platform_agent?: string; prompt?: string }) {
    setCreating(true);
    try {
      await create(input);
      setShowCreateOverlay(false);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to register agent");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await remove([deleteTarget.id]);
      if (selectedAgentId === deleteTarget.id) {
        setSelectedAgentId(null);
      }
      setDeleteTarget(null);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to delete agent");
    }
  }

  const sorted = [...agents].sort((a, b) => b.updated_at.localeCompare(a.updated_at));

  return (
    <DetailPageLayout expanded={!!selectedAgent}>
      <div style={{ flex: 1, minWidth: 0, padding: `${theme.spacing["2xl"]} ${theme.spacing.xl}`, boxSizing: "border-box", overflowY: "auto" }}>
        <PageHeader
          title="Agents"
          subtitle="Registered agent blueprints available for orchestration."
          trailing={
            <Button onClick={() => setShowCreateOverlay(true)}>
              <span style={{ display: "flex", alignItems: "center", gap: theme.spacing.sm }}>
                <Icon name="add" size={16} />
                Register Agent
              </span>
            </Button>
          }
          style={{ marginBottom: theme.spacing.xl }}
        />

        {showCreateOverlay && (
          <CreateAgentOverlay
            onSubmit={handleCreate}
            onClose={() => setShowCreateOverlay(false)}
            loading={creating}
          />
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: theme.spacing.lg,
          }}
        >
          {sorted.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              selected={selectedAgentId === agent.id}
              onClick={() => setSelectedAgentId(agent.id)}
              onDelete={() => setDeleteTarget(agent)}
            />
          ))}
        </div>

        {agents.length === 0 && (
          <EmptyState
            icon="smart_toy"
            message='No agents registered yet. Click "Register Agent" to get started.'
            variant="card"
          />
        )}

        {deleteTarget && (
          <ConfirmDialog
            title="Delete Agent"
            message={`Are you sure you want to delete "${deleteTarget.name}"? This action cannot be undone.`}
            onConfirm={handleDelete}
            onCancel={() => setDeleteTarget(null)}
          />
        )}
      </div>

      {selectedAgent && (
        <AgentDetailPanel
          agent={selectedAgent}
          onClose={handleClosePanel}
        />
      )}
    </DetailPageLayout>
  );
}
