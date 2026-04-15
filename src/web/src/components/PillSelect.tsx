/**
 * PillSelect — compact pill-shaped <select> for filter bars.
 *
 * Shared across pages (Tasks, Knowledge Base, Project Detail) wherever
 * filters appear as a horizontal row of pill-shaped dropdowns. Active state
 * highlights with the primary action color; inactive state is muted.
 *
 * If `active` is not provided, it's derived from whether `value` is non-empty.
 */

import { semantic as t } from "@4lt7ab/ui/core";
import { Icon } from "@4lt7ab/ui/ui";

export interface PillSelectOption {
  value: string;
  label: string;
}

export interface PillSelectProps {
  value: string;
  options: PillSelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  /** Explicitly control the active (highlighted) state. Defaults to `!!value`. */
  active?: boolean;
}

export function PillSelect({
  value,
  options,
  onChange,
  ariaLabel,
  active,
}: PillSelectProps) {
  const isActive = active ?? !!value;

  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        style={{
          appearance: "none",
          padding: `6px ${t.spaceXl} 6px ${t.spaceMd}`,
          borderRadius: t.radiusFull,
          border: `1px solid ${isActive ? t.colorActionPrimary : `color-mix(in srgb, ${t.colorBorder} 60%, transparent)`}`,
          background: isActive
            ? `color-mix(in srgb, ${t.colorActionPrimary} 8%, transparent)`
            : "transparent",
          color: isActive ? t.colorActionPrimary : t.colorTextMuted,
          fontSize: t.fontSizeSm,
          fontFamily: t.fontSans,
          fontWeight: 600,
          cursor: "pointer",
          outline: "none",
          minHeight: 32,
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Icon
        name="expand_more"
        size={14}
        style={{
          position: "absolute",
          right: 10,
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
          color: isActive ? t.colorActionPrimary : t.colorTextMuted,
        }}
      />
    </div>
  );
}
