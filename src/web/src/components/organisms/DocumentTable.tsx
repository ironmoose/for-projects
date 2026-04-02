import { IconButton } from "../atoms/IconButton";
import { TagChip } from "../molecules/TagChip";
import { PresenceCharm } from "../molecules/PresenceCharm";
import { useTheme } from "../theme/ThemeContext";
import { sg } from "../theme/synthGlow";
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
}

export function DocumentTable({ documents, selectedDocumentId, onSelectDocument, onDeleteDocument }: DocumentTableProps) {
  const { theme, themeName } = useTheme();
  const isSynth = themeName === "synth";

  return (
    <div
      style={{
        overflowX: "auto",
        borderRadius: theme.radius.lg,
        border: `1px solid ${isSynth ? sg(20) : theme.color.border}`,
        background: theme.color.surface,
        ...(isSynth ? { boxShadow: `0 0 12px ${sg(7)}` } : {}),
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
            {["Title", "Tags", "Updated", ""].map((h) => (
              <th
                key={h || "_actions"}
                style={{
                  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                  textAlign: "left",
                  fontWeight: 600,
                  fontSize: theme.font.size.xxs,
                  color: isSynth ? "var(--synth-glow)" : theme.color.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: theme.font.letterSpacing.wide,
                  borderBottom: isSynth
                    ? `2px solid ${sg(27)}`
                    : `2px solid ${theme.color.border}`,
                  whiteSpace: "nowrap",
                  ...(isSynth ? { textShadow: `0 0 8px ${sg(27)}` } : {}),
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
