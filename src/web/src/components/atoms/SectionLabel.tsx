import { useTheme } from "../theme/ThemeContext";

interface SectionLabelProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function SectionLabel({ children, style }: SectionLabelProps) {
  const { theme } = useTheme();

  return (
    <span
      style={{
        display: "block",
        fontSize: theme.font.size.xxs,
        fontWeight: 700,
        letterSpacing: theme.font.letterSpacing.wide,
        textTransform: "uppercase",
        color: theme.color.textFaint,
        ...style,
      }}
    >
      {children}
    </span>
  );
}
