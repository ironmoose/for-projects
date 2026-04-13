import { useState } from "react";
import { viewerTheme as vt } from "./viewerTheme";
import type { ComponentEntry } from "./registry";
import { PropsPlayground } from "./PropsPlayground";
import { PreviewPanel } from "./PreviewPanel";
import { CodeSnippet } from "./CodeSnippet";

interface GalleryComponentViewProps {
  entry: ComponentEntry;
  onBack: () => void;
}

export function GalleryComponentView({ entry, onBack }: GalleryComponentViewProps) {
  const initialValues: Record<string, unknown> = {};
  for (const pd of entry.propDefs) {
    initialValues[pd.name] = pd.defaultValue;
  }
  const [values, setValues] = useState(initialValues);

  function handleChange(name: string, value: unknown) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      {/* Back */}
      <button
        onClick={onBack}
        style={{
          background: "transparent",
          border: "none",
          color: vt.accent,
          cursor: "pointer",
          fontSize: 13,
          fontFamily: vt.font,
          padding: "4px 0",
          marginBottom: 16,
        }}
      >
        &larr; Back to Gallery
      </button>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <span
          style={{
            display: "inline-block",
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: vt.accent,
            background: vt.accentMuted,
            borderRadius: 4,
            padding: "2px 6px",
            marginBottom: 8,
          }}
        >
          {entry.category}
        </span>
        <h1 style={{ margin: "8px 0 4px", color: vt.text, fontSize: 24, fontFamily: vt.font, display: "flex", alignItems: "center", gap: 8 }}>
          {entry.name}
          {entry.migrated && (
            <span title="Migrated to @4lt7ab/ui tokens" style={{ fontSize: 16 }}>&#x2705;</span>
          )}
          {entry.libraryCandidate && (
            <span title="Candidate for @4lt7ab/ui library" style={{ fontSize: 16 }}>&#x1F4E6;</span>
          )}
        </h1>
        <p style={{ margin: 0, color: vt.textMuted, fontSize: 14 }}>{entry.description}</p>
        {entry.deprecated && (
          <div style={{ fontSize: 13, color: vt.textMuted, marginTop: 4, padding: "4px 8px", background: "rgba(255,180,0,0.1)", borderRadius: 4 }}>
            &#x26A0;&#xFE0F; <strong>Deprecated:</strong> {entry.deprecated}
          </div>
        )}
      </div>

      {/* Multi-theme preview */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ ...vt.sectionHeader, marginBottom: 12 }}>
          Preview (all themes)
        </h3>
        <PreviewPanel>
          {() => entry.render(values)}
        </PreviewPanel>
      </div>

      {/* Props playground */}
      {entry.propDefs.length > 0 && (
        <div
          style={{
            marginBottom: 24,
            background: vt.surface,
            border: `1px solid ${vt.border}`,
            borderRadius: 8,
          }}
        >
          <PropsPlayground propDefs={entry.propDefs} values={values} onChange={handleChange} />
        </div>
      )}

      {/* Variants */}
      {entry.variants && entry.variants.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ ...vt.sectionHeader, marginBottom: 12 }}>
            Variants
          </h3>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {entry.variants.map((v) => (
              <div
                key={v.name}
                style={{
                  padding: 12,
                  background: vt.surface,
                  border: `1px solid ${vt.border}`,
                  borderRadius: 8,
                  minWidth: 120,
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 600, color: vt.textMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {v.name}
                </div>
                <PreviewPanel>
                  {() => entry.render({ ...values, ...v.props })}
                </PreviewPanel>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Code template */}
      {entry.codeTemplate && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ ...vt.sectionHeader, marginBottom: 12 }}>
            Usage
          </h3>
          <CodeSnippet code={entry.codeTemplate} />
        </div>
      )}
    </div>
  );
}
