import { useTheme } from "../theme/ThemeContext";
import { useWindowWidth, SMALL_BREAKPOINT } from "../../hooks/useWindowWidth";
import { Overlay } from "../atoms/Overlay";

interface SidePanelLayoutProps {
  children: React.ReactNode;
  onClose: () => void;
  style?: React.CSSProperties;
}

export function SidePanelLayout({ children, onClose, style }: SidePanelLayoutProps) {
  const { theme } = useTheme();
  const windowWidth = useWindowWidth();
  const isSmall = windowWidth < SMALL_BREAKPOINT;

  const panel = (
    <div
      style={{
        ...(isSmall
          ? { position: "fixed" as const, inset: 0, zIndex: 101 }
          : { flex: "1 0 400px", maxWidth: 640, alignSelf: "stretch" }),
        borderLeft: isSmall ? undefined : `1px solid ${theme.color.borderSubtle}`,
        background: isSmall ? theme.color.surface : theme.color.surfaceContainerLow,
        display: "flex",
        flexDirection: "column" as const,
        overflow: "hidden",
        ...style,
      }}
    >
      {children}
    </div>
  );

  if (isSmall) {
    return (
      <>
        <Overlay onClick={onClose} />
        {panel}
      </>
    );
  }

  return panel;
}
