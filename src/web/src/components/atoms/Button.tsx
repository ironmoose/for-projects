import { type ButtonHTMLAttributes } from "react";
import { type Theme } from "../theme/theme";
import { useTheme } from "../theme/ThemeContext";

type ButtonVariant = "primary" | "ghost" | "danger" | "icon";
type ButtonSize = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

function getVariantStyles(theme: Theme): Record<ButtonVariant, React.CSSProperties> {
  return {
    primary: {
      background: theme.color.primaryContainer,
      color: theme.color.onPrimaryContainer,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: theme.color.primaryContainer,
    },
    ghost: {
      background: "transparent",
      color: theme.color.textMuted,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: theme.color.borderSubtle,
    },
    danger: {
      background: "transparent",
      color: theme.color.danger,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: `${theme.color.danger}44`,
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
  const { theme } = useTheme();

  const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
    sm: { padding: "0.25rem 0.625rem", fontSize: theme.font.size.sm },
    md: { padding: "0.5rem 1rem", fontSize: theme.font.size.sm },
  };

  const isDisabled = disabled || loading;

  return (
    <button
      style={{
        borderRadius: theme.radius.lg,
        cursor: isDisabled ? "not-allowed" : "pointer",
        fontFamily: theme.font.body,
        fontWeight: 600,
        letterSpacing: "0.01em",
        transition: "background 0.15s, opacity 0.15s, border-color 0.15s, filter 0.15s",
        opacity: isDisabled ? 0.6 : 1,
        ...getVariantStyles(theme)[variant],
        ...(variant !== "icon" ? sizeStyles[size] : {}),
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
