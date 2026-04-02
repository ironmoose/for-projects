import { useTheme } from "../theme/ThemeContext";
import { Card } from "./Card";
import { TagChip } from "./TagChip";
import { PresenceCharm } from "./PresenceCharm";
import { IconButton } from "../atoms/IconButton";
import type { DocumentSummary } from "../../types";
import { formatDate } from "../../utils";

interface DocumentListItemProps {
  document: DocumentSummary;
  onClick: () => void;
  onDelete: () => void;
}

export function DocumentListItem({ document, onClick, onDelete }: DocumentListItemProps) {
  const { theme } = useTheme();

  return (
    <Card
      hover
      variant="default"
      padding="lg"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      style={{
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.md,
      }}
    >
      <span
        style={{
          fontSize: theme.font.size.sm,
          fontWeight: 600,
          color: theme.color.text,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {document.title}
      </span>

      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <PresenceCharm active={document.has_content} label="Content" color={theme.color.success} />
        {document.tags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginLeft: 4 }}>
            {document.tags.slice(0, 4).map((tag) => (
              <TagChip key={tag} name={tag} />
            ))}
            {document.tags.length > 4 && (
              <span style={{ fontSize: theme.font.size.xs, color: theme.color.textFaint }}>
                +{document.tags.length - 4}
              </span>
            )}
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: "auto",
          fontSize: theme.font.size.xxs,
          color: theme.color.textFaint,
        }}
      >
        <span style={{ fontFamily: theme.font.mono }}>
          {formatDate(document.updated_at)}
        </span>

        <IconButton
          icon="delete"
          size={16}
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          aria-label="Delete document"
          style={{ flexShrink: 0 }}
        />
      </div>
    </Card>
  );
}
