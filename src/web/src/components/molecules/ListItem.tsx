import { useTheme } from "../theme/ThemeContext";

interface ListItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  selected?: boolean;
  style?: React.CSSProperties;
}

export function ListItem({ children, onClick, selected, style }: ListItemProps) {
  const { theme } = useTheme();

  return (
    <div
      onClick={onClick}
      style={{
        background: selected ? theme.color.surfaceContainerHigh : theme.color.surfaceContainer,
        borderRadius: theme.radius.lg,
        padding: `${theme.spacing.sm} ${theme.spacing.md}`,
        cursor: onClick ? "pointer" : undefined,
        transition: `background ${theme.motion.fast}`,
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
