/**
 * PageShell — standard page container with centered max-width layout.
 *
 * Every page uses the same wrapper: flex column, centered, capped width,
 * vertical overflow with hidden scrollbar. This component captures that
 * pattern so pages declare *content*, not *chrome*.
 */

import type { CSSProperties, ReactNode } from "react";
import { semantic as t } from "@4lt7ab/ui/core";

export interface PageShellProps {
  children: ReactNode;
  /** Max width of the content area (default 1100). */
  maxWidth?: number;
  /**
   * Gap between children.
   * "md" = spaceMd, "lg" = spaceLg (default "lg").
   */
  gap?: "md" | "lg";
  /**
   * Whether to include top padding.
   * true = spaceLg top padding, false = no top padding (default true).
   */
  topPadding?: boolean;
  /** Additional inline styles merged onto the container. */
  style?: CSSProperties;
}

export function PageShell({
  children,
  maxWidth = 1100,
  gap = "lg",
  topPadding = true,
  style,
}: PageShellProps) {
  return (
    <div
      style={{
        flex: 1,
        width: "100%",
        maxWidth,
        alignSelf: "center",
        display: "flex",
        flexDirection: "column",
        padding: `${topPadding ? t.spaceLg : 0} ${t.spaceXl} ${t.space2xl}`,
        boxSizing: "border-box",
        overflowY: "auto",
        scrollbarWidth: "none" as const,
        gap: gap === "md" ? t.spaceMd : t.spaceLg,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
