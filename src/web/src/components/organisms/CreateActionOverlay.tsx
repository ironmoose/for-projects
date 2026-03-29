import { useState, useEffect } from "react";
import { useTheme } from "../theme/ThemeContext";
import { Button } from "../atoms/Button";
import { Select } from "../atoms/Select";
import { Overlay } from "../atoms/Overlay";
import { createAction, linkAction } from "../../api";
import type { Action } from "../../types";

type RoleString = "goal" | "design" | "requirements" | "implementation" | "validation";

interface CreateActionOverlayProps {
  entityType: "project" | "task";
  entityId: string;
  availableRoles: RoleString[];
  onCreated: (action: Action) => void;
  onClose: () => void;
}

const ROLE_LABELS: Record<RoleString, string> = {
  goal: "Goal",
  design: "Design",
  requirements: "Requirements",
  implementation: "Implementation",
  validation: "Validation",
};

const ROLE_PLACEHOLDERS: Record<RoleString, string> = {
  goal: "Describe the project goal...",
  design: "Describe the desired design...",
  requirements: "Describe the requirements to gather...",
  implementation: "Describe the implementation approach...",
  validation: "Describe the validation criteria...",
};

const ROLE_DEFAULT_AGENT: Record<RoleString, string> = {
  goal: "research",
  design: "design",
  requirements: "research",
  implementation: "implementation",
  validation: "review",
};

const AGENT_OPTIONS = [
  { value: "", label: "(none)" },
  { value: "research", label: "Research" },
  { value: "design", label: "Design" },
  { value: "implementation", label: "Implementation" },
  { value: "review", label: "Review" },
];

export function CreateActionOverlay({
  entityType,
  entityId,
  availableRoles,
  onCreated,
  onClose,
}: CreateActionOverlayProps) {
  const { theme } = useTheme();
  const [selectedRole, setSelectedRole] = useState<RoleString>(availableRoles[0]);
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [agent, setAgent] = useState(ROLE_DEFAULT_AGENT[availableRoles[0]]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAgent(ROLE_DEFAULT_AGENT[selectedRole]);
  }, [selectedRole]);

  const handleSubmit = async () => {
    if (!name.trim() || !prompt.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const action = await createAction({
        name: name.trim(),
        prompt: prompt.trim(),
        agent: agent || undefined,
      });

      await linkAction({
        entity_type: entityType,
        entity_id: entityId,
        role: selectedRole,
        action_id: action.id,
      });

      onCreated(action);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Overlay onClick={onClose} zIndex={200} style={{ background: "rgba(0,0,0,0.5)" }} />
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 201,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            pointerEvents: "auto",
            background: theme.color.surfaceContainer,
            borderRadius: theme.radius.lg,
            boxShadow: theme.shadow.lg,
            border: `1px solid ${theme.color.borderSubtle}`,
            width: "100%",
            maxWidth: 480,
            display: "flex",
            flexDirection: "column",
            gap: theme.spacing.lg,
            padding: theme.spacing.xl,
          }}
        >
          {/* Header */}
          <h2
            style={{
              margin: 0,
              fontFamily: theme.font.body,
              fontSize: theme.font.size.lg,
              fontWeight: 600,
              color: theme.color.text,
            }}
          >
            Create {ROLE_LABELS[selectedRole]} Action
          </h2>

          {/* Role select */}
          {availableRoles.length > 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.xs }}>
              <label
                htmlFor="action-role"
                style={{
                  fontSize: theme.font.size.xs,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase" as const,
                  color: theme.color.textFaint,
                  fontFamily: theme.font.body,
                }}
              >
                Role
              </label>
              <Select
                id="action-role"
                options={availableRoles.map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as RoleString)}
              />
            </div>
          )}

          {/* Name input */}
          <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.xs }}>
            <label
              htmlFor="action-name"
              style={{
                fontSize: theme.font.size.xs,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase" as const,
                color: theme.color.textFaint,
                fontFamily: theme.font.body,
              }}
            >
              Name
            </label>
            <input
              id="action-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Action name..."
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                border: `1px solid ${theme.color.borderSubtle}`,
                borderRadius: theme.radius.lg,
                fontFamily: theme.font.body,
                fontSize: theme.font.size.md,
                outline: "none",
                background: theme.color.surfaceContainerHigh,
                color: theme.color.text,
                transition: "border-color 0.15s",
              }}
            />
          </div>

          {/* Prompt textarea */}
          <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.xs }}>
            <label
              htmlFor="action-prompt"
              style={{
                fontSize: theme.font.size.xs,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase" as const,
                color: theme.color.textFaint,
                fontFamily: theme.font.body,
              }}
            >
              Prompt
            </label>
            <textarea
              id="action-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={ROLE_PLACEHOLDERS[selectedRole]}
              rows={4}
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                border: `1px solid ${theme.color.borderSubtle}`,
                borderRadius: theme.radius.lg,
                fontFamily: theme.font.body,
                fontSize: theme.font.size.md,
                outline: "none",
                background: theme.color.surfaceContainerHigh,
                color: theme.color.text,
                transition: "border-color 0.15s",
                resize: "vertical",
              }}
            />
          </div>

          {/* Agent select */}
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
              options={AGENT_OPTIONS}
              value={agent}
              onChange={(e) => setAgent(e.target.value)}
            />
          </div>

          {/* Error */}
          {error && (
            <p
              style={{
                margin: 0,
                fontSize: theme.font.size.sm,
                color: theme.color.danger,
                fontFamily: theme.font.body,
              }}
            >
              {error}
            </p>
          )}

          {/* Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: theme.spacing.sm }}>
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              loading={loading}
              disabled={!name.trim() || !prompt.trim()}
            >
              Create
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
