import { useTheme } from "../theme/ThemeContext";

interface ConnectionDotProps {
  connected: boolean;
  style?: React.CSSProperties;
}

export function ConnectionDot({ connected, style }: ConnectionDotProps) {
  const { theme } = useTheme();

  return (
    <span
      title={connected ? "Live updates active" : "Reconnecting..."}
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: theme.radius.full,
        background: connected ? theme.color.success : theme.color.textFaint,
        transition: `background ${theme.motion.normal} ${theme.motion.easing}`,
        ...style,
      }}
    />
  );
}
