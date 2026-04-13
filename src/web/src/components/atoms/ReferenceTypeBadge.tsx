import { semantic as t } from "@4lt7ab/ui/core";

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
  return (
    <span
      style={{
        display: "inline-block",
        padding: "1px 6px",
        borderRadius: t.radiusSm,
        fontSize: t.fontSizeXs,
        fontWeight: 600,
        fontFamily: t.fontSans,
        letterSpacing: t.letterSpacingWide,
        textTransform: "uppercase",
        lineHeight: 1.4,
        background: t.colorSurfaceRaised,
        color: t.colorTextMuted,
        ...style,
      }}
    >
      {REFERENCE_TYPE_LABELS[type] ?? type}
    </span>
  );
}
