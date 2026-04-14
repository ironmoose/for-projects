import { useEffect, useState } from "react";
import { semantic as t, useInjectStyles } from "@4lt7ab/ui/core";

const SLIDE_IN_CSS = `@keyframes slide-in-left { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: translateX(0); } }`;
import { Icon } from "@4lt7ab/ui/ui";

interface DisconnectionBannerProps {
  connected: boolean;
}

const DISCONNECT_THRESHOLD_MS = 10_000;

export function DisconnectionBanner({ connected }: DisconnectionBannerProps) {
  useInjectStyles("tfp-slide-in", SLIDE_IN_CSS);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (connected) {
      setShowBanner(false);
      return;
    }

    const timer = setTimeout(() => {
      setShowBanner(true);
    }, DISCONNECT_THRESHOLD_MS);

    return () => clearTimeout(timer);
  }, [connected]);

  if (!showBanner) return null;

  return (
    <div
      style={{
        width: "100%",
        background: t.colorActionDestructive,
        color: "#fff",
        padding: `${t.spaceXs} ${t.spaceMd}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: t.spaceSm,
        fontSize: t.fontSizeSm,
        fontWeight: 500,
        animation: "slide-in-left 0.3s ease-out",
        zIndex: 50,
      }}
    >
      <Icon name="wifi_off" size={16} />
      Connection lost. Attempting to reconnect...
    </div>
  );
}
