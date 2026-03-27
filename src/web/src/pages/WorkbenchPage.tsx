import { useCallback, useEffect, useState } from "react";
import {
  Button,
  Icon,
  IconButton,
  Input,
  Markdown,
  Select,
  Stack,
  useTheme,
  DetailPageLayout,
  SidePanelLayout,
  BackButton,
  SectionLabel,
  MetadataTable,
  ListItem,
  EmptyState,
  AddItemInput,
} from "../components";
import { useWorkbench, useInstructionBindings } from "../hooks";
import { useToastContext } from "../components/ToastContext";
import { ApiError } from "../api";
import type { Instruction, BindingKind } from "../types";
import { bindingKindOptions, kindColor } from "../types";
import { formatDate } from "../utils";

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

  return (
    <SidePanelLayout onClose={onClose}>
      {/* Header */}
      <div style={{ padding: `${theme.spacing.xl} ${theme.spacing.xl} ${theme.spacing.lg}`, borderBottom: `1px solid ${theme.color.borderSubtle}` }}>
        <Stack direction="row" justify="space-between" align="flex-start" gap="sm">
          <div style={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" align="center" gap="xs" style={{ marginBottom: theme.spacing.sm }}>
              <span style={{ fontSize: theme.font.size.xs, color: theme.color.textMuted, fontWeight: 500 }}>
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
              { label: "Position", value: `${instruction.position}` },
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
    await deleteInstruction(instructionId);
    if (selectedInstructionId === instructionId) setSelectedInstructionId(null);
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
            Instructions
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

        <Stack gap="xs">
          {instructions.map((inst) => (
            <ListItem
              key={inst.id}
              onClick={() => setSelectedInstructionId(inst.id)}
              selected={selectedInstructionId === inst.id}
            >
              <Stack direction="row" justify="space-between" align="center" gap="xs">
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: theme.font.size.sm,
                    color: theme.color.text,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    display: "flex",
                    alignItems: "center",
                    gap: theme.spacing.xs,
                  }}
                >
                  <span style={{ color: theme.color.textFaint, fontFamily: theme.font.mono, fontSize: theme.font.size.xs, flexShrink: 0 }}>
                    {inst.position}
                  </span>
                  {inst.prompt}
                </span>
                <Stack direction="row" gap="xs" style={{ flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                  <IconButton
                    icon="close"
                    size={12}
                    onClick={() => handleDeleteInstruction(inst.id)}
                    aria-label="Delete instruction"
                    style={{ color: theme.color.textFaint, width: 18, height: 18 }}
                  />
                </Stack>
              </Stack>
            </ListItem>
          ))}
          {instructions.length === 0 && (
            <EmptyState icon="list_alt" message="No instructions yet. Add one above." />
          )}
        </Stack>
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
