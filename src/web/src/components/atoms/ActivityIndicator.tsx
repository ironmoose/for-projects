import { useEffect, useRef, useState } from "react";
import { useTheme } from "../theme/ThemeContext";
import { useReducedMotion } from "../../hooks/useReducedMotion";

interface ActivityIndicatorProps {
  count: number;
  style?: React.CSSProperties;
}

export function ActivityIndicator({ count, style }: ActivityIndicatorProps) {
  const { theme } = useTheme();
  const reduced = useReducedMotion();
  const prevCount = useRef(count);
  const [bumping, setBumping] = useState(false);

  useEffect(() => {
    if (prevCount.current !== count && count > 0 && !reduced) {
      setBumping(true);
      const t = setTimeout(() => setBumping(false), 300);
      prevCount.current = count;
      return () => clearTimeout(t);
    }
    prevCount.current = count;
  }, [count, reduced]);

  const display = count > 99 ? "99+" : String(count);
  const isActive = count > 0;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 20,
        height: 20,
        borderRadius: theme.radius.full,
        background: isActive ? `${theme.color.primary}26` : theme.color.surfaceContainerHigh,
        color: isActive ? theme.color.primary : theme.color.textFaint,
        fontFamily: theme.font.mono,
        fontSize: theme.font.size.xxs,
        fontWeight: 700,
        lineHeight: 1,
        flexShrink: 0,
        transition: "background 200ms, color 200ms",
        ...(bumping ? { animation: `scale-bump 300ms ${theme.animation.easing.spring}` } : {}),
        ...style,
      }}
    >
      {display}
    </span>
  );
}
