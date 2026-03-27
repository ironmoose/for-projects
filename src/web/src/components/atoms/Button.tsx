import { type ButtonHTMLAttributes } from "react";
import { type Theme } from "../theme/theme";
import { useTheme } from "../theme/ThemeContext";

type ButtonVariant = "primary" | "ghost";
type ButtonSize = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

function getVariantStyles(theme: Theme): Record<ButtonVariant, React.CSSProperties> {
  return {
    primary: {
      background: `linear-gradient(135deg, ${theme.color.primaryContainer}, ${theme.color.primary})`,
      color: theme.color.onPrimary,
      border: "none",
      boxShadow: theme.shadow.sm,
    },
    ghost: {
      background: "transparent",
      color: theme.color.textMuted,
      border: "1px solid transparent",
    },
  };
}

export function Button({
  variant = "primary",
  size = "md",
  style,
  ...props
}: ButtonProps) {
  const { theme } = useTheme();

  const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
    sm: { padding: "0.25rem 0.625rem", fontSize: theme.font.size.sm },
    md: { padding: "0.5rem 1rem", fontSize: theme.font.size.md },
  };

  return (
    <button
      style={{
        borderRadius: theme.radius.lg,
        cursor: "pointer",
        fontFamily: theme.font.body,
        fontWeight: 500,
        letterSpacing: "0.01em",
        transition: "background 0.15s, opacity 0.15s",
        ...getVariantStyles(theme)[variant],
        ...sizeStyles[size],
        ...style,
      }}
      {...props}
    />
  );
}
