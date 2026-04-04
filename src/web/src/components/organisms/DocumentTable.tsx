import { IconButton } from "../atoms/IconButton";
import { TagChip } from "../molecules/TagChip";
import { PresenceCharm } from "../molecules/PresenceCharm";
import { useTheme } from "../theme/ThemeContext";
import type { DocumentSummary } from "../../types";
import { formatDate } from "../../utils";

function cellStyle(theme: ReturnType<typeof useTheme>["theme"]): React.CSSProperties {
  return {
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    borderBottom: `1px solid ${theme.color.border}`,
    verticalAlign: "middle",
  };
}

interface DocumentTableProps {
  documents: DocumentSummary[];
  selectedDocumentId: string | null;
  onSelectDocument: (id: string) => void;
  onDeleteDocument: (doc: DocumentSummary) => void;
  onToggleFavorite: (doc: DocumentSummary) => void;
}

export function DocumentTable({ documents, selectedDocumentId, onSelectDocument, onDeleteDocument, onToggleFavorite }: DocumentTableProps) {
  const { theme } = useTheme();

  return (
    <div
      style={{
        overflowX: "auto",
        borderRadius: theme.radius.lg,
        border: `1px solid ${theme.glow.animated ? theme.glow.borderMedium : theme.color.border}`,
        background: theme.color.surface,
        boxShadow: theme.glow.animated ? theme.glow.shadowLg : "none",
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: theme.font.size.sm,
          color: theme.color.text,
        }}
      >
        <thead>
          <tr>
            {[{ key: "_fav", label: "" }, { key: "title", label: "Title" }, { key: "tags", label: "Tags" }, { key: "updated", label: "Updated" }, { key: "_actions", label: "" }].map(({ key, label: h }) => (
              <th
                key={key}
                style={{
                  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                  textAlign: "left",
                  fontWeight: 600,
                  fontSize: theme.font.size.xxs,
                  color: theme.glow.animated ? theme.glow.accentColor : theme.color.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: theme.font.letterSpacing.wide,
                  borderBottom: `2px solid ${theme.glow.animated ? theme.glow.borderMedium : theme.color.border}`,
                  whiteSpace: "nowrap",
                  textShadow: theme.glow.textShadow,
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => (
            <tr
              key={doc.id}
              onClick={() => onSelectDocument(doc.id)}
              style={{
                cursor: "pointer",
                background: selectedDocumentId === doc.id ? theme.color.surfaceContainerHigh : undefined,
                transition: "background 0.1s",
              }}
            >
              <td style={{ ...cellStyle(theme), width: 32 }}>
                <IconButton
                  icon={doc.favorite ? "star" : "star_border"}
                  size={16}
                  onClick={(e) => { e.stopPropagation(); onToggleFavorite(doc); }}
                  aria-label={doc.favorite ? "Remove from favorites" : "Add to favorites"}
                  style={{ color: doc.favorite ? theme.color.warning : theme.color.textFaint }}
                />
              </td>
              <td style={{ ...cellStyle(theme), fontWeight: 500, maxWidth: 400 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {doc.title}
                  </span>
                  <PresenceCharm active={doc.has_content} label="Content" color={theme.color.success} />
                </div>
              </td>
              <td style={cellStyle(theme)}>
                {doc.tags.length > 0 ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                    {doc.tags.slice(0, 3).map((tag) => (
                      <TagChip key={tag} name={tag} />
                    ))}
                    {doc.tags.length > 3 && (
                      <span style={{ fontSize: theme.font.size.xxs, color: theme.color.textFaint }}>
                        +{doc.tags.length - 3}
                      </span>
                    )}
                  </div>
                ) : (
                  <span style={{ color: theme.color.textFaint }}>--</span>
                )}
              </td>
              <td
                style={{
                  ...cellStyle(theme),
                  fontSize: theme.font.size.xs,
                  color: theme.color.textMuted,
                  whiteSpace: "nowrap",
                }}
              >
                {formatDate(doc.updated_at)}
              </td>
              <td style={{ ...cellStyle(theme), width: 32 }}>
                <IconButton
                  icon="delete"
                  size={14}
                  onClick={(e) => { e.stopPropagation(); onDeleteDocument(doc); }}
                  aria-label="Delete document"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
