import { viewerTheme as vt } from "./viewerTheme";

interface GalleryLayoutProps {
  children: React.ReactNode;
}

export function GalleryLayout({ children }: GalleryLayoutProps) {
  return (
    <div
      style={{
        flex: 1,
        width: "100%",
        background: vt.bg,
        color: vt.text,
        fontFamily: vt.font,
        minHeight: "100vh",
      }}
    >
      {/* Gallery header */}
      <div
        style={{
          padding: "16px 24px",
          borderBottom: `1px solid ${vt.border}`,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: vt.accent,
          }}
        >
          Component Gallery
        </span>
        <span style={{ fontSize: 12, color: vt.textMuted }}>
          Browse all UI components with multi-theme previews
        </span>
      </div>

      {/* Content */}
      {children}
    </div>
  );
}
