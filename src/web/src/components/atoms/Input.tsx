import { type InputHTMLAttributes } from "react";
import { useTheme } from "../theme/ThemeContext";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, style, id, ...props }: InputProps) {
  const { theme } = useTheme();
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.xs }}>
      {label && (
        <label
          htmlFor={inputId}
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
      <input
        id={inputId}
        style={{
          padding: `${theme.spacing.sm} ${theme.spacing.md}`,
          border: `1px solid ${theme.color.borderSubtle}`,
          borderRadius: theme.radius.lg,
          fontFamily: theme.font.body,
          fontSize: theme.font.size.md,
          outline: "none",
          background: theme.color.surfaceContainerHigh,
          color: theme.color.text,
          transition: "border-color 0.15s",
          ...style,
        }}
        {...props}
      />
    </div>
  );
}
