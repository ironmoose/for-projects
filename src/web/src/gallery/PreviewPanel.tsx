import { ThemeProvider, themes } from "../components";
import { viewerTheme as vt } from "./viewerTheme";

interface PreviewPanelProps {
  children: (themeName: string) => React.ReactNode;
}

export function PreviewPanel({ children }: PreviewPanelProps) {
  const themeNames = Object.keys(themes);

  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
      {themeNames.map((name) => (
        <div
          key={name}
          style={{
            flex: "1 1 240px",
            minWidth: 240,
            borderRadius: 8,
            border: `1px solid ${vt.border}`,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              ...vt.sectionHeader,
              padding: "6px 12px",
              fontSize: 10,
              background: vt.surfaceHigh,
              borderBottom: `1px solid ${vt.border}`,
            }}
          >
            {themes[name]?.label ?? name}
          </div>
          <ThemeProvider forcedTheme={name} isolated>
            <div
              style={{
                padding: 16,
                background: themes[name]?.color.surface,
                minHeight: 60,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {children(name)}
            </div>
          </ThemeProvider>
        </div>
      ))}
    </div>
  );
}
