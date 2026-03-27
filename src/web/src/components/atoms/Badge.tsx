import { useTheme } from "../theme/ThemeContext";

type BadgeVariant =
  | "active" | "paused" | "completed" | "archived" | "default"
  | "pending" | "running" | "complete" | "failed" | "skipped"
  | "todo" | "in_progress" | "done";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  style?: React.CSSProperties;
}

export function Badge({ children, variant = "default", style }: BadgeProps) {
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
    pending: {
      background: theme.color.surfaceContainerHigh,
      color: theme.color.textFaint,
    },
    running: {
      background: `${theme.color.primary}26`,
      color: theme.color.primary,
      ["--glow-color" as string]: `${theme.color.primary}33`,
      animation: `glow-pulse 2s ease-in-out infinite`,
    },
    complete: {
      background: `${theme.color.success}26`,
      color: theme.color.success,
    },
    failed: {
      background: `${theme.color.danger}26`,
      color: theme.color.danger,
    },
    skipped: {
      background: theme.color.surfaceContainerHigh,
      color: theme.color.textFaint,
      opacity: 0.6,
    },
    todo: {
      background: theme.color.surfaceContainerHigh,
      color: theme.color.textMuted,
    },
    in_progress: {
      background: `${theme.color.tertiary}26`,
      color: theme.color.tertiary,
    },
    done: {
      background: `${theme.color.success}26`,
      color: theme.color.success,
    },
  };

  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.2rem 0.5rem",
        borderRadius: theme.radius.md,
        fontSize: theme.font.size.xxs,
        fontWeight: 700,
        fontFamily: theme.font.body,
        letterSpacing: theme.font.letterSpacing.wide,
        textTransform: "uppercase",
        lineHeight: 1.4,
        transition: `background 200ms, color 200ms, box-shadow 200ms`,
        ...variantStyles[variant],
        ...style,
      }}
    >
      {children}
    </span>
  );
}
