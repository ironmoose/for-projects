import { type TextareaHTMLAttributes, useState } from "react";
import { useTheme } from "../theme/ThemeContext";
import { FieldWrapper, baseFieldStyle, useFieldFocusStyles } from "./fieldUtils";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function Textarea({ label, style, id, onFocus, onBlur, ...props }: TextareaProps) {
  const { theme } = useTheme();
  useFieldFocusStyles();
  const [focused, setFocused] = useState(false);
  const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  const glowFocusStyles: React.CSSProperties = focused
    ? { borderColor: theme.glow.borderStrong, boxShadow: theme.glow.focusRing }
    : theme.glow.animated
      ? { borderColor: theme.glow.borderSubtle, boxShadow: theme.glow.focusRingSubtle }
      : {};

  return (
    <FieldWrapper label={label} htmlFor={textareaId}>
      <textarea
        className="tfp-field"
        id={textareaId}
        rows={3}
        onFocus={(e) => { setFocused(true); onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); onBlur?.(e); }}
        style={{
          ...baseFieldStyle(theme),
          resize: "vertical",
          ...glowFocusStyles,
          ...style,
        }}
        {...props}
      />
    </FieldWrapper>
  );
}
