import { useTheme } from "../theme/ThemeContext";
import { Button } from "../atoms/Button";
import { Icon } from "../atoms/Icon";

interface BackButtonProps {
  onClick: () => void;
  label?: string;
  style?: React.CSSProperties;
}

export function BackButton({ onClick, label = "Back", style }: BackButtonProps) {
  const { theme } = useTheme();

  return (
    <Button variant="ghost" onClick={onClick} style={style}>
      <span style={{ display: "flex", alignItems: "center", gap: theme.spacing.xs }}>
        <Icon name="arrow_back" size={16} /> {label}
      </span>
    </Button>
  );
}
