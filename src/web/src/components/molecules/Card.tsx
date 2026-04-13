import { type HTMLAttributes } from "react";
import { semantic as t, useInjectStyles } from "@4lt7ab/ui/core";
import { type Theme } from "../theme/theme";
import { useTheme } from "../theme/ThemeContext";

/** CSS color-mix helper for alpha-blending semantic tokens with transparency. */
function alpha(token: string, pct: number): string {
  return `color-mix(in srgb, ${token} ${pct}%, transparent)`;
}

type CardVariant = "default" | "flat" | "live" | "elevated";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: keyof Theme["spacing"];
  variant?: CardVariant;
  hover?: boolean;
}

export function Card({ padding = "lg", variant = "default", hover, style, className, ...props }: CardProps) {
  const { theme } = useTheme();

  useInjectStyles("tfp-card", `
    .tfp-card-hoverable:hover {
      box-shadow: var(--shadow-md);
      border-color: var(--color-border) !important;
    }
    .tfp-card:focus-visible,
    .tfp-card-hoverable:focus-visible {
      outline: 2px solid var(--focus-ring-color);
      outline-offset: 2px;
    }
    :root[data-synth] .tfp-card-hoverable:hover {
      box-shadow: 0 0 15px color-mix(in srgb, var(--synth-glow) 15%, transparent),
                  0 0 30px color-mix(in srgb, var(--synth-glow) 6%, transparent) !important;
      border-color: color-mix(in srgb, var(--synth-glow) 27%, transparent) !important;
    }
  `);

  const variantStyles: Record<CardVariant, React.CSSProperties> = {
    default: {
      background: t.colorSurface,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: theme.glow.borderLight,
      boxShadow: theme.glow.shadowMd,
    },
    flat: {
      background: t.colorSurfacePanel,
      borderWidth: theme.glow.animated ? 1 : 0,
      borderStyle: theme.glow.animated ? "solid" : "none",
      borderColor: theme.glow.borderSubtle,
      boxShadow: "none",
    },
    live: {
      background: t.colorSurface,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: theme.glow.borderMedium,
      ["--border-pulse-color" as string]: alpha(t.colorActionPrimary, 40),
      ["--border-pulse-dim" as string]: alpha(t.colorActionPrimary, 10),
      animation: `border-pulse 2s ease-in-out infinite`,
      boxShadow: theme.glow.animated ? `0 0 15px ${theme.glow.borderLight}` : "none",
    },
    elevated: {
      background: t.colorSurface,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: theme.glow.borderLight,
      boxShadow: t.shadowMd,
    },
  };

  const cardClassName = hover ? "tfp-card-hoverable" : "tfp-card";

  return (
    <div
      className={className ? `${cardClassName} ${className}` : cardClassName}
      style={{
        borderRadius: theme.radius.xl,
        padding: theme.spacing[padding],
        transition: "background 0.15s, box-shadow 0.25s, border-color 0.2s",
        ...variantStyles[variant],
        ...style,
      }}
      {...props}
    />
  );
}
