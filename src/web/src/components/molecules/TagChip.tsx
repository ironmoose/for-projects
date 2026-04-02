import { useTheme } from "../theme/ThemeContext";
import { sg } from "../theme/synthGlow";
import { IconButton } from "../atoms/IconButton";

interface TagChipProps {
  name: string;
  prefix?: string | null;
  onRemove?: () => void;
  style?: React.CSSProperties;
}

export function TagChip({ name, prefix, onRemove, style }: TagChipProps) {
  const { theme, themeName } = useTheme();
  const isSynth = themeName === "synth";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: theme.font.size.xs,
        color: isSynth ? "var(--synth-glow)" : theme.color.primary,
        background: theme.color.surfaceContainerHigh,
        borderRadius: theme.radius.full,
        padding: "2px 8px",
        ...(isSynth ? {
          border: `1px solid ${sg(27)}`,
          boxShadow: `0 0 6px ${sg(14)}`,
        } : {}),
        ...style,
      }}
    >
      {prefix ? (
        <>
          <span style={{ color: theme.color.textFaint, fontWeight: 600 }}>{prefix}:</span>
          {name.slice(prefix.length + 1)}
        </>
      ) : (
        name
      )}
      {onRemove && (
        <IconButton
          icon="close"
          size={12}
          onClick={onRemove}
          aria-label={`Remove tag ${name}`}
          style={{ width: 16, height: 16, minWidth: 16 }}
        />
      )}
    </span>
  );
}
