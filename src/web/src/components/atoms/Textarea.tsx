import { type TextareaHTMLAttributes, useState } from "react";
import { useTheme } from "../theme/ThemeContext";
import { sg } from "../theme/synthGlow";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function Textarea({ label, style, id, onFocus, onBlur, ...props }: TextareaProps) {
  const { theme, themeName } = useTheme();
  const isSynth = themeName === "synth";
  const [focused, setFocused] = useState(false);
  const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  const synthFocusStyles: React.CSSProperties =
    isSynth && focused
      ? { borderColor: sg(53), boxShadow: `0 0 12px ${sg(19)}, inset 0 0 6px ${sg(5)}` }
      : isSynth
        ? { borderColor: sg(14), boxShadow: `0 0 4px ${sg(6)}` }
        : {};

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
        onFocus={(e) => { setFocused(true); onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); onBlur?.(e); }}
        style={{
          padding: `${theme.spacing.sm} ${theme.spacing.md}`,
          border: `1px solid ${theme.color.borderSubtle}`,
          borderRadius: theme.radius.lg,
          fontFamily: theme.font.body,
          fontSize: theme.font.size.sm,
          outline: "none",
          background: theme.color.surfaceContainerHigh,
          color: theme.color.text,
          transition: "border-color 0.15s, box-shadow 0.2s",
          resize: "vertical",
          ...synthFocusStyles,
          ...style,
        }}
        {...props}
      />
    </div>
  );
}
