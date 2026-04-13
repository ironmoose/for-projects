import { semantic as t } from "@4lt7ab/ui/core";
import { useTheme } from "../theme/ThemeContext";
import { SectionLabel } from "../atoms/SectionLabel";
import { TAG_CATEGORIES } from "../../types";
import type { TagName } from "../../types";

interface TagPickerProps {
  selected: TagName[];
  onChange: (tags: TagName[]) => void;
  style?: React.CSSProperties;
}

export function TagPicker({ selected, onChange, style }: TagPickerProps) {
  const { theme } = useTheme();

  function toggle(tag: TagName) {
    if (selected.includes(tag)) {
      onChange(selected.filter((v) => v !== tag));
    } else {
      onChange([...selected, tag]);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: t.spaceMd,
        ...style,
      }}
    >
      {Object.entries(TAG_CATEGORIES).map(([category, tags]) => (
        <div key={category} style={{ display: "flex", flexDirection: "column", gap: t.spaceXs }}>
          <SectionLabel>{category}</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: t.spaceXs }}>
            {tags.map((tag) => {
              const isSelected = selected.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggle(tag)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: t.fontSizeXs,
                    fontFamily: t.fontSans,
                    color: isSelected
                      ? (theme.glow.accentColor || t.colorActionPrimary)
                      : t.colorTextMuted,
                    background: isSelected
                      ? t.colorSurfaceRaised
                      : "transparent",
                    borderRadius: t.radiusFull,
                    padding: "2px 10px",
                    cursor: "pointer",
                    border: isSelected
                      ? `1px solid ${theme.glow.animated ? theme.glow.borderMedium : t.colorActionPrimary}`
                      : `1px solid color-mix(in srgb, ${t.colorBorder} 50%, transparent)`,
                    transition: "all 0.15s ease",
                    ...(theme.glow.animated && isSelected
                      ? { boxShadow: `0 0 6px ${theme.glow.borderLight}` }
                      : {}),
                  }}
                  aria-pressed={isSelected}
                  aria-label={`Tag: ${tag}`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
