import { type ButtonHTMLAttributes } from "react";
import { semantic as t, useInjectStyles } from "@4lt7ab/ui/core";
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

const BUTTON_VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "tfp-btn tfp-btn-primary",
  ghost: "tfp-btn tfp-btn-ghost",
  danger: "tfp-btn tfp-btn-danger",
  icon: "tfp-btn tfp-btn-icon",
};

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

  useInjectStyles("tfp-btn", `
    .tfp-btn:focus-visible {
      outline: 2px solid var(--focus-ring-color);
      outline-offset: 2px;
    }
    .tfp-btn-primary:hover:not(:disabled) {
      filter: brightness(1.12);
    }
    .tfp-btn-ghost:hover:not(:disabled) {
      background: var(--color-surface-raised) !important;
    }
    .tfp-btn-danger:hover:not(:disabled) {
      opacity: 1 !important;
    }
    .tfp-btn-icon:hover:not(:disabled) {
      background: var(--color-surface-raised) !important;
    }
    :root[data-synth] .tfp-btn-primary:hover:not(:disabled) {
      filter: none;
      box-shadow: 0 0 20px color-mix(in srgb, var(--synth-glow) 27%, transparent),
                  0 0 40px color-mix(in srgb, var(--synth-glow) 16%, transparent),
                  inset 0 0 15px color-mix(in srgb, var(--synth-glow) 10%, transparent) !important;
      border-color: color-mix(in srgb, var(--synth-glow) 53%, transparent) !important;
    }
    :root[data-synth] .tfp-btn-ghost:hover:not(:disabled) {
      background: transparent !important;
      border-color: color-mix(in srgb, var(--synth-glow) 27%, transparent) !important;
      box-shadow: 0 0 10px color-mix(in srgb, var(--synth-glow) 16%, transparent) !important;
    }
    :root[data-synth] .tfp-btn-danger:hover:not(:disabled) {
      box-shadow: 0 0 16px color-mix(in srgb, var(--color-action-destructive) 20%, transparent) !important;
      border-color: color-mix(in srgb, var(--color-action-destructive) 40%, transparent) !important;
    }
  `);

  const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
    sm: { padding: `0.25rem 0.625rem`, fontSize: t.fontSizeSm },
    md: { padding: `0.5rem 1rem`, fontSize: t.fontSizeSm },
  };

  const isDisabled = disabled || loading;

  return (
    <button
      className={BUTTON_VARIANT_CLASSES[variant]}
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
