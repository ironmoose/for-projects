import { semantic as t } from "@4lt7ab/ui/core";
import { useTheme } from "../theme/ThemeContext";
import { IconButton } from "../atoms/IconButton";

interface TagChipProps {
  name: string;
  prefix?: string | null;
  onRemove?: () => void;
  style?: React.CSSProperties;
}

export function TagChip({ name, prefix, onRemove, style }: TagChipProps) {
  const { theme } = useTheme();

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: t.fontSizeXs,
        color: theme.glow.accentColor || t.colorActionPrimary,
        background: t.colorSurfaceRaised,
        borderRadius: t.radiusFull,
        padding: "2px 8px",
        ...(theme.glow.animated ? {
          border: `1px solid ${theme.glow.borderMedium}`,
          boxShadow: `0 0 6px ${theme.glow.borderLight}`,
        } : {}),
        ...style,
      }}
    >
      {prefix ? (
        <>
          <span style={{ color: t.colorTextSecondary, fontWeight: 600 }}>{prefix}:</span>
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
