import { useState, type HTMLAttributes, type ReactNode } from "react";
import { useTheme } from "../theme/ThemeContext";
import type { Theme } from "../theme/theme";

interface TileProps extends HTMLAttributes<HTMLDivElement> {
  selected?: boolean;
  children: ReactNode;
}

export function Tile({ selected, children, style, ...props }: TileProps) {
  const { theme } = useTheme();
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...tileBaseStyle(theme),
        ...(hovered ? tileHoverStyle(theme) : {}),
        ...(selected ? tileSelectedStyle(theme) : {}),
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

function tileBaseStyle(theme: Theme): React.CSSProperties {
  return {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing.xs,
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    borderRadius: theme.radius.lg,
    border: `1px solid ${theme.glow.borderSubtle}`,
    background: theme.color.surfaceContainer,
    cursor: "pointer",
    transition: "background 0.15s, border-color 0.2s, box-shadow 0.25s",
    overflow: "hidden",
  };
}

function tileHoverStyle(theme: Theme): React.CSSProperties {
  return theme.glow.animated
    ? {
        borderColor: theme.glow.borderMedium,
        boxShadow: theme.glow.shadowSm,
        background: theme.color.surfaceContainerHigh,
      }
    : {
        borderColor: theme.color.border,
        boxShadow: theme.shadow.sm,
        background: theme.color.surfaceContainerHigh,
      };
}

function tileSelectedStyle(theme: Theme): React.CSSProperties {
  return theme.glow.animated
    ? {
        borderColor: theme.glow.borderStrong,
        boxShadow: theme.glow.shadowMd,
        background: theme.color.surfaceContainerHigh,
      }
    : {
        borderColor: theme.color.primary,
        boxShadow: theme.shadow.sm,
        background: theme.color.surfaceContainerHigh,
      };
}
