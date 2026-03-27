import { useTheme } from "../theme/ThemeContext";
import { StatusDot } from "../atoms/StatusDot";

interface StatusSummaryItem {
  status: string;
  count: number;
  color: string;
}

interface StatusSummaryBarProps {
  items: StatusSummaryItem[];
  style?: React.CSSProperties;
}

export function StatusSummaryBar({ items, style }: StatusSummaryBarProps) {
  const { theme } = useTheme();

  const nonZero = items.filter((i) => i.count > 0);

  if (nonZero.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: theme.spacing.lg,
        height: 40,
        background: theme.color.surfaceContainerLow,
        borderRadius: theme.radius.lg,
        padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
        ...style,
      }}
    >
      {nonZero.map((item, idx) => (
        <div key={item.status} style={{ display: "flex", alignItems: "center", gap: theme.spacing.sm }}>
          {idx > 0 && (
            <div
              style={{
                width: 1,
                height: 16,
                background: theme.color.borderSubtle,
                marginRight: theme.spacing.sm,
              }}
            />
          )}
          <StatusDot color={item.color} size={8} />
          <span
            style={{
              fontFamily: theme.font.mono,
              fontSize: theme.font.size.sm,
              color: theme.color.text,
              fontWeight: 600,
            }}
          >
            {item.count}
          </span>
          <span
            style={{
              fontSize: theme.font.size.xs,
              color: theme.color.textMuted,
            }}
          >
            {item.status}
          </span>
        </div>
      ))}
    </div>
  );
}
