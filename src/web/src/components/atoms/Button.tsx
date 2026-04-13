import { type ButtonHTMLAttributes, useState } from "react";
import { semantic as t } from "@4lt7ab/ui/core";
import { useTheme } from "../theme/ThemeContext";

type ButtonVariant = "primary" | "ghost" | "danger" | "icon";
type ButtonSize = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

function getVariantStyles(
  glow: { animated: boolean; borderMedium: string; borderSubtle: string; borderStrong: string },
  borderColor: string,
): Record<ButtonVariant, React.CSSProperties> {
  return {
    primary: {
      background: t.colorActionPrimary,
      color: t.colorTextInverse,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: glow.animated ? glow.borderMedium : t.colorActionPrimary,
      boxShadow: glow.animated
        ? `0 0 12px ${glow.borderMedium}, inset 0 0 12px ${glow.borderSubtle}`
        : "none",
    },
    ghost: {
      background: "transparent",
      color: t.colorTextMuted,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: glow.animated ? glow.borderMedium : borderColor,
    },
    danger: {
      background: "transparent",
      color: t.colorActionDestructive,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: `${t.colorActionDestructive}`,
      opacity: 0.7,
      boxShadow: glow.animated ? `0 0 8px ${t.colorActionDestructive}` : "none",
    },
    icon: {
      background: "transparent",
      color: t.colorTextMuted,
      border: "none",
      padding: "6px",
      borderRadius: t.radiusFull,
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
    sm: { padding: `0.25rem 0.625rem`, fontSize: t.fontSizeSm },
    md: { padding: `0.5rem 1rem`, fontSize: t.fontSizeSm },
  };

  const isDisabled = disabled || loading;

  // Glow hover effects are synth-theme-specific; use legacy glow tokens
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
        borderRadius: t.radiusLg,
        cursor: isDisabled ? "not-allowed" : "pointer",
        fontFamily: t.fontSans,
        fontWeight: 600,
        letterSpacing: "0.01em",
        transition: "background 0.15s, opacity 0.15s, border-color 0.15s, filter 0.15s, box-shadow 0.2s",
        opacity: isDisabled ? 0.6 : 1,
        ...getVariantStyles(theme.glow, theme.color.borderSubtle)[variant],
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
            borderRadius: t.radiusFull,
            animation: "spin 0.6s linear infinite",
          }}
        />
      ) : (
        children
      )}
    </button>
  );
}
