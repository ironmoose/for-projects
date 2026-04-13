import { useEffect, useRef, useState } from "react";
import { semantic as t } from "@4lt7ab/ui/core";
import { useReducedMotion } from "../../hooks/useReducedMotion";

interface ConnectionStatusProps {
  connected: boolean;
  style?: React.CSSProperties;
}

export function ConnectionStatus({ connected, style }: ConnectionStatusProps) {
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
        borderRadius: t.radiusFull,
        background: connected ? t.colorSuccess : t.colorTextSecondary,
        transition: `background 0.2s ease`,
        animation: isPulsing ? `pulse-alive 2s ease-in-out infinite` :
                   ripple ? "ripple-out 0.6s ease-out" : undefined,
        color: t.colorSuccess,
        ...style,
      }}
    />
  );
}
