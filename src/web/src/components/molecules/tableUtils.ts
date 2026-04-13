import type { Theme } from "../theme/theme";

export function tableWrapperStyle(theme: Theme): React.CSSProperties {
  return {
    overflowX: "auto",
    borderRadius: theme.radius.lg,
    border: `1px solid ${theme.glow.animated ? theme.glow.borderLight : theme.color.border}`,
    background: theme.color.surface,
    ...(theme.glow.animated ? { boxShadow: theme.glow.shadowMd } : {}),
  };
}

export function tableHeaderStyle(theme: Theme): React.CSSProperties {
  return {
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    textAlign: "left",
    fontWeight: 600,
    fontSize: theme.font.size.xxs,
    color: theme.glow.animated ? theme.glow.accentColor : theme.color.textMuted,
    textTransform: "uppercase",
    letterSpacing: theme.font.letterSpacing.wide,
    borderBottom: theme.glow.animated
      ? `2px solid ${theme.glow.borderMedium}`
      : `2px solid ${theme.color.border}`,
    whiteSpace: "nowrap",
    ...(theme.glow.animated ? { textShadow: theme.glow.textShadow } : {}),
  };
}

export function cellStyle(theme: Theme): React.CSSProperties {
  return {
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    borderBottom: `1px solid ${theme.color.border}`,
    verticalAlign: "middle",
  };
}
