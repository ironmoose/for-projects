import { type TextareaHTMLAttributes, useState } from "react";
import { useTheme } from "../theme/ThemeContext";
import { sg } from "../theme/synthGlow";
import { FieldWrapper, baseFieldStyle } from "./fieldUtils";

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
    <FieldWrapper label={label} htmlFor={textareaId}>
      <textarea
        id={textareaId}
        rows={3}
        onFocus={(e) => { setFocused(true); onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); onBlur?.(e); }}
        style={{
          ...baseFieldStyle(theme),
          resize: "vertical",
          ...synthFocusStyles,
          ...style,
        }}
        {...props}
      />
    </FieldWrapper>
  );
}
