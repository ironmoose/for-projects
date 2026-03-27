interface OverlayProps {
  onClick?: () => void;
  zIndex?: number;
  style?: React.CSSProperties;
}

export function Overlay({ onClick, zIndex = 100, style }: OverlayProps) {
  return (
    <div
      onClick={onClick}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        zIndex,
        ...style,
      }}
    />
  );
}
