import { type InputHTMLAttributes, useState } from "react";
import { useTheme } from "../theme/ThemeContext";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, style, id, onFocus, onBlur, ...props }: InputProps) {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  const glowStyles: React.CSSProperties = {
    borderColor: focused ? theme.glow.borderStrong : theme.glow.borderLight,
    boxShadow: focused ? theme.glow.focusRing : theme.glow.focusRingSubtle,
  };

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
          ...glowStyles,
          ...style,
        }}
        {...props}
      />
    </div>
  );
}
