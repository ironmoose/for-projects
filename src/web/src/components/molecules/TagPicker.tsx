import { useTheme } from "../theme/ThemeContext";
import { sg } from "../theme/synthGlow";
import { SectionLabel } from "../atoms/SectionLabel";
import { TAG_CATEGORIES } from "../../types";
import type { TagName } from "../../types";

interface TagPickerProps {
  selected: TagName[];
  onChange: (tags: TagName[]) => void;
  style?: React.CSSProperties;
}

export function TagPicker({ selected, onChange, style }: TagPickerProps) {
  const { theme, themeName } = useTheme();
  const isSynth = themeName === "synth";

  function toggle(tag: TagName) {
    if (selected.includes(tag)) {
      onChange(selected.filter((t) => t !== tag));
    } else {
      onChange([...selected, tag]);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.md,
        ...style,
      }}
    >
      {Object.entries(TAG_CATEGORIES).map(([category, tags]) => (
        <div key={category} style={{ display: "flex", flexDirection: "column", gap: theme.spacing.xs }}>
          <SectionLabel>{category}</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: theme.spacing.xs }}>
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
                    fontSize: theme.font.size.xs,
                    fontFamily: theme.font.body,
                    color: isSelected
                      ? (isSynth ? "var(--synth-glow)" : theme.color.primary)
                      : theme.color.textMuted,
                    background: isSelected
                      ? theme.color.surfaceContainerHigh
                      : "transparent",
                    borderRadius: theme.radius.full,
                    padding: "2px 10px",
                    cursor: "pointer",
                    border: isSelected
                      ? `1px solid ${isSynth ? sg(40) : theme.color.primary}`
                      : `1px solid ${theme.color.borderSubtle}`,
                    transition: "all 0.15s ease",
                    ...(isSynth && isSelected
                      ? { boxShadow: `0 0 6px ${sg(14)}` }
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
