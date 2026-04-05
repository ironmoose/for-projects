import { useTheme } from "../theme/ThemeContext";

const REFERENCE_TYPE_LABELS: Record<string, string> = {
  goal: "Goal",
  plan: "Plan",
  requirements: "Requirements",
  design: "Design",
  reference: "Reference",
  note: "Note",
};

interface ReferenceTypeBadgeProps {
  type: string;
  style?: React.CSSProperties;
}

export function ReferenceTypeBadge({ type, style }: ReferenceTypeBadgeProps) {
  const { theme } = useTheme();

  return (
    <span
      style={{
        display: "inline-block",
        padding: "1px 6px",
        borderRadius: theme.radius.sm,
        fontSize: theme.font.size.xxs,
        fontWeight: 600,
        fontFamily: theme.font.body,
        letterSpacing: theme.font.letterSpacing.wide,
        textTransform: "uppercase",
        lineHeight: 1.4,
        background: theme.color.surfaceContainerHigh,
        color: theme.color.textMuted,
        ...style,
      }}
    >
      {REFERENCE_TYPE_LABELS[type] ?? type}
    </span>
  );
}
