import { type SelectHTMLAttributes, useState } from "react";
import { useTheme } from "../theme/ThemeContext";
import { FieldWrapper, baseFieldStyle, useFieldFocusStyles } from "./fieldUtils";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
}

export function Select({ options, style, onFocus, onBlur, ...props }: SelectProps) {
  const { theme } = useTheme();
  useFieldFocusStyles();
  const [focused, setFocused] = useState(false);

  const glowFocusStyles: React.CSSProperties = focused
    ? { borderColor: theme.glow.borderStrong, boxShadow: theme.glow.focusRing }
    : theme.glow.animated
      ? { borderColor: theme.glow.borderSubtle, boxShadow: theme.glow.focusRingSubtle }
      : {};

  return (
    <FieldWrapper>
      <select
        className="tfp-field"
        onFocus={(e) => { setFocused(true); onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); onBlur?.(e); }}
        style={{
          ...baseFieldStyle(),
          cursor: "pointer",
          ...glowFocusStyles,
          ...style,
        }}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </FieldWrapper>
  );
}
