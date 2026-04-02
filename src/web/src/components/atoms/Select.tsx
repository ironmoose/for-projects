import { type SelectHTMLAttributes, useState } from "react";
import { useTheme } from "../theme/ThemeContext";
import { sg } from "../theme/synthGlow";

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
    <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.xs }}>
      <select
        onFocus={(e) => { setFocused(true); onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); onBlur?.(e); }}
        style={{
          padding: `${theme.spacing.sm} ${theme.spacing.md}`,
          border: `1px solid ${theme.color.borderSubtle}`,
          borderRadius: theme.radius.lg,
          fontFamily: theme.font.body,
          fontSize: theme.font.size.sm,
          background: theme.color.surfaceContainerHigh,
          color: theme.color.text,
          cursor: "pointer",
          transition: "border-color 0.15s, box-shadow 0.2s",
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
    </div>
  );
}
