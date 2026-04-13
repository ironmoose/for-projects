import { semantic as t } from "@4lt7ab/ui/core";

export interface PresenceCharmProps {
  active: boolean;
  label: string;
  color?: string;
}

export function PresenceCharm({ active, label, color }: PresenceCharmProps) {
  const fill = active ? (color ?? t.colorActionPrimary) : `color-mix(in srgb, ${t.colorBorder} 50%, transparent)`;

  return (
    <span
      title={label}
      aria-label={`${label}: ${active ? "present" : "empty"}`}
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: fill,
        opacity: active ? 1 : 0.3,
        transition: "background 150ms ease, opacity 150ms ease",
      }}
    />
  );
}
