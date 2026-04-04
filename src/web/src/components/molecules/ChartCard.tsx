import type { ReactNode } from "react";
import { useTheme } from "../theme/ThemeContext";
import { sg } from "../theme/synthGlow";
import { Card } from "./Card";

interface ChartCardProps {
  title: string;
  children: ReactNode;
  style?: React.CSSProperties;
}

export function ChartCard({ title, children, style }: ChartCardProps) {
  const { theme, themeName } = useTheme();
  const isSynth = themeName === "synth";

  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: theme.spacing.sm, ...style }}>
      <span
        style={{
          fontSize: theme.font.size.xs,
          fontFamily: theme.font.body,
          color: isSynth ? "var(--synth-glow)" : theme.color.textMuted,
          fontWeight: 600,
          letterSpacing: theme.font.letterSpacing.wide,
          textTransform: "uppercase",
          ...(isSynth ? { textShadow: `0 0 8px ${sg(27)}` } : {}),
        }}
      >
        {title}
      </span>
      <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
    </Card>
  );
}
