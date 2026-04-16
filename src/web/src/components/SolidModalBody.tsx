/**
 * SolidModalBody — opaque, scrollable wrapper for ModalShell children.
 *
 * ModalShell (v0.2.26) hardcodes `background: colorSurface` on its panel.
 * In synth (canvas) theme, `colorSurface` is transparent, so modals become
 * unreadable. This wrapper forces `colorSurfaceSolid` and also reinstates
 * the `maxHeight` / `overflow` behavior that used to live on ModalShell's
 * now-removed `style` prop.
 *
 * Two layouts:
 * - `scroll` (default) — content scrolls within the modal as a whole.
 * - `pinned` — flex column with `overflow: hidden`; a header child uses
 *   `flexShrink: 0` and a body child uses `flex: 1; overflowY: auto` so
 *   the header stays fixed while the body scrolls.
 *
 * Negative margins cancel ModalShell's intrinsic `padding: spaceXl` so the
 * opaque fill reaches the rounded corners of the modal panel.
 */

import type { ReactNode } from "react";
import { semantic as t } from "@4lt7ab/ui/core";

export interface SolidModalBodyProps {
  /** Layout strategy. Default: `scroll`. */
  layout?: "scroll" | "pinned";
  /** Maximum height of the modal body. Default: `85vh`. */
  maxHeight?: string;
  children: ReactNode;
}

export function SolidModalBody({
  layout = "scroll",
  maxHeight = "85vh",
  children,
}: SolidModalBodyProps) {
  return (
    <div
      style={{
        margin: `calc(-1 * ${t.spaceXl})`,
        background: t.colorSurfaceSolid,
        borderRadius: t.radiusLg,
        maxHeight,
        ...(layout === "pinned"
          ? {
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }
          : { overflowY: "auto" }),
      }}
    >
      {children}
    </div>
  );
}
