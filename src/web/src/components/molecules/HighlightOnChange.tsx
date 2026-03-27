import { useEffect, useRef, useState } from "react";
import { useTheme } from "../theme/ThemeContext";
import { useReducedMotion } from "../../hooks/useReducedMotion";

interface HighlightOnChangeProps {
  trackValue: string | number;
  children: React.ReactNode;
  duration?: number;
  style?: React.CSSProperties;
}

export function HighlightOnChange({ trackValue, children, duration = 600, style }: HighlightOnChangeProps) {
  const { theme } = useTheme();
  const reduced = useReducedMotion();
  const prevValue = useRef(trackValue);
  const [flashing, setFlashing] = useState(false);

  useEffect(() => {
    if (prevValue.current !== trackValue && !reduced) {
      setFlashing(true);
      const t = setTimeout(() => setFlashing(false), duration);
      prevValue.current = trackValue;
      return () => clearTimeout(t);
    }
    prevValue.current = trackValue;
  }, [trackValue, duration, reduced]);

  return (
    <div
      style={{
        ...style,
        ...(flashing ? {
          animation: `highlight-flash ${duration}ms ease-out`,
          ["--activity-flash" as string]: theme.color.activityFlash,
        } : {}),
      }}
    >
      {children}
    </div>
  );
}
