import { type TextareaHTMLAttributes } from "react";
import { useTheme } from "../theme/ThemeContext";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function Textarea({ label, style, id, ...props }: TextareaProps) {
  const { theme } = useTheme();
  const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.xs }}>
      {label && (
        <label
          htmlFor={textareaId}
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
      <textarea
        id={textareaId}
        rows={3}
        style={{
          padding: `${theme.spacing.sm} ${theme.spacing.md}`,
          border: `1px solid ${theme.color.borderSubtle}`,
          borderRadius: theme.radius.lg,
          fontFamily: theme.font.body,
          fontSize: theme.font.size.sm,
          outline: "none",
          background: theme.color.surfaceContainerHigh,
          color: theme.color.text,
          transition: "border-color 0.15s",
          resize: "vertical",
          ...style,
        }}
        {...props}
      />
    </div>
  );
}
