import { type ButtonHTMLAttributes, useState } from "react";
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
      borderColor: theme.glow.borderStrong !== theme.color.border ? theme.glow.borderMedium : theme.color.primaryContainer,
      boxShadow: theme.glow.animated
        ? `0 0 12px ${theme.glow.borderMedium}, inset 0 0 12px ${theme.glow.borderSubtle}`
        : "none",
    },
    ghost: {
      background: "transparent",
      color: theme.color.textMuted,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: theme.glow.borderMedium !== theme.color.border ? theme.glow.borderMedium : theme.color.borderSubtle,
    },
    danger: {
      background: "transparent",
      color: theme.color.danger,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: `${theme.color.danger}44`,
      boxShadow: theme.glow.animated ? `0 0 8px ${theme.color.danger}22` : "none",
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
  const [hovered, setHovered] = useState(false);

  const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
    sm: { padding: "0.25rem 0.625rem", fontSize: theme.font.size.sm },
    md: { padding: "0.5rem 1rem", fontSize: theme.font.size.sm },
  };

  const isDisabled = disabled || loading;

  const hoverGlow: React.CSSProperties =
    hovered && !isDisabled && variant === "primary" && theme.glow.animated
      ? { boxShadow: `0 0 20px ${theme.glow.borderMedium}, 0 0 40px ${theme.glow.borderLight}, inset 0 0 15px ${theme.glow.borderSubtle}`, borderColor: theme.glow.borderStrong }
      : hovered && !isDisabled && variant === "ghost" && theme.glow.animated
        ? { borderColor: theme.glow.borderMedium, boxShadow: `0 0 10px ${theme.glow.borderLight}` }
        : hovered && !isDisabled && variant === "danger" && theme.glow.animated
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
        ...getVariantStyles(theme)[variant],
        ...(variant !== "icon" ? sizeStyles[size] : {}),
        ...hoverGlow,
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
