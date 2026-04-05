import { useMemo } from "react";
import { IconButton } from "../atoms/IconButton";
import { TagChip } from "../molecules/TagChip";
import { PresenceCharm } from "../molecules/PresenceCharm";
import { tableWrapperStyle, tableHeaderStyle, cellStyle } from "../molecules/tableUtils";
import { useTheme } from "../theme/ThemeContext";
import type { DocumentSummary } from "../../types";
import { formatDate } from "../../utils";

interface DocumentTableProps {
  documents: DocumentSummary[];
  selectedDocumentId: string | null;
  onSelectDocument: (id: string) => void;
  onDeleteDocument: (doc: DocumentSummary) => void;
  onToggleFavorite: (doc: DocumentSummary) => void;
}

interface FolderGroup {
  folder: string | null;
  label: string;
  docs: DocumentSummary[];
}

function groupByFolder(documents: DocumentSummary[]): FolderGroup[] {
  const map = new Map<string | null, DocumentSummary[]>();
  for (const doc of documents) {
    const key = doc.folder;
    const list = map.get(key);
    if (list) {
      list.push(doc);
    } else {
      map.set(key, [doc]);
    }
  }

  const groups: FolderGroup[] = [];
  // Named folders first (sorted alphabetically), then unfiled
  const keys = [...map.keys()].sort((a, b) => {
    if (a === null) return 1;
    if (b === null) return -1;
    return a.localeCompare(b);
  });

  for (const key of keys) {
    groups.push({
      folder: key,
      label: key ?? "Unfiled",
      docs: map.get(key)!,
    });
  }

  return groups;
}

const COL_COUNT = 5;

export function DocumentTable({ documents, selectedDocumentId, onSelectDocument, onDeleteDocument, onToggleFavorite }: DocumentTableProps) {
  const { theme, themeName } = useTheme();
  const isSynth = themeName === "synth";

  const groups = useMemo(() => groupByFolder(documents), [documents]);
  const hasMultipleGroups = groups.length > 1 || (groups.length === 1 && groups[0].folder !== null);

  return (
    <div
      style={tableWrapperStyle(theme, isSynth)}
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
                style={tableHeaderStyle(theme, isSynth)}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <FolderGroupRows
              key={group.folder ?? "__unfiled__"}
              group={group}
              showHeader={hasMultipleGroups}
              selectedDocumentId={selectedDocumentId}
              onSelectDocument={onSelectDocument}
              onDeleteDocument={onDeleteDocument}
              onToggleFavorite={onToggleFavorite}
              theme={theme}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface FolderGroupRowsProps {
  group: FolderGroup;
  showHeader: boolean;
  selectedDocumentId: string | null;
  onSelectDocument: (id: string) => void;
  onDeleteDocument: (doc: DocumentSummary) => void;
  onToggleFavorite: (doc: DocumentSummary) => void;
  theme: ReturnType<typeof useTheme>["theme"];
}

function FolderGroupRows({ group, showHeader, selectedDocumentId, onSelectDocument, onDeleteDocument, onToggleFavorite, theme }: FolderGroupRowsProps) {
  return (
    <>
      {showHeader && (
        <tr>
          <td
            colSpan={COL_COUNT}
            style={{
              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
              fontSize: theme.font.size.xs,
              fontWeight: 700,
              fontFamily: theme.font.headline,
              letterSpacing: theme.font.letterSpacing.wide,
              textTransform: "uppercase" as const,
              color: group.folder ? theme.color.textMuted : theme.color.textFaint,
              borderBottom: `1px solid ${theme.color.borderSubtle}`,
              background: theme.color.surfaceContainer,
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: "middle" }}>
                {group.folder ? "folder" : "folder_open"}
              </span>
              {group.label}
              <span style={{ fontWeight: 400, color: theme.color.textFaint }}>
                ({group.docs.length})
              </span>
            </span>
          </td>
        </tr>
      )}
      {group.docs.map((doc) => (
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
    </>
  );
}
