import { semantic as t } from "@4lt7ab/ui/core";
import { Button } from "@4lt7ab/ui/ui";
import { Icon } from "../atoms/Icon";

interface BackButtonProps {
  onClick: () => void;
  label?: string;
  style?: React.CSSProperties;
}

export function BackButton({ onClick, label = "Back", style }: BackButtonProps) {
  return (
    <Button variant="ghost" onClick={onClick} style={style}>
      <span style={{ display: "flex", alignItems: "center", gap: t.spaceXs }}>
        <Icon name="arrow_back" size={16} /> {label}
      </span>
    </Button>
  );
}
