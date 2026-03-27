import { type ButtonHTMLAttributes } from "react";
import { useTheme } from "../theme/ThemeContext";
import { Icon } from "./Icon";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string;
  size?: number;
  badge?: boolean;
}

export function IconButton({ icon, size = 24, badge, style, ...props }: IconButtonProps) {
  const { theme } = useTheme();

  return (
    <button
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 36,
        height: 36,
        borderRadius: theme.radius.full,
        border: "none",
        background: "transparent",
        color: theme.color.textMuted,
        cursor: "pointer",
        transition: "background 0.15s, color 0.15s",
        ...style,
      }}
      {...props}
    >
      <Icon name={icon} size={size} />
      {badge && (
        <span
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            width: 8,
            height: 8,
            borderRadius: theme.radius.full,
            background: theme.color.danger,
            border: `2px solid ${theme.color.surface}`,
          }}
        />
      )}
    </button>
  );
}
