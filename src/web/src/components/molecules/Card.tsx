import { type HTMLAttributes, useState } from "react";
import { type Theme } from "../theme/theme";
import { useTheme } from "../theme/ThemeContext";

type CardVariant = "default" | "flat" | "live" | "elevated";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: keyof Theme["spacing"];
  variant?: CardVariant;
  hover?: boolean;
}

export function Card({ padding = "lg", variant = "default", hover, style, ...props }: CardProps) {
  const { theme } = useTheme();
  const [hovered, setHovered] = useState(false);

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
    live: {
      background: theme.color.surfaceContainer,
      border: `1px solid ${theme.color.primary}33`,
      ["--border-pulse-color" as string]: `${theme.color.primary}66`,
      ["--border-pulse-dim" as string]: `${theme.color.primary}1a`,
      animation: `border-pulse 2s ease-in-out infinite`,
    },
    elevated: {
      background: theme.color.surfaceContainer,
      border: `1px solid ${theme.color.borderSubtle}`,
      boxShadow: theme.shadow.md,
    },
  };

  const hoverStyles: React.CSSProperties =
    hover && hovered
      ? { boxShadow: theme.shadow.md, borderColor: theme.color.border }
      : {};

  return (
    <div
      style={{
        borderRadius: theme.radius.xl,
        padding: theme.spacing[padding],
        transition: "background 0.15s, box-shadow 0.15s, border-color 0.15s",
        ...variantStyles[variant],
        ...hoverStyles,
        ...style,
      }}
      onMouseEnter={hover ? () => setHovered(true) : undefined}
      onMouseLeave={hover ? () => setHovered(false) : undefined}
      {...props}
    />
  );
}
