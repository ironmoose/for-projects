import { viewerTheme as vt } from "./viewerTheme";
import { getComponents, type ComponentEntry } from "./registry";

interface GalleryIndexProps {
  onSelect: (name: string) => void;
}

export function GalleryIndex({ onSelect }: GalleryIndexProps) {
  const components = getComponents();
  const categories = ["atom", "molecule", "organism", "template"] as const;

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      {categories.map((cat) => {
        const items = components.filter((c) => c.category === cat);
        if (items.length === 0) return null;
        return (
          <div key={cat} style={{ marginBottom: 32 }}>
            <h2
              style={{
                ...vt.sectionHeader,
                color: vt.accent,
                marginBottom: 12,
              }}
            >
              {cat}s ({items.length})
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
              {items.map((entry) => (
                <button
                  key={entry.name}
                  onClick={() => onSelect(entry.name)}
                  style={{
                    textAlign: "left",
                    padding: 16,
                    background: vt.surface,
                    border: `1px solid ${vt.border}`,
                    borderRadius: 8,
                    cursor: "pointer",
                    transition: "border-color 0.15s",
                    color: vt.text,
                    fontFamily: vt.font,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = vt.accent)}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = vt.border)}
                >
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                    {entry.name}
                    {entry.migrated && (
                      <span title="Migrated to @4lt7ab/ui tokens" style={{ fontSize: 11, opacity: 0.8 }}>&#x2705;</span>
                    )}
                    {entry.libraryCandidate && (
                      <span title="Candidate for @4lt7ab/ui library" style={{ fontSize: 11, opacity: 0.8 }}>&#x1F4E6;</span>
                    )}
                    {entry.deprecated && (
                      <span title={`Deprecated: ${entry.deprecated}`} style={{ fontSize: 11, opacity: 0.8 }}>&#x26A0;&#xFE0F;</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: vt.textMuted, lineHeight: 1.4 }}>{entry.description}</div>
                </button>
              ))}
            </div>
          </div>
        );
      })}
      {components.length === 0 && (
        <p style={{ color: vt.textMuted, fontSize: 14, textAlign: "center", padding: 40 }}>
          No components registered yet.
        </p>
      )}
    </div>
  );
}
