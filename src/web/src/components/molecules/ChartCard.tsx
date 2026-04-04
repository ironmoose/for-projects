import type { ReactNode } from "react";
import { useTheme } from "../theme/ThemeContext";

interface ChartCardProps {
  title: string;
  children: ReactNode;
  style?: React.CSSProperties;
}

export function ChartCard({ title, children, style }: ChartCardProps) {
  const { theme } = useTheme();

  return (
    <div
      style={{
        background: theme.color.surfaceContainer,
        border: `1px solid ${theme.glow.borderLight}`,
        borderRadius: theme.radius.xl,
        padding: theme.spacing.lg,
        boxShadow: theme.glow.animated ? `0 0 10px ${theme.glow.borderSubtle}` : "none",
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.sm,
        ...style,
      }}
    >
      <span
        style={{
          fontSize: theme.font.size.xs,
          fontFamily: theme.font.body,
          color: theme.glow.accentColor,
          fontWeight: 600,
          letterSpacing: theme.font.letterSpacing.wide,
          textTransform: "uppercase",
          textShadow: theme.glow.textShadow,
        }}
      >
        {title}
      </span>
      <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
    </div>
  );
}
