import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Button,
  Icon,
  IconButton,
  Input,
  Markdown,
  Select,
  Stack,
  StatusDot,
  useTheme,
  DetailPageLayout,
  SidePanelLayout,
  BackButton,
  SectionLabel,
  MetadataTable,
  EmptyState,
  AddItemInput,
  HighlightOnChange,
} from "../components";
import { useWorkbench, useInstructionBindings, useEventDrivenAnimation } from "../hooks";
import { useToastContext } from "../components/ToastContext";
import { ApiError } from "../api";
import type { Instruction, BindingKind, InstructionStatus } from "../types";
import { bindingKindOptions, kindColor, instructionStatusLabel } from "../types";
import { formatDate } from "../utils";

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

function instructionStatusColor(theme: ReturnType<typeof useTheme>["theme"], status: InstructionStatus): string {
  switch (status) {
    case "running": return theme.color.running;
    case "complete": return theme.color.success;
    case "pending": return theme.color.textFaint;
    case "skipped": return theme.color.textFaint;
  }
}

function instructionBadgeVariant(status: InstructionStatus): string {
  switch (status) {
    case "running": return "running";
    case "complete": return "complete";
    case "pending": return "pending";
    case "skipped": return "skipped";
  }
}

// ---------------------------------------------------------------------------
// PipelineNode
// ---------------------------------------------------------------------------

function PipelineNode({
  instruction,
  isLast,
  isSelected,
  onClick,
  onDelete,
}: {
  instruction: Instruction;
  isLast: boolean;
  isSelected: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  const { theme } = useTheme();
  const { animationState } = useEventDrivenAnimation("instruction", instruction.id);

  const nodeColor = instructionStatusColor(theme, instruction.status);
  const isRunning = instruction.status === "running";
  const isSkipped = instruction.status === "skipped";

  // Animation styles for the content block
  const contentAnimationStyle: React.CSSProperties = {};
  if (animationState === "shake") {
    contentAnimationStyle.animation = `shake 400ms ${theme.animation.easing.default}`;
  } else if (animationState === "flash") {
    contentAnimationStyle.animation = `highlight-flash 600ms ease-out`;
  }

  // Border pulse for running instructions
  const contentBorderStyle: React.CSSProperties = isRunning
    ? {
        border: `1px solid ${theme.color.activityBorder}`,
        animation: `border-pulse 2s ease-in-out infinite`,
      }
    : {
        border: `1px solid ${isSelected ? theme.color.primary : theme.color.borderSubtle}`,
      };

  return (
    <div style={{ position: "relative", paddingLeft: theme.layout.pipelineIndent }}>
      {/* Connector line */}
      {!isLast && (
        <div
          style={{
            position: "absolute",
            left: 5,
            top: 0,
            bottom: -8,
            width: parseInt(theme.layout.pipelineLineWidth),
            background: theme.color.borderSubtle,
          }}
        />
      )}

      {/* Status node circle */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 16,
          width: parseInt(theme.layout.pipelineNodeSize),
          height: parseInt(theme.layout.pipelineNodeSize),
          borderRadius: theme.radius.full,
          background: nodeColor,
          opacity: isSkipped ? 0.5 : 1,
          boxShadow: isRunning ? `0 0 8px 2px ${theme.color.glowPrimary}` : "none",
          animation: isRunning ? `pulse-alive ${theme.animation.duration.pulse} ease-in-out infinite` : "none",
          transition: `background ${theme.animation.duration.normal} ${theme.animation.easing.default}`,
        }}
      />

      {/* Content block */}
      <HighlightOnChange trackValue={instruction.updated_at}>
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
            background: isSelected ? theme.color.surfaceContainerHigh : theme.color.surfaceContainer,
            borderRadius: theme.radius.lg,
            padding: `${theme.spacing.md} ${theme.spacing.lg}`,
            cursor: "pointer",
            marginBottom: theme.spacing.sm,
            transition: `background ${theme.animation.duration.fast} ${theme.animation.easing.default}, border-color ${theme.animation.duration.fast}`,
            opacity: isSkipped ? 0.5 : 1,
            ...contentBorderStyle,
            ...contentAnimationStyle,
          }}
          onMouseEnter={(e) => {
            if (!isSelected) e.currentTarget.style.background = theme.color.surfaceContainerHigh;
          }}
          onMouseLeave={(e) => {
            if (!isSelected) e.currentTarget.style.background = theme.color.surfaceContainer;
          }}
        >
          {/* Top row: position + status badge + delete */}
          <Stack direction="row" justify="space-between" align="center" style={{ marginBottom: theme.spacing.sm }}>
            <Stack direction="row" align="center" gap="sm">
              <span
                style={{
                  fontFamily: theme.font.mono,
                  fontSize: theme.font.size.xxs,
                  color: theme.color.textFaint,
                }}
              >
                #{instruction.position}
              </span>
              <Badge variant={instructionBadgeVariant(instruction.status) as "active"}>
                {instructionStatusLabel[instruction.status]}
              </Badge>
              {instruction.parallel && (
                <span
                  style={{
                    fontSize: theme.font.size.xxs,
                    color: theme.color.tertiary,
                    fontFamily: theme.font.mono,
                    fontWeight: 600,
                  }}
                >
                  parallel
                </span>
              )}
            </Stack>
            <div onClick={(e) => e.stopPropagation()}>
              <IconButton
                icon="close"
                size={12}
                onClick={onDelete}
                aria-label="Delete instruction"
                style={{ color: theme.color.textFaint, width: 18, height: 18 }}
              />
            </div>
          </Stack>

          {/* Prompt preview */}
          <p
            style={{
              margin: 0,
              fontSize: theme.font.size.sm,
              color: theme.color.textMuted,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              lineHeight: 1.4,
            }}
          >
            {instruction.prompt.slice(0, 120)}{instruction.prompt.length > 120 ? "..." : ""}
          </p>

          {/* Agent label */}
          {instruction.agent && (
            <span
              style={{
                display: "inline-block",
                marginTop: theme.spacing.xs,
                fontFamily: theme.font.mono,
                fontSize: theme.font.size.xxs,
                color: theme.color.textFaint,
              }}
            >
              agent: {instruction.agent}
            </span>
          )}

          {/* Output preview */}
          {instruction.output && (
            <p
              style={{
                margin: `${theme.spacing.xs} 0 0`,
                fontSize: theme.font.size.xs,
                color: theme.color.textFaint,
                fontStyle: "italic",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {instruction.output.slice(0, 80)}{instruction.output.length > 80 ? "..." : ""}
            </p>
          )}
        </div>
      </HighlightOnChange>
    </div>
  );
}

