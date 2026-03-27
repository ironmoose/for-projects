import { useTheme } from "../theme/ThemeContext";
import { Card } from "../molecules/Card";
import { Badge } from "../atoms/Badge";
import { Icon } from "../atoms/Icon";
import type { Project } from "../../types";

interface ProjectCardProps {
  project: Project;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function ProjectCard({ project: p, onClick, style }: ProjectCardProps) {
  const { theme } = useTheme();
  const isCompleted = p.status === "completed";
  const date = new Date(p.updated_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

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
          borderLeft: isCompleted ? `3px solid ${theme.color.primary}` : undefined,
          transition: "box-shadow 0.2s",
        }}
      >
        <div style={{ marginBottom: theme.spacing.md }}>
          <Badge variant={p.status}>{p.status}</Badge>
        </div>

        <h3
          style={{
            margin: 0,
            fontFamily: theme.font.headline,
            fontSize: theme.font.size.lg,
            fontWeight: 700,
            color: theme.color.text,
            marginBottom: theme.spacing.xs,
          }}
        >
          {p.name}
        </h3>
        {p.description && (
          <p
            style={{
              margin: `0 0 ${theme.spacing.lg}`,
              fontSize: theme.font.size.xs,
              color: theme.color.textMuted,
              lineHeight: theme.font.lineHeight.normal,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {p.description}
          </p>
        )}

        <div style={{ marginTop: "auto", display: "flex", justifyContent: "flex-end" }}>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: theme.font.size.xxs,
              fontWeight: 500,
              color: theme.color.textFaint,
            }}
          >
            <Icon name="calendar_today" size={12} />
            {date}
          </span>
        </div>
      </Card>
    </div>
  );
}
