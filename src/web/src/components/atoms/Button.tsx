import { type ButtonHTMLAttributes, useState } from "react";
import { type Theme } from "../theme/theme";
import { useTheme } from "../theme/ThemeContext";
import { sg } from "../theme/synthGlow";

type ButtonVariant = "primary" | "ghost" | "danger" | "icon";
type ButtonSize = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

function getVariantStyles(theme: Theme, isSynth: boolean): Record<ButtonVariant, React.CSSProperties> {
  return {
    primary: {
      background: theme.color.primaryContainer,
      color: theme.color.onPrimaryContainer,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: isSynth ? sg(40) : theme.color.primaryContainer,
      ...(isSynth ? { boxShadow: `0 0 12px ${sg(20)}, inset 0 0 12px ${sg(7)}` } : {}),
    },
    ghost: {
      background: "transparent",
      color: theme.color.textMuted,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: isSynth ? sg(20) : theme.color.borderSubtle,
    },
    danger: {
      background: "transparent",
      color: theme.color.danger,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: `${theme.color.danger}44`,
      ...(isSynth ? { boxShadow: `0 0 8px ${theme.color.danger}22` } : {}),
    },
    icon: {
      background: "transparent",
      color: theme.color.textMuted,
      border: "none",
      padding: "6px",
      borderRadius: theme.radius.full,
    },
  };
}

export function Button({
  variant = "primary",
  size = "md",
  loading,
  style,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const { theme, themeName } = useTheme();
  const isSynth = themeName === "synth";
  const [hovered, setHovered] = useState(false);

  const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
    sm: { padding: "0.25rem 0.625rem", fontSize: theme.font.size.sm },
    md: { padding: "0.5rem 1rem", fontSize: theme.font.size.sm },
  };

  const isDisabled = disabled || loading;

  const synthHoverGlow: React.CSSProperties =
    isSynth && hovered && !isDisabled && variant === "primary"
      ? { boxShadow: `0 0 20px ${sg(33)}, 0 0 40px ${sg(14)}, inset 0 0 15px ${sg(9)}`, borderColor: sg(67) }
      : isSynth && hovered && !isDisabled && variant === "ghost"
        ? { borderColor: sg(40), boxShadow: `0 0 10px ${sg(14)}` }
        : isSynth && hovered && !isDisabled && variant === "danger"
          ? { boxShadow: `0 0 16px ${theme.color.danger}33`, borderColor: `${theme.color.danger}66` }
          : {};

  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: theme.radius.lg,
        cursor: isDisabled ? "not-allowed" : "pointer",
        fontFamily: theme.font.body,
        fontWeight: 600,
        letterSpacing: "0.01em",
        transition: "background 0.15s, opacity 0.15s, border-color 0.15s, filter 0.15s, box-shadow 0.2s",
        opacity: isDisabled ? 0.6 : 1,
        ...getVariantStyles(theme, isSynth)[variant],
        ...(variant !== "icon" ? sizeStyles[size] : {}),
        ...synthHoverGlow,
        ...style,
      }}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <span
          style={{
            display: "inline-block",
            width: 14,
            height: 14,
            border: `2px solid currentColor`,
            borderTopColor: "transparent",
            borderRadius: theme.radius.full,
            animation: "spin 0.6s linear infinite",
          }}
        />
      ) : (
        children
      )}
    </button>
  );
}
