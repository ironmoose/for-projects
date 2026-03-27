import { useTheme } from "../theme/ThemeContext";

interface StatusDotProps {
  color: string;
  size?: number;
  style?: React.CSSProperties;
}

export function StatusDot({ color, size = 8, style }: StatusDotProps) {
  const { theme } = useTheme();

  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: theme.radius.full,
        background: color,
        flexShrink: 0,
        ...style,
      }}
    />
  );
}
