/**
 * MetaPill — tiny inline badge for metadata values (effort, impact, category, etc.).
 *
 * Shared across TasksPage and ProjectDetailPage wherever task metadata appears
 * in table cells, card footers, and detail modals.
 */

import type { ReactNode } from "react";
import { semantic as t } from "@4lt7ab/ui/core";

export function MetaPill({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        padding: `2px ${t.spaceSm}`,
        borderRadius: t.radiusSm,
        background: `color-mix(in srgb, ${t.colorBorder} 40%, transparent)`,
        fontSize: "0.65rem",
        fontFamily: t.fontMono,
        fontWeight: 500,
        color: t.colorTextMuted,
        letterSpacing: "0.02em",
      }}
    >
      {children}
    </span>
  );
}
