import type { Theme } from "../theme/theme";
import { useTheme } from "../theme/ThemeContext";

interface FieldWrapperProps {
  label?: string;
  htmlFor?: string;
  children: React.ReactNode;
}

export function FieldWrapper({ label, htmlFor, children }: FieldWrapperProps) {
  const { theme } = useTheme();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.xs }}>
      {label && (
        <label
          htmlFor={htmlFor}
          style={{
            fontSize: theme.font.size.xs,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase" as const,
            color: theme.color.textFaint,
            fontFamily: theme.font.body,
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
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    border: `1px solid ${theme.color.borderSubtle}`,
    borderRadius: theme.radius.lg,
    fontFamily: theme.font.body,
    fontSize: theme.font.size.sm,
    outline: "none",
    background: theme.color.surfaceContainerHigh,
    color: theme.color.text,
    transition: "border-color 0.15s, box-shadow 0.2s",
  };
}
