import { useEffect, useRef, useState } from "react";
import { useTheme } from "../theme/ThemeContext";
import { useReducedMotion } from "../../hooks/useReducedMotion";

interface ConnectionStatusProps {
  connected: boolean;
  style?: React.CSSProperties;
}

export function ConnectionStatus({ connected, style }: ConnectionStatusProps) {
  const { theme } = useTheme();
  const reduced = useReducedMotion();
  const prevConnected = useRef(connected);
  const [ripple, setRipple] = useState(false);

  useEffect(() => {
    // Ripple on reconnect success
    if (!prevConnected.current && connected && !reduced) {
      setRipple(true);
      const t = setTimeout(() => setRipple(false), 600);
      return () => clearTimeout(t);
    }
    prevConnected.current = connected;
  }, [connected, reduced]);

  const isPulsing = !connected && !reduced;

  return (
    <span
      title={connected ? "Live updates active" : "Reconnecting..."}
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: theme.radius.full,
        background: connected ? theme.color.success : theme.color.textFaint,
        transition: `background ${theme.motion.normal} ${theme.motion.easing}`,
        animation: isPulsing ? `pulse-alive ${theme.animation.duration.pulse} ease-in-out infinite` :
                   ripple ? "ripple-out 0.6s ease-out" : undefined,
        color: theme.color.success,
        ...style,
      }}
    />
  );
}
