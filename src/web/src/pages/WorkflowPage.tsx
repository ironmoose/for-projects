import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Button,
  Icon,
  IconButton,
  Input,
  Markdown,
  Stack,
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
import { useWorkflow, useBindings, useEventDrivenAnimation } from "../hooks";
import { useToastContext } from "../components/ToastContext";
import { ApiError } from "../api";
import type { Instruction, Phase } from "../types";
import { formatDate } from "../utils";

// ---------------------------------------------------------------------------
// InstructionNode
// ---------------------------------------------------------------------------

function InstructionNode({
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

  const contentAnimationStyle: React.CSSProperties = {};
  if (animationState === "shake") {
    contentAnimationStyle.animation = `shake 400ms ${theme.animation.easing.default}`;
  } else if (animationState === "flash") {
    contentAnimationStyle.animation = `highlight-flash 600ms ease-out`;
  }

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

      {/* Node circle — filled when output is present */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 16,
          width: parseInt(theme.layout.pipelineNodeSize),
          height: parseInt(theme.layout.pipelineNodeSize),
          borderRadius: theme.radius.full,
          background: instruction.output ? theme.color.primary : theme.color.textFaint,
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
            border: `1px solid ${isSelected ? theme.color.primary : theme.color.borderSubtle}`,
            transition: `background ${theme.animation.duration.fast} ${theme.animation.easing.default}, border-color ${theme.animation.duration.fast}`,
            ...contentAnimationStyle,
          }}
          onMouseEnter={(e) => {
            if (!isSelected) e.currentTarget.style.background = theme.color.surfaceContainerHigh;
          }}
          onMouseLeave={(e) => {
            if (!isSelected) e.currentTarget.style.background = theme.color.surfaceContainer;
          }}
        >
          {/* Top row: delete */}
          <Stack direction="row" justify="space-between" align="center" style={{ marginBottom: theme.spacing.sm }}>
            <Stack direction="row" align="center" gap="sm">
              <Badge variant={instruction.output ? "complete" : "pending"}>
                {instruction.output ? "Complete" : "Pending"}
              </Badge>
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
  workflowId,
  phaseId,
  onClose,
}: {
  instruction: Instruction;
  workflowId: string;
  phaseId: string;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const { bindings, addBinding, removeBinding } = useBindings(workflowId, phaseId, instruction.id);
  const { showToast } = useToastContext();
  const [newArn, setNewArn] = useState("");
  const [addingBinding, setAddingBinding] = useState(false);

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
      await addBinding(newArn);
      setNewArn("");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to add binding");
    } finally {
      setAddingBinding(false);
    }
  }

  return (
    <SidePanelLayout onClose={onClose}>
      {/* Header */}
      <div style={{ padding: `${theme.spacing.xl} ${theme.spacing.xl} ${theme.spacing.lg}`, borderBottom: `1px solid ${theme.color.borderSubtle}` }}>
        <Stack direction="row" justify="space-between" align="flex-start" gap="sm">
          <div style={{ flex: 1, minWidth: 0 }}>
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
                agent: {instruction.agent}
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
              { label: "Agent", value: instruction.agent ?? "\u2014" },
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
// PhaseSection
// ---------------------------------------------------------------------------

function PhaseSection({
  phase,
  instructions,
  workflowId,
  selectedInstructionId,
  onSelectInstruction,
  onDeleteInstruction,
  onAddInstruction,
  onDeletePhase,
}: {
  phase: Phase;
  instructions: Instruction[];
  workflowId: string;
  selectedInstructionId: string | null;
  onSelectInstruction: (id: string) => void;
  onDeleteInstruction: (phaseId: string, instructionId: string) => void;
  onAddInstruction: (phaseId: string, prompt: string) => Promise<void>;
  onDeletePhase: (phaseId: string) => void;
}) {
  const { theme } = useTheme();
  const [newPrompt, setNewPrompt] = useState("");
  const [adding, setAdding] = useState(false);
  const { showToast } = useToastContext();

  async function handleAdd() {
    if (!newPrompt.trim()) return;
    setAdding(true);
    try {
      await onAddInstruction(phase.id, newPrompt);
      setNewPrompt("");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to add instruction");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div style={{ marginBottom: theme.spacing.xl }}>
      <Stack direction="row" justify="space-between" align="center" style={{ marginBottom: theme.spacing.md }}>
        <Stack direction="row" align="center" gap="sm">
          <Icon name="layers" size={16} style={{ color: theme.color.primary }} />
          <h4
            style={{
              margin: 0,
              fontFamily: theme.font.headline,
              fontSize: theme.font.size.md,
              fontWeight: 700,
              color: theme.color.text,
            }}
          >
            {phase.title}
          </h4>
          <span style={{ fontSize: theme.font.size.xxs, color: theme.color.textFaint }}>
            {instructions.length} instruction{instructions.length !== 1 ? "s" : ""}
          </span>
        </Stack>
        <IconButton
          icon="delete_outline"
          size={14}
          onClick={() => onDeletePhase(phase.id)}
          aria-label="Delete phase"
          style={{ color: theme.color.textFaint }}
        />
      </Stack>

      <AddItemInput
        placeholder="Add an instruction..."
        value={newPrompt}
        onChange={setNewPrompt}
        onSubmit={handleAdd}
        loading={adding}
        style={{ marginBottom: theme.spacing.md }}
      />

      <div style={{ position: "relative" }}>
        {instructions.map((inst, i) => (
          <InstructionNode
            key={inst.id}
            instruction={inst}
            isLast={i === instructions.length - 1}
            isSelected={selectedInstructionId === inst.id}
            onClick={() => onSelectInstruction(inst.id)}
            onDelete={() => onDeleteInstruction(phase.id, inst.id)}
          />
        ))}
        {instructions.length === 0 && (
          <EmptyState icon="list_alt" message="No instructions yet. Add one above." />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// WorkflowPage
// ---------------------------------------------------------------------------

export function WorkflowPage({ id, onBack }: { id: string; onBack: () => void }) {
  const { theme } = useTheme();
  const {
    workflow,
    phases,
    instructionsByPhase,
    notFound,
    addPhase,
    deletePhase,
    addInstruction,
    deleteInstruction,
  } = useWorkflow(id);
  const { showToast } = useToastContext();
  const [newPhaseTitle, setNewPhaseTitle] = useState("");
  const [selectedInstructionId, setSelectedInstructionId] = useState<string | null>(null);
  const [addingPhase, setAddingPhase] = useState(false);

  // Find which phase the selected instruction belongs to
  let selectedInstruction: Instruction | null = null;
  let selectedPhaseId: string | null = null;
  if (selectedInstructionId) {
    for (const phase of phases) {
      const instr = (instructionsByPhase[phase.id] ?? []).find((i) => i.id === selectedInstructionId);
      if (instr) {
        selectedInstruction = instr;
        selectedPhaseId = phase.id;
        break;
      }
    }
  }

  const handleClosePanel = useCallback(() => setSelectedInstructionId(null), []);

  async function handleAddPhase() {
    if (!newPhaseTitle.trim()) return;
    setAddingPhase(true);
    try {
      await addPhase(newPhaseTitle);
      setNewPhaseTitle("");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to add phase");
    } finally {
      setAddingPhase(false);
    }
  }

  async function handleDeletePhase(phaseId: string) {
    try {
      await deletePhase(phaseId);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to delete phase");
    }
  }

  async function handleDeleteInstruction(phaseId: string, instructionId: string) {
    try {
      await deleteInstruction(phaseId, instructionId);
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
          message="Workflow not found."
          variant="card"
          style={{ marginTop: theme.spacing.xl }}
        />
      </div>
    );
  }

  if (!workflow) {
    return (
      <div style={{ flex: 1, width: "100%", maxWidth: 900, padding: `${theme.spacing["2xl"]} ${theme.spacing.xl}`, boxSizing: "border-box" }}>
        <p style={{ color: theme.color.textMuted, fontSize: theme.font.size.sm }}>Loading...</p>
      </div>
    );
  }

  return (
    <DetailPageLayout expanded={!!selectedInstruction}>
      <div style={{ flex: 1, minWidth: 0, padding: `${theme.spacing["2xl"]} ${theme.spacing.xl}`, boxSizing: "border-box", overflowY: "auto" }}>
        <BackButton onClick={onBack} label="All Workflows" style={{ marginBottom: theme.spacing.lg }} />

        <div style={{ marginBottom: theme.spacing.xl }}>
          <Stack direction="row" align="center" gap="xs" style={{ marginBottom: theme.spacing.sm }}>
            <Icon name="account_tree" size={18} style={{ color: theme.color.primary }} />
            <span style={{ fontSize: theme.font.size.xs, color: theme.color.textMuted, fontFamily: theme.font.mono }}>{workflow.id}</span>
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
            {workflow.goal}
          </h2>
        </div>

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
            Phases
          </h3>
          <span style={{ fontSize: theme.font.size.xs, color: theme.color.textFaint }}>
            {phases.length} phase{phases.length !== 1 ? "s" : ""}
          </span>
        </Stack>

        <AddItemInput
          placeholder="Add a phase..."
          value={newPhaseTitle}
          onChange={setNewPhaseTitle}
          onSubmit={handleAddPhase}
          loading={addingPhase}
          style={{ marginBottom: theme.spacing.xl }}
        />

        {phases.map((phase) => (
          <PhaseSection
            key={phase.id}
            phase={phase}
            instructions={instructionsByPhase[phase.id] ?? []}
            workflowId={id}
            selectedInstructionId={selectedInstructionId}
            onSelectInstruction={setSelectedInstructionId}
            onDeleteInstruction={handleDeleteInstruction}
            onAddInstruction={addInstruction}
            onDeletePhase={handleDeletePhase}
          />
        ))}

        {phases.length === 0 && (
          <EmptyState icon="layers" message="No phases yet. Add one above." />
        )}
      </div>

      {selectedInstruction && selectedPhaseId && (
        <InstructionDetailPanel
          instruction={selectedInstruction}
          workflowId={id}
          phaseId={selectedPhaseId}
          onClose={handleClosePanel}
        />
      )}
    </DetailPageLayout>
  );
}
