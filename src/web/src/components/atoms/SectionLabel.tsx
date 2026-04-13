import { semantic as t } from "@4lt7ab/ui/core";

interface SectionLabelProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function SectionLabel({ children, style }: SectionLabelProps) {
  return (
    <span
      style={{
        display: "block",
        fontSize: t.fontSizeXs,
        fontWeight: 700,
        letterSpacing: t.letterSpacingWide,
        textTransform: "uppercase",
        color: t.colorTextSecondary,
        ...style,
      }}
    >
      {children}
    </span>
  );
}
