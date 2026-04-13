import { semantic as t } from "@4lt7ab/ui/core";
import { useTheme } from "../theme/ThemeContext";

type BadgeVariant =
  | "active" | "archived" | "default"
  | "pending" | "running" | "complete" | "failed" | "skipped"
  | "todo" | "in_progress" | "done" | "warning";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  style?: React.CSSProperties;
}

/** CSS color-mix helper for alpha-blending semantic tokens with transparency. */
function alpha(token: string, pct: number): string {
  return `color-mix(in srgb, ${token} ${pct}%, transparent)`;
}

function glowForVariant(variant: BadgeVariant, theme: ReturnType<typeof useTheme>["theme"]): React.CSSProperties {
  if (!theme.glow.animated) return {};
  const glowMap: Partial<Record<BadgeVariant, string>> = {
    active: t.colorActionPrimary,
    running: t.colorActionPrimary,
    complete: t.colorSuccess,
    failed: t.colorActionDestructive,
    in_progress: theme.color.tertiary,
    done: t.colorSuccess,
  };
  const color = glowMap[variant];
  if (!color) return {};
  return {
    boxShadow: `0 0 8px ${alpha(color, 20)}, inset 0 0 6px ${alpha(color, 7)}`,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: alpha(color, 27),
  };
}

export function Badge({ children, variant = "default", style }: BadgeProps) {
  const { theme } = useTheme();

  const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
    active: {
      background: alpha(t.colorActionPrimary, 13),
      color: t.colorActionPrimary,
    },
    archived: {
      background: t.colorSurfaceRaised,
      color: t.colorTextSecondary,
    },
    default: {
      background: t.colorSurfaceRaised,
      color: t.colorTextMuted,
    },
    pending: {
      background: t.colorSurfaceRaised,
      color: t.colorTextSecondary,
    },
    running: {
      background: alpha(t.colorActionPrimary, 15),
      color: t.colorActionPrimary,
      ["--glow-color" as string]: alpha(t.colorActionPrimary, 20),
      animation: `glow-pulse 2s ease-in-out infinite`,
    },
    complete: {
      background: alpha(t.colorSuccess, 15),
      color: t.colorSuccess,
    },
    failed: {
      background: alpha(t.colorActionDestructive, 15),
      color: t.colorActionDestructive,
    },
    skipped: {
      background: t.colorSurfaceRaised,
      color: t.colorTextSecondary,
      opacity: 0.6,
    },
    todo: {
      background: t.colorSurfaceRaised,
      color: t.colorTextMuted,
    },
    in_progress: {
      background: alpha(theme.color.tertiary, 15),
      color: theme.color.tertiary,
    },
    done: {
      background: alpha(t.colorSuccess, 15),
      color: t.colorSuccess,
    },
    warning: {
      background: alpha(t.colorWarning, 15),
      color: t.colorWarning,
    },
  };

  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.2rem 0.5rem",
        borderRadius: t.radiusMd,
        fontSize: theme.font.size.xxs,
        fontWeight: 700,
        fontFamily: t.fontSans,
        letterSpacing: theme.font.letterSpacing.wide,
        textTransform: "uppercase",
        lineHeight: 1.4,
        transition: `background 200ms, color 200ms, box-shadow 200ms`,
        ...variantStyles[variant],
        ...glowForVariant(variant, theme),
        ...style,
      }}
    >
      {children}
    </span>
  );
}
