import { type InputHTMLAttributes, useState } from "react";
import { semantic as t } from "@4lt7ab/ui/core";
import { useTheme } from "../theme/ThemeContext";
import { FieldWrapper, baseFieldStyle, useFieldFocusStyles } from "./fieldUtils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, style, id, onFocus, onBlur, ...props }: InputProps) {
  const { theme } = useTheme();
  useFieldFocusStyles();
  const [focused, setFocused] = useState(false);
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  // Glow tokens resolve to animated synth values when synth is active,
  // and to static border/none for other themes (see noGlow in theme.ts).
  const glowFocusStyles: React.CSSProperties = focused
    ? { borderColor: theme.glow.borderStrong, boxShadow: theme.glow.focusRing }
    : theme.glow.animated
      ? { borderColor: theme.glow.borderSubtle, boxShadow: theme.glow.focusRingSubtle }
      : {};

  return (
    <FieldWrapper label={label} htmlFor={inputId}>
      <input
        className="tfp-field"
        id={inputId}
        onFocus={(e) => { setFocused(true); onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); onBlur?.(e); }}
        style={{
          ...baseFieldStyle(),
          ...glowFocusStyles,
          ...style,
        }}
        {...props}
      />
    </FieldWrapper>
  );
}
