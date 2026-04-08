import { viewerTheme as vt } from "./viewerTheme";
import type { PropDef } from "./registry";

interface PropsPlaygroundProps {
  propDefs: PropDef[];
  values: Record<string, unknown>;
  onChange: (name: string, value: unknown) => void;
}

export function PropsPlayground({ propDefs, values, onChange }: PropsPlaygroundProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12 }}>
      <div style={{ ...vt.sectionHeader }}>
        Props
      </div>
      {propDefs.map((def) => (
        <div key={def.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label style={{ fontSize: 12, color: vt.text, minWidth: 80, fontFamily: vt.mono }}>{def.name}</label>
          {def.type === "string" && (
            <input
              value={String(values[def.name] ?? def.defaultValue)}
              onChange={(e) => onChange(def.name, e.target.value)}
              style={{
                flex: 1,
                padding: "4px 8px",
                fontSize: 12,
                fontFamily: vt.mono,
                background: vt.surfaceHigh,
                border: `1px solid ${vt.border}`,
                borderRadius: 4,
                color: vt.text,
                outline: "none",
              }}
            />
          )}
          {def.type === "number" && (
            <input
              type="number"
              value={Number(values[def.name] ?? def.defaultValue)}
              onChange={(e) => onChange(def.name, Number(e.target.value))}
              style={{
                flex: 1,
                padding: "4px 8px",
                fontSize: 12,
                fontFamily: vt.mono,
                background: vt.surfaceHigh,
                border: `1px solid ${vt.border}`,
                borderRadius: 4,
                color: vt.text,
                outline: "none",
              }}
            />
          )}
          {def.type === "enum" && (
            <select
              value={String(values[def.name] ?? def.defaultValue)}
              onChange={(e) => onChange(def.name, e.target.value)}
              style={{
                flex: 1,
                padding: "4px 8px",
                fontSize: 12,
                fontFamily: vt.mono,
                background: vt.surfaceHigh,
                border: `1px solid ${vt.border}`,
                borderRadius: 4,
                color: vt.text,
              }}
            >
              {def.options?.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          )}
          {def.type === "boolean" && (
            <input
              type="checkbox"
              checked={Boolean(values[def.name] ?? def.defaultValue)}
              onChange={(e) => onChange(def.name, e.target.checked)}
              style={{ accentColor: vt.accent }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
