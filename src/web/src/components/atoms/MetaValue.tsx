import { useTheme } from "../theme/ThemeContext";

interface MetaValueProps {
  label: string;
  value: string;
  style?: React.CSSProperties;
}

export function MetaValue({ label, value, style }: MetaValueProps) {
  const { theme } = useTheme();

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        ...style,
      }}
    >
      <span style={{ fontSize: theme.font.size.xs, color: theme.color.textFaint }}>{label}</span>
      <span
        style={{
          fontSize: theme.font.size.xs,
          color: theme.color.textMuted,
          fontFamily: theme.font.mono,
          textAlign: "right",
        }}
      >
        {value}
      </span>
    </div>
  );
}
