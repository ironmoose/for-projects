import { semantic as t } from "@4lt7ab/ui/core";
import type { Theme } from "../theme/theme";

export function tableWrapperStyle(theme: Theme): React.CSSProperties {
  return {
    overflowX: "auto",
    borderRadius: t.radiusLg,
    border: `1px solid ${theme.glow.animated ? theme.glow.borderLight : t.colorBorder}`,
    background: t.colorSurface,
    ...(theme.glow.animated ? { boxShadow: theme.glow.shadowMd } : {}),
  };
}

export function tableHeaderStyle(theme: Theme): React.CSSProperties {
  return {
    padding: `${t.spaceSm} ${t.spaceMd}`,
    textAlign: "left",
    fontWeight: 600,
    fontSize: t.fontSizeXs,
    color: theme.glow.animated ? theme.glow.accentColor : t.colorTextMuted,
    textTransform: "uppercase",
    letterSpacing: t.letterSpacingWide,
    borderBottom: theme.glow.animated
      ? `2px solid ${theme.glow.borderMedium}`
      : `2px solid ${t.colorBorder}`,
    whiteSpace: "nowrap",
    ...(theme.glow.animated ? { textShadow: theme.glow.textShadow } : {}),
  };
}

export function cellStyle(theme: Theme): React.CSSProperties {
  return {
    padding: `${t.spaceSm} ${t.spaceMd}`,
    borderBottom: `1px solid ${t.colorBorder}`,
    verticalAlign: "middle",
  };
}
