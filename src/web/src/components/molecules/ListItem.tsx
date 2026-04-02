import { useTheme } from "../theme/ThemeContext";
import { sg } from "../theme/synthGlow";

interface ListItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  selected?: boolean;
  accentColor?: string;
  highlighted?: boolean;
  style?: React.CSSProperties;
}

export function ListItem({ children, onClick, selected, accentColor, highlighted, style }: ListItemProps) {
  const { theme, themeName } = useTheme();
  const isSynth = themeName === "synth";

  return (
    <div
      onClick={onClick}
      style={{
        background: selected ? theme.color.surfaceContainerHigh : theme.color.surfaceContainer,
        borderRadius: theme.radius.lg,
        padding: `${theme.spacing.sm} ${theme.spacing.md}`,
        cursor: onClick ? "pointer" : undefined,
        transition: `background ${theme.motion.fast}, border-color ${theme.motion.fast}, box-shadow 0.2s`,
        ...(accentColor ? { borderLeft: `3px solid ${accentColor}` } : {}),
        ...(highlighted ? { animation: `highlight-flash 600ms ease-out` } : {}),
        ...(isSynth && selected ? { boxShadow: `0 0 10px ${sg(12)}` } : {}),
        ...(isSynth ? { border: `1px solid ${selected ? sg(20) : "transparent"}` } : {}),
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!selected && onClick) e.currentTarget.style.background = theme.color.surfaceContainerHigh;
      }}
      onMouseLeave={(e) => {
        if (!selected && onClick) e.currentTarget.style.background = theme.color.surfaceContainer;
      }}
    >
      {children}
    </div>
  );
}
