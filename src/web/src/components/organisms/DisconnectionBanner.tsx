import { useEffect, useState } from "react";
import { useTheme } from "../theme/ThemeContext";
import { Icon } from "../atoms/Icon";

interface DisconnectionBannerProps {
  connected: boolean;
}

const DISCONNECT_THRESHOLD_MS = 10_000;

export function DisconnectionBanner({ connected }: DisconnectionBannerProps) {
  const { theme } = useTheme();
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
        background: theme.color.danger,
        color: "#fff",
        padding: `${theme.spacing.xs} ${theme.spacing.md}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: theme.spacing.sm,
        fontSize: theme.font.size.sm,
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
