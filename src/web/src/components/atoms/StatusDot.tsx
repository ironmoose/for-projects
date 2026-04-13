import { semantic as t } from "@4lt7ab/ui/core";
import { useTheme } from "../theme/ThemeContext";
import { useReducedMotion } from "../../hooks/useReducedMotion";

interface StatusDotProps {
  color: string;
  size?: number;
  animate?: "pulse" | "none";
  glowColor?: string;
  style?: React.CSSProperties;
}

export function StatusDot({ color, size = 8, animate = "none", glowColor, style }: StatusDotProps) {
  const { theme } = useTheme();
  const reduced = useReducedMotion();

  const shouldAnimate = animate === "pulse" && !reduced;

  const animationStyle: React.CSSProperties = shouldAnimate
    ? {
        animation: `pulse-alive ${theme.animation.duration.pulse} ease-in-out infinite`,
        ...(glowColor
          ? {
              ["--glow-color" as string]: glowColor,
              boxShadow: `0 0 6px 1px ${glowColor}`,
            }
          : {}),
      }
    : {};

  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: t.radiusFull,
        background: color,
        flexShrink: 0,
        transition: `background ${theme.motion.normal} ${theme.motion.easing}`,
        ...animationStyle,
        ...style,
      }}
    />
  );
}
