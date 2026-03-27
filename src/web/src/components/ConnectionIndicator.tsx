import { useTheme } from "./theme/ThemeContext";

export function ConnectionIndicator({ connected }: { connected: boolean }) {
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
        transition: "background 0.3s",
      }}
    />
  );
}
