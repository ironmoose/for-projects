import { type HTMLAttributes } from "react";
import { type Theme } from "./theme";
import { useTheme } from "./ThemeContext";

interface StackProps extends HTMLAttributes<HTMLDivElement> {
  direction?: "row" | "column";
  gap?: keyof Theme["spacing"];
  align?: React.CSSProperties["alignItems"];
  justify?: React.CSSProperties["justifyContent"];
  wrap?: boolean;
}

export function Stack({
  direction = "column",
  gap = "md",
  align,
  justify,
  wrap,
  style,
  ...props
}: StackProps) {
  const { theme } = useTheme();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: direction,
        gap: theme.spacing[gap],
        alignItems: align,
        justifyContent: justify,
        flexWrap: wrap ? "wrap" : undefined,
        ...style,
      }}
      {...props}
    />
  );
}
