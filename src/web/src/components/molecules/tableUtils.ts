import type { Theme } from "../theme/theme";
import { sg } from "../theme/synthGlow";

export function tableWrapperStyle(theme: Theme, isSynth: boolean): React.CSSProperties {
  return {
    overflowX: "auto",
    borderRadius: theme.radius.lg,
    border: `1px solid ${isSynth ? sg(20) : theme.color.border}`,
    background: theme.color.surface,
    ...(isSynth ? { boxShadow: `0 0 12px ${sg(7)}` } : {}),
  };
}

export function tableHeaderStyle(theme: Theme, isSynth: boolean): React.CSSProperties {
  return {
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    textAlign: "left",
    fontWeight: 600,
    fontSize: theme.font.size.xxs,
    color: isSynth ? "var(--synth-glow)" : theme.color.textMuted,
    textTransform: "uppercase",
    letterSpacing: theme.font.letterSpacing.wide,
    borderBottom: isSynth
      ? `2px solid ${sg(27)}`
      : `2px solid ${theme.color.border}`,
    whiteSpace: "nowrap",
    ...(isSynth ? { textShadow: `0 0 8px ${sg(27)}` } : {}),
  };
}

export function cellStyle(theme: Theme): React.CSSProperties {
  return {
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    borderBottom: `1px solid ${theme.color.border}`,
    verticalAlign: "middle",
  };
}
