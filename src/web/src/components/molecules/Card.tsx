import { type HTMLAttributes, useState } from "react";
import { type Theme } from "../theme/theme";
import { useTheme } from "../theme/ThemeContext";
import { sg } from "../theme/synthGlow";

type CardVariant = "default" | "flat" | "live" | "elevated";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: keyof Theme["spacing"];
  variant?: CardVariant;
  hover?: boolean;
}

export function Card({ padding = "lg", variant = "default", hover, style, ...props }: CardProps) {
  const { theme, themeName } = useTheme();
  const isSynth = themeName === "synth";
  const [hovered, setHovered] = useState(false);

  const variantStyles: Record<CardVariant, React.CSSProperties> = {
    default: {
      background: theme.color.surfaceContainer,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: isSynth ? sg(16) : theme.color.borderSubtle,
      boxShadow: isSynth ? `0 0 8px ${sg(8)}` : "none",
    },
    flat: {
      background: theme.color.surfaceContainerLow,
      borderWidth: isSynth ? 1 : 0,
      borderStyle: isSynth ? "solid" : "none",
      borderColor: isSynth ? sg(10) : "transparent",
      boxShadow: "none",
    },
    live: {
      background: theme.color.surfaceContainer,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: sg(20),
      ["--border-pulse-color" as string]: `${theme.color.primary}66`,
      ["--border-pulse-dim" as string]: `${theme.color.primary}1a`,
      animation: `border-pulse 2s ease-in-out infinite`,
      ...(isSynth ? { boxShadow: `0 0 15px ${sg(14)}` } : {}),
    },
    elevated: {
      background: theme.color.surfaceContainer,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: isSynth ? sg(16) : theme.color.borderSubtle,
      boxShadow: theme.shadow.md,
    },
  };

  const baseBorderColor = variantStyles[variant].borderColor as string;
  const hoverStyles: React.CSSProperties = hover
    ? hovered
      ? isSynth
        ? { boxShadow: `0 0 15px ${sg(15)}, 0 0 30px ${sg(6)}`, borderColor: sg(27) }
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
