import { useEffect, useRef, useState } from "react";
import { semantic as t } from "@4lt7ab/ui/core";
import { useReducedMotion } from "../../hooks/useReducedMotion";

/** CSS color-mix helper for alpha-blending semantic tokens with transparency. */
function alpha(token: string, pct: number): string {
  return `color-mix(in srgb, ${token} ${pct}%, transparent)`;
}

interface ActivityIndicatorProps {
  count: number;
  style?: React.CSSProperties;
}

export function ActivityIndicator({ count, style }: ActivityIndicatorProps) {
  const reduced = useReducedMotion();
  const prevCount = useRef(count);
  const [bumping, setBumping] = useState(false);

  useEffect(() => {
    if (prevCount.current !== count && count > 0 && !reduced) {
      setBumping(true);
      const timer = setTimeout(() => setBumping(false), 300);
      prevCount.current = count;
      return () => clearTimeout(timer);
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
        borderRadius: t.radiusFull,
        background: isActive ? alpha(t.colorActionPrimary, 15) : t.colorSurfaceRaised,
        color: isActive ? t.colorActionPrimary : t.colorTextSecondary,
        fontFamily: t.fontMono,
        fontSize: t.fontSizeXs,
        fontWeight: 700,
        lineHeight: 1,
        flexShrink: 0,
        transition: "background 200ms, color 200ms",
        ...(bumping ? { animation: "scale-bump 300ms cubic-bezier(0.34, 1.56, 0.64, 1)" } : {}),
        ...style,
      }}
    >
      {display}
    </span>
  );
}
