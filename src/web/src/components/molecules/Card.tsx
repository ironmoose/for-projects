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
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: theme.glow.borderLight,
      boxShadow: theme.glow.shadowMd,
    },
    flat: {
      background: theme.color.surfaceContainerLow,
      borderWidth: theme.glow.animated ? 1 : 0,
      borderStyle: theme.glow.animated ? "solid" : "none",
      borderColor: theme.glow.borderSubtle,
      boxShadow: "none",
    },
    live: {
      background: theme.color.surfaceContainer,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: theme.glow.borderMedium,
      ["--border-pulse-color" as string]: `${theme.color.primary}66`,
      ["--border-pulse-dim" as string]: `${theme.color.primary}1a`,
      animation: `border-pulse 2s ease-in-out infinite`,
      boxShadow: theme.glow.animated ? `0 0 15px ${theme.glow.borderLight}` : "none",
    },
    elevated: {
      background: theme.color.surfaceContainer,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: theme.glow.borderLight,
      boxShadow: theme.shadow.md,
    },
  };

  const baseBorderColor = variantStyles[variant].borderColor as string;
  const hoverStyles: React.CSSProperties = hover
    ? hovered
      ? theme.glow.animated
        ? { boxShadow: theme.glow.hoverShadow, borderColor: theme.glow.borderMedium }
        : { boxShadow: theme.shadow.md, borderColor: theme.color.border }
      : { borderColor: baseBorderColor }
    : {};

  return (
    <div
      style={{
        borderRadius: theme.radius.xl,
        padding: theme.spacing[padding],
        transition: "background 0.15s, box-shadow 0.25s, border-color 0.2s",
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
