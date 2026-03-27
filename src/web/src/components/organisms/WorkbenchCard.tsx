import { useTheme } from "../theme/ThemeContext";
import { Card } from "../molecules/Card";
import { Icon } from "../atoms/Icon";
import type { Workbench } from "../../types";

interface WorkbenchCardProps {
  workbench: Workbench;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function WorkbenchCard({ workbench: wb, onClick, style }: WorkbenchCardProps) {
  const { theme } = useTheme();
  const date = new Date(wb.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div onClick={onClick} style={{ cursor: onClick ? "pointer" : undefined, ...style }}>
      <Card
        variant="default"
        padding="lg"
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          boxSizing: "border-box",
          transition: "box-shadow 0.2s",
        }}
      >
        <Icon name="construction" size={18} style={{ color: theme.color.primary, marginBottom: theme.spacing.sm }} />
        <h3
          style={{
            margin: 0,
            fontFamily: theme.font.headline,
            fontSize: theme.font.size.lg,
            fontWeight: 700,
            color: theme.color.text,
            marginBottom: theme.spacing.xs,
            lineHeight: theme.font.lineHeight.normal,
          }}
        >
          {wb.goal}
        </h3>
        <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span
            style={{
              fontSize: "0.6rem",
              fontFamily: theme.font.mono,
              color: theme.color.textFaint,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "60%",
            }}
          >
            {wb.id}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: theme.font.size.xxs, fontWeight: 500, color: theme.color.textFaint }}>
            <Icon name="calendar_today" size={12} />
            {date}
          </span>
        </div>
      </Card>
    </div>
  );
}
