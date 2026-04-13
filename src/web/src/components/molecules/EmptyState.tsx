import { semantic as t } from "@4lt7ab/ui/core";
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
  const content = (
    <Stack align="center" gap="lg" style={variant === "plain" ? style : undefined}>
      <Icon name={icon} size={40} style={{ color: t.colorTextSecondary }} />
      <p
        style={{
          margin: 0,
          color: t.colorTextMuted,
          fontSize: t.fontSizeSm,
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
