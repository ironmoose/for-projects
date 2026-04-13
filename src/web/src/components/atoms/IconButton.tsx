import { type ButtonHTMLAttributes } from "react";
import { semantic as t } from "@4lt7ab/ui/core";
import { Icon } from "./Icon";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string;
  size?: number;
  badge?: boolean;
}

export function IconButton({ icon, size = 24, badge, style, ...props }: IconButtonProps) {
  return (
    <button
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 36,
        height: 36,
        borderRadius: t.radiusFull,
        border: "none",
        background: "transparent",
        color: t.colorTextMuted,
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
            borderRadius: t.radiusFull,
            background: t.colorActionDestructive,
            border: `2px solid ${t.colorSurface}`,
          }}
        />
      )}
    </button>
  );
}
