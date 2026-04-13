import { useEffect, useState } from "react";
import { semantic as t } from "@4lt7ab/ui/core";
import { Icon } from "../atoms/Icon";

interface DisconnectionBannerProps {
  connected: boolean;
}

const DISCONNECT_THRESHOLD_MS = 10_000;

export function DisconnectionBanner({ connected }: DisconnectionBannerProps) {
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
