import { useTheme } from "../theme/ThemeContext";
import { Icon } from "../atoms/Icon";
import { Stack } from "./Stack";
import { Card } from "./Card";

interface EmptyStateProps {
  icon: string;
  message: string;
  variant?: "card" | "plain";
  style?: React.CSSProperties;
}

export function EmptyState({ icon, message, variant = "plain", style }: EmptyStateProps) {
  const { theme } = useTheme();

  const content = (
    <Stack align="center" gap="lg" style={variant === "plain" ? style : undefined}>
      <Icon name={icon} size={40} style={{ color: theme.color.textFaint }} />
      <p
        style={{
          margin: 0,
          color: theme.color.textMuted,
          fontSize: theme.font.size.sm,
          textAlign: "center",
        }}
      >
        {message}
      </p>
    </Stack>
  );

  if (variant === "card") {
    return (
      <Card variant="flat" padding="2xl" style={style}>
        {content}
      </Card>
    );
  }

  return content;
}
