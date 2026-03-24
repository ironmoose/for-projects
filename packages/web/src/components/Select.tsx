import { type SelectHTMLAttributes } from "react";
import { useTheme } from "./ThemeContext";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
}

export function Select({ options, style, ...props }: SelectProps) {
  const { theme } = useTheme();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.xs }}>
      <select
        style={{
          padding: `${theme.spacing.sm} ${theme.spacing.md}`,
          border: `1px solid ${theme.color.borderSubtle}`,
          borderRadius: theme.radius.lg,
          fontFamily: theme.font.body,
          fontSize: theme.font.size.sm,
          background: theme.color.surfaceContainerHigh,
          color: theme.color.text,
          cursor: "pointer",
          transition: "border-color 0.15s",
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
