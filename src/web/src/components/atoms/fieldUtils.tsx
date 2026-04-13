import { semantic as t, useInjectStyles } from "@4lt7ab/ui/core";

/** Inject shared focus ring styles for form fields. Call once per component that uses baseFieldStyle. */
export function useFieldFocusStyles(): void {
  useInjectStyles("tfp-field-focus", `
    .tfp-field:focus-visible {
      outline: 2px solid var(--focus-ring-color);
      outline-offset: 2px;
    }
  `);
}

interface FieldWrapperProps {
  label?: string;
  htmlFor?: string;
  children: React.ReactNode;
}

export function FieldWrapper({ label, htmlFor, children }: FieldWrapperProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
      {label && (
        <label
          htmlFor={htmlFor}
          style={{
            fontSize: t.fontSizeXs,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase" as const,
            color: t.colorTextSecondary,
            fontFamily: t.fontSans,
          }}
        >
          {label}
        </label>
      )}
      {children}
    </div>
  );
}

export function baseFieldStyle(): React.CSSProperties {
  return {
    padding: "0.5rem 0.75rem",
    border: `1px solid color-mix(in srgb, ${t.colorBorder} 50%, transparent)`,
    borderRadius: t.radiusLg,
    fontFamily: t.fontSans,
    fontSize: t.fontSizeSm,
    outline: "none",
    background: t.colorSurfaceRaised,
    color: t.colorText,
    transition: "border-color 0.15s, box-shadow 0.2s",
  };
}
