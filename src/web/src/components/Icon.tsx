import { type HTMLAttributes } from "react";

interface IconProps extends HTMLAttributes<HTMLSpanElement> {
  name: string;
  size?: number;
}

export function Icon({ name, size = 24, style, ...props }: IconProps) {
  return (
    <span
      className="material-symbols-outlined"
      style={{
        fontSize: size,
        lineHeight: 1,
        ...style,
      }}
      {...props}
    >
      {name}
    </span>
  );
}
