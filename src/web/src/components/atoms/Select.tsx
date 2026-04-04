import { type SelectHTMLAttributes, useState } from "react";
import { useTheme } from "../theme/ThemeContext";
import { sg } from "../theme/synthGlow";
import { FieldWrapper, baseFieldStyle } from "./fieldUtils";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
}

export function Select({ options, style, onFocus, onBlur, ...props }: SelectProps) {
  const { theme, themeName } = useTheme();
  const isSynth = themeName === "synth";
  const [focused, setFocused] = useState(false);

  const synthStyles: React.CSSProperties =
    isSynth && focused
      ? { borderColor: sg(53), boxShadow: `0 0 12px ${sg(19)}` }
      : isSynth
        ? { borderColor: sg(14), boxShadow: `0 0 4px ${sg(6)}` }
        : {};

  return (
    <FieldWrapper>
      <select
        onFocus={(e) => { setFocused(true); onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); onBlur?.(e); }}
        style={{
          ...baseFieldStyle(theme),
          cursor: "pointer",
          ...synthStyles,
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