// ---------------------------------------------------------------------------
// InstructionDetailPanel
// ---------------------------------------------------------------------------

function InstructionDetailPanel({
  instruction,
  workbenchId,
  onClose,
}: {
  instruction: Instruction;
  workbenchId: string;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const { bindings, addBinding, removeBinding } = useInstructionBindings(workbenchId, instruction.id);
  const { showToast } = useToastContext();
  const [newArn, setNewArn] = useState("");
  const [newKind, setNewKind] = useState<BindingKind>("input");
  const [addingBinding, setAddingBinding] = useState(false);

  const colors = kindColor(theme);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  async function handleAddBinding(e: React.FormEvent) {
    e.preventDefault();
    if (!newArn.trim()) return;
    setAddingBinding(true);
    try {
      await addBinding(newArn, newKind);
      setNewArn("");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to add binding");
    } finally {
      setAddingBinding(false);
    }
  }

  const statusColor = instructionStatusColor(theme, instruction.status);

  return (
    <SidePanelLayout onClose={onClose}>
      {/* Header */}
      <div style={{ padding: `${theme.spacing.xl} ${theme.spacing.xl} ${theme.spacing.lg}`, borderBottom: `1px solid ${theme.color.borderSubtle}` }}>
        <Stack direction="row" justify="space-between" align="flex-start" gap="sm">
          <div style={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" align="center" gap="xs" style={{ marginBottom: theme.spacing.sm }}>
              <StatusDot color={statusColor} />
              <span style={{ fontSize: theme.font.size.xs, color: theme.color.textMuted, fontWeight: 500 }}>
                {instructionStatusLabel[instruction.status]}
              </span>
              <span style={{ fontSize: theme.font.size.xs, color: theme.color.textFaint, fontFamily: theme.font.mono }}>
                Position {instruction.position}
              </span>
            </Stack>
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
              Instruction
            </h2>
            {instruction.agent && (
              <span
                style={{
                  display: "inline-block",
                  marginTop: theme.spacing.xs,
                  fontFamily: theme.font.mono,
                  fontSize: theme.font.size.xxs,
                  color: theme.color.textFaint,
                }}
              >
                {instruction.actor === "agent" ? "Agent" : "Human"}: {instruction.agent}
              </span>
            )}
          </div>
          <IconButton icon="close" size={18} onClick={onClose} aria-label="Close detail panel" />
        </Stack>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: theme.spacing.xl, display: "flex", flexDirection: "column" }}>
        {/* Prompt */}
        <div style={{ marginBottom: theme.spacing.xl }}>
          <SectionLabel style={{ marginBottom: theme.spacing.sm }}>Prompt</SectionLabel>
          <Markdown>{instruction.prompt}</Markdown>
        </div>

        {/* Output */}
        <div style={{ marginBottom: theme.spacing.xl }}>
          <SectionLabel style={{ marginBottom: theme.spacing.sm }}>Output</SectionLabel>
          {instruction.output ? (
            <Markdown>{instruction.output}</Markdown>
          ) : (
            <p style={{ margin: 0, fontSize: theme.font.size.xs, color: theme.color.textFaint, fontStyle: "italic" }}>
              No output yet
            </p>
          )}
        </div>

        {/* Bindings table */}
        <div style={{ marginBottom: theme.spacing.xl }}>
          <SectionLabel style={{ marginBottom: theme.spacing.sm }}>Bindings</SectionLabel>

          {bindings.length > 0 ? (
            <div
              style={{
                borderRadius: theme.radius.lg,
                border: `1px solid ${theme.color.borderSubtle}`,
                overflow: "hidden",
                marginBottom: theme.spacing.sm,
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: theme.font.size.xs,
                }}
              >
                <thead>
                  <tr style={{ background: theme.color.surfaceContainerHigh }}>
                    <th style={{ textAlign: "left", padding: `${theme.spacing.xs} ${theme.spacing.sm}`, color: theme.color.textFaint, fontWeight: 600, fontSize: theme.font.size.xxs, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                      ARN
                    </th>
                    <th style={{ textAlign: "left", padding: `${theme.spacing.xs} ${theme.spacing.sm}`, color: theme.color.textFaint, fontWeight: 600, fontSize: theme.font.size.xxs, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                      Kind
                    </th>
                    <th style={{ width: 28, padding: `${theme.spacing.xs} ${theme.spacing.sm}` }} />
                  </tr>
                </thead>
                <tbody>
                  {bindings.map((b) => (
                    <tr
                      key={b.id}
                      style={{ borderTop: `1px solid ${theme.color.borderSubtle}` }}
                    >
                      <td
                        style={{
                          padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                          fontFamily: theme.font.mono,
                          color: theme.color.textMuted,
                          wordBreak: "break-all",
                        }}
                      >
                        {b.arn}
                      </td>
                      <td style={{ padding: `${theme.spacing.xs} ${theme.spacing.sm}` }}>
                        <span
                          style={{
                            fontSize: "0.6rem",
                            fontWeight: 600,
                            color: colors[b.kind],
                            background: theme.color.surfaceContainerHigh,
                            borderRadius: theme.radius.sm,
                            padding: "1px 5px",
                          }}
                        >
                          {b.kind}
                        </span>
                      </td>
                      <td style={{ padding: `${theme.spacing.xs} ${theme.spacing.sm}`, textAlign: "center" }}>
                        <IconButton
                          icon="close"
                          size={12}
                          onClick={() => removeBinding(b.id)}
                          aria-label="Remove binding"
                          style={{ color: theme.color.textFaint, width: 16, height: 16 }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ margin: `0 0 ${theme.spacing.sm}`, fontSize: theme.font.size.xs, color: theme.color.textFaint, fontStyle: "italic" }}>
              No bindings
            </p>
          )}

          <form onSubmit={handleAddBinding} style={{ display: "flex", gap: theme.spacing.xs, alignItems: "flex-end" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Input
                placeholder="tab:project:01ABC..."
                value={newArn}
                onChange={(e) => setNewArn(e.target.value)}
                style={{ fontSize: theme.font.size.xs, padding: "2px 6px" }}
              />
            </div>
            <Select
              value={newKind}
              onChange={(e) => setNewKind(e.target.value as BindingKind)}
              options={bindingKindOptions}
              style={{ fontSize: theme.font.size.xxs, padding: "0.1rem 0.25rem" }}
            />
            <Button type="submit" size="sm" disabled={addingBinding} style={{ fontSize: theme.font.size.xs, padding: "2px 8px" }}>
              {addingBinding ? "..." : "Bind"}
            </Button>
          </form>
        </div>

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
              { label: "ID", value: instruction.id },
              { label: "Status", value: instructionStatusLabel[instruction.status] },
              { label: "Position", value: `${instruction.position}` },
              { label: "Actor", value: instruction.actor },
              { label: "Agent", value: instruction.agent ?? "\u2014" },
              { label: "Parallel", value: instruction.parallel ? "Yes" : "No" },
              { label: "Created", value: formatDate(instruction.created_at) },
              { label: "Updated", value: formatDate(instruction.updated_at) },
            ]}
          />
        </div>
      </div>
    </SidePanelLayout>
  );
}

// ---------------------------------------------------------------------------
// StatusSummaryBar for instructions
// ---------------------------------------------------------------------------

function InstructionStatusBar({ instructions }: { instructions: Instruction[] }) {
  const { theme } = useTheme();
  const counts: Record<InstructionStatus, number> = { pending: 0, running: 0, complete: 0, skipped: 0 };
  for (const inst of instructions) {
    if (inst.status in counts) counts[inst.status]++;
  }

  const items: Array<{ status: InstructionStatus; label: string }> = [
    { status: "complete", label: "complete" },
    { status: "running", label: "running" },
    { status: "pending", label: "pending" },
    { status: "skipped", label: "skipped" },
  ];

  const total = instructions.length;
  const completeCount = counts.complete;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: theme.spacing.lg,
        height: 40,
        background: theme.color.surfaceContainerLow,
        borderRadius: theme.radius.lg,
        padding: `${theme.spacing.sm} ${theme.spacing.xl}`,
        marginBottom: theme.spacing.xl,
      }}
    >
      <span
        style={{
          fontFamily: theme.font.mono,
          fontSize: theme.font.size.sm,
          color: theme.color.text,
          fontWeight: 700,
        }}
      >
        {completeCount}/{total}
      </span>
      <div
        style={{
          width: 1,
          height: 16,
          background: theme.color.borderSubtle,
        }}
      />
      {items.filter((item) => counts[item.status] > 0).map((item) => (
        <Stack key={item.status} direction="row" align="center" gap="xs">
          <StatusDot color={instructionStatusColor(theme, item.status)} size={6} />
          <span
            style={{
              fontFamily: theme.font.mono,
              fontSize: theme.font.size.xs,
              color: theme.color.textMuted,
            }}
          >
            {counts[item.status]} {item.label}
          </span>
        </Stack>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// WorkbenchPage
// ---------------------------------------------------------------------------

export function WorkbenchPage({ id, onBack }: { id: string; onBack: () => void }) {
  const { theme } = useTheme();
  const { workbench, instructions, notFound, addInstruction, deleteInstruction } = useWorkbench(id);
  const { showToast } = useToastContext();
  const [newPrompt, setNewPrompt] = useState("");
  const [selectedInstructionId, setSelectedInstructionId] = useState<string | null>(null);
  const [addingInstruction, setAddingInstruction] = useState(false);

  const selectedInstruction = selectedInstructionId ? instructions.find((i) => i.id === selectedInstructionId) ?? null : null;

  const handleClosePanel = useCallback(() => setSelectedInstructionId(null), []);

  async function handleAddInstruction() {
    if (!newPrompt.trim()) return;
    setAddingInstruction(true);
    try {
      await addInstruction(newPrompt);
      setNewPrompt("");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to add instruction");
    } finally {
      setAddingInstruction(false);
    }
  }

  async function handleDeleteInstruction(instructionId: string) {
    try {
      await deleteInstruction(instructionId);
      if (selectedInstructionId === instructionId) setSelectedInstructionId(null);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to delete instruction");
    }
  }

  if (notFound) {
    return (
      <div style={{ flex: 1, width: "100%", maxWidth: 900, padding: `${theme.spacing["2xl"]} ${theme.spacing.xl}`, boxSizing: "border-box" }}>
        <BackButton onClick={onBack} />
        <EmptyState
          icon="error_outline"
          message="Workbench not found."
          variant="card"
          style={{ marginTop: theme.spacing.xl }}
        />
      </div>
    );
  }

  if (!workbench) {
    return (
      <div style={{ flex: 1, width: "100%", maxWidth: 900, padding: `${theme.spacing["2xl"]} ${theme.spacing.xl}`, boxSizing: "border-box" }}>
        <p style={{ color: theme.color.textMuted, fontSize: theme.font.size.sm }}>Loading...</p>
      </div>
    );
  }

  return (
    <DetailPageLayout expanded={!!selectedInstruction}>
      <div style={{ flex: 1, minWidth: 0, padding: `${theme.spacing["2xl"]} ${theme.spacing.xl}`, boxSizing: "border-box", overflowY: "auto" }}>
        <BackButton onClick={onBack} label="All Workbenches" style={{ marginBottom: theme.spacing.lg }} />

        <div style={{ marginBottom: theme.spacing.xl }}>
          <Stack direction="row" align="center" gap="xs" style={{ marginBottom: theme.spacing.sm }}>
            <Icon name="construction" size={18} style={{ color: theme.color.primary }} />
            <span style={{ fontSize: theme.font.size.xs, color: theme.color.textMuted, fontFamily: theme.font.mono }}>{workbench.id}</span>
          </Stack>
          <h2
            style={{
              margin: 0,
              fontFamily: theme.font.headline,
              fontSize: theme.font.size.xl,
              fontWeight: 800,
              letterSpacing: theme.font.letterSpacing.tight,
              color: theme.color.text,
            }}
          >
            {workbench.goal}
          </h2>
        </div>

        {instructions.length > 0 && (
          <InstructionStatusBar instructions={instructions} />
        )}

        <Stack direction="row" justify="space-between" align="center" style={{ marginBottom: theme.spacing.md }}>
          <h3
            style={{
              margin: 0,
              fontFamily: theme.font.headline,
              fontSize: theme.font.size.lg,
              fontWeight: 700,
              color: theme.color.text,
            }}
          >
            Pipeline
          </h3>
          <span style={{ fontSize: theme.font.size.xs, color: theme.color.textFaint }}>
            {instructions.length} instruction{instructions.length !== 1 ? "s" : ""}
          </span>
        </Stack>

        <AddItemInput
          placeholder="Add an instruction..."
          value={newPrompt}
          onChange={setNewPrompt}
          onSubmit={handleAddInstruction}
          loading={addingInstruction}
          style={{ marginBottom: theme.spacing.xl }}
        />

        {/* Pipeline visualization */}
        <div style={{ position: "relative" }}>
          {instructions.map((inst, i) => (
            <PipelineNode
              key={inst.id}
              instruction={inst}
              isLast={i === instructions.length - 1}
              isSelected={selectedInstructionId === inst.id}
              onClick={() => setSelectedInstructionId(inst.id)}
              onDelete={() => handleDeleteInstruction(inst.id)}
            />
          ))}
          {instructions.length === 0 && (
            <EmptyState icon="list_alt" message="No instructions yet. Add one above." />
          )}
        </div>
      </div>

      {selectedInstruction && (
        <InstructionDetailPanel
          instruction={selectedInstruction}
          workbenchId={id}
          onClose={handleClosePanel}
        />
      )}
    </DetailPageLayout>
  );
}
