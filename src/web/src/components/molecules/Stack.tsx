import { type HTMLAttributes } from "react";
import { semantic as t } from "@4lt7ab/ui/core";

type SpacingKey = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

const SPACE_MAP: Record<SpacingKey, string> = {
  xs: t.spaceXs, sm: t.spaceSm, md: t.spaceMd,
  lg: t.spaceLg, xl: t.spaceXl, "2xl": t.space2xl,
};

interface StackProps extends HTMLAttributes<HTMLDivElement> {
  direction?: "row" | "column";
  gap?: SpacingKey;
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
  return (
    <div
      style={{
        display: "flex",
        flexDirection: direction,
        gap: SPACE_MAP[gap],
        alignItems: align,
        justifyContent: justify,
        flexWrap: wrap ? "wrap" : undefined,
        ...style,
      }}
      {...props}
    />
  );
}
