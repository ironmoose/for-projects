import { semantic as t } from "@4lt7ab/ui/core";
import type { Theme } from "../theme/theme";

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

export function baseFieldStyle(theme: Theme): React.CSSProperties {
  return {
    padding: "0.5rem 0.75rem",
    border: `1px solid ${theme.color.borderSubtle}`,
    borderRadius: t.radiusLg,
    fontFamily: t.fontSans,
    fontSize: t.fontSizeSm,
    outline: "none",
    background: t.colorSurfaceRaised,
    color: t.colorText,
    transition: "border-color 0.15s, box-shadow 0.2s",
  };
}
