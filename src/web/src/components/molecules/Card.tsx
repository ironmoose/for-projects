import { type HTMLAttributes } from "react";
import { type Theme } from "../theme/theme";
import { useTheme } from "../theme/ThemeContext";

type CardVariant = "default" | "flat";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: keyof Theme["spacing"];
  variant?: CardVariant;
}

export function Card({ padding = "lg", variant = "default", style, ...props }: CardProps) {
  const { theme } = useTheme();

  const variantStyles: Record<CardVariant, React.CSSProperties> = {
    default: {
      background: theme.color.surfaceContainer,
      border: `1px solid ${theme.color.borderSubtle}`,
      boxShadow: "none",
    },
    flat: {
      background: theme.color.surfaceContainerLow,
      border: "none",
      boxShadow: "none",
    },
  };

  return (
    <div
      style={{
        borderRadius: theme.radius.xl,
        padding: theme.spacing[padding],
        transition: "background 0.15s",
        ...variantStyles[variant],
        ...style,
      }}
      {...props}
    />
  );
}
