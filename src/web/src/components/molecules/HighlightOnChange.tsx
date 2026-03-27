import { useEffect, useRef, useState } from "react";
import { useTheme } from "../theme/ThemeContext";
import { useReducedMotion } from "../../hooks/useReducedMotion";

interface HighlightOnChangeProps {
  trackValue: string | number;
  children: React.ReactNode;
  duration?: number;
  effect?: "flash" | "glow" | "border";
  color?: string;
  style?: React.CSSProperties;
}

export function HighlightOnChange({
  trackValue,
  children,
  duration = 600,
  effect = "flash",
  color,
  style,
}: HighlightOnChangeProps) {
  const { theme } = useTheme();
  const reduced = useReducedMotion();
  const prevValue = useRef(trackValue);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (prevValue.current !== trackValue && !reduced) {
      setActive(true);
      const t = setTimeout(() => setActive(false), duration);
      prevValue.current = trackValue;
      return () => clearTimeout(t);
    }
    prevValue.current = trackValue;
  }, [trackValue, duration, reduced]);

  const effectColor = color ?? theme.color.activityFlash;
  const primaryColor = color ?? theme.color.primary;

  function getEffectStyles(): React.CSSProperties {
    if (!active) return {};

    switch (effect) {
      case "flash":
        return {
          animation: `highlight-flash ${duration}ms ease-out`,
          ["--activity-flash" as string]: effectColor,
        };
      case "glow":
        return {
          animation: `glow-pulse ${duration}ms ease-in-out`,
          ["--glow-color" as string]: effectColor,
        };
      case "border":
        return {
          border: `1px solid ${primaryColor}`,
          transition: `border-color ${duration}ms ease-out`,
        };
      default:
        return {};
    }
  }

  return (
    <div
      style={{
        ...style,
        ...getEffectStyles(),
      }}
    >
      {children}
    </div>
  );
}
