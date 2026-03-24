import { useTheme } from "./ThemeContext";

type BadgeVariant = "active" | "paused" | "completed" | "archived" | "default";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
}

export function Badge({ children, variant = "default" }: BadgeProps) {
  const { theme } = useTheme();

  const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
    active: {
      background: `${theme.color.primary}22`,
      color: theme.color.primary,
    },
    completed: {
      background: `${theme.color.success}22`,
      color: theme.color.success,
    },
    paused: {
      background: theme.color.surfaceContainerHighest,
      color: theme.color.textMuted,
    },
    archived: {
      background: theme.color.surfaceContainerHigh,
      color: theme.color.textFaint,
    },
    default: {
      background: theme.color.surfaceContainerHigh,
      color: theme.color.textMuted,
    },
  };

  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.2rem 0.5rem",
        borderRadius: theme.radius.md,
        fontSize: "0.625rem",
        fontWeight: 700,
        fontFamily: theme.font.body,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        lineHeight: 1.4,
        ...variantStyles[variant],
      }}
    >
      {children}
    </span>
  );
}
