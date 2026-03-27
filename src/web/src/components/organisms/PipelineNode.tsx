import { useTheme } from "../theme/ThemeContext";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { Badge } from "../atoms/Badge";
import type { Instruction } from "../../types";

interface PipelineNodeProps {
  instruction: Instruction;
  isLast: boolean;
  isSelected: boolean;
  onClick: () => void;
}

type InstructionStatus = "pending" | "running" | "complete" | "skipped";

/**
 * Map instruction status to existing Badge variants.
 * Once the parallel atoms instruction extends Badge with instruction-specific
 * variants, this mapping can be simplified.
 */
function statusToBadgeVariant(status: string | undefined): "active" | "paused" | "completed" | "archived" | "default" {
  switch (status) {
    case "running":
      return "active";
    case "complete":
      return "completed";
    case "skipped":
      return "archived";
    case "pending":
    case "failed":
    default:
      return "default";
  }
}

function getNodeColor(theme: ReturnType<typeof useTheme>["theme"], status: InstructionStatus): string {
  switch (status) {
    case "running":
      return theme.color.primary;
    case "complete":
      return theme.color.success;
    case "pending":
      return theme.color.textFaint;
    case "skipped":
      return theme.color.textFaint;
    default:
      return theme.color.textFaint;
  }
}

export function PipelineNode({ instruction, isLast, isSelected, onClick }: PipelineNodeProps) {
  const { theme } = useTheme();
  const reduced = useReducedMotion();

  const status = (instruction.status ?? "pending") as InstructionStatus;
  const nodeColor = getNodeColor(theme, status);
  const isRunning = status === "running";
  const isSkipped = status === "skipped";

  const nodeSize = 12;
  const lineWidth = 2;
  const indent = 48;
  const lineLeft = 16;

  const promptPreview = instruction.prompt.length > 120
    ? instruction.prompt.slice(0, 120) + "..."
    : instruction.prompt;

  const outputPreview = instruction.output
    ? instruction.output.length > 80
      ? instruction.output.slice(0, 80) + "..."
      : instruction.output
    : null;

  return (
    <div style={{ position: "relative", paddingLeft: indent, paddingBottom: isLast ? 0 : 0 }}>
      {/* Vertical connector line */}
      {!isLast && (
        <div
          style={{
            position: "absolute",
            left: lineLeft - lineWidth / 2,
            top: nodeSize / 2,
            bottom: 0,
            width: lineWidth,
            background: theme.color.borderSubtle,
          }}
        />
      )}

      {/* Status node circle */}
      <div
        style={{
          position: "absolute",
          left: lineLeft - nodeSize / 2,
          top: theme.spacing.md,
          width: nodeSize,
          height: nodeSize,
          borderRadius: theme.radius.full,
          background: nodeColor,
          opacity: isSkipped ? 0.5 : 1,
          animation: isRunning && !reduced
            ? `glow-pulse ${theme.animation.duration.pulse} ease-in-out infinite`
            : undefined,
          boxShadow: isRunning && !reduced
            ? `0 0 8px 2px ${nodeColor}4d`
            : undefined,
          zIndex: 1,
        }}
      />

      {/* Content block */}
      <div
        onClick={onClick}
        style={{
          background: isSelected ? theme.color.surfaceContainerHigh : theme.color.surfaceContainer,
          border: `1px solid ${isSelected ? theme.color.primary : theme.color.borderSubtle}`,
          borderRadius: theme.radius.lg,
          padding: `${theme.spacing.md} ${theme.spacing.lg}`,
          cursor: "pointer",
          transition: `border-color ${theme.motion.fast}, background ${theme.motion.fast}`,
          marginBottom: theme.spacing.sm,
          animation: isRunning && !reduced
            ? `border-pulse 2s ease-in-out infinite`
            : undefined,
          ...(isRunning && !reduced ? {
            "--border-pulse-color": `${theme.color.primary}99`,
            "--border-pulse-dim": `${theme.color.primary}2a`,
          } as React.CSSProperties : {}),
        }}
      >
        {/* Top row: position + status badge */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: theme.spacing.xs }}>
          <span
            style={{
              fontFamily: theme.font.mono,
              fontSize: theme.font.size.xxs,
              color: theme.color.textFaint,
            }}
          >
            #{instruction.position}
          </span>
          <Badge variant={statusToBadgeVariant(instruction.status)}>
            {instruction.status ?? "pending"}
          </Badge>
        </div>

        {/* Prompt preview */}
        <p
          style={{
            margin: 0,
            fontSize: theme.font.size.sm,
            color: theme.color.textMuted,
            lineHeight: theme.font.lineHeight.normal,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {promptPreview}
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
            {instruction.agent}
          </span>
        )}

        {/* Output preview */}
        {outputPreview && (
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
            {outputPreview}
          </p>
        )}
      </div>
    </div>
  );
}
