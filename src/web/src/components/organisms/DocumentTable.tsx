import { useMemo, useState } from "react";
import { Tile } from "../atoms/Tile";
import { IconButton } from "../atoms/IconButton";
import { Icon } from "../atoms/Icon";
import { TagChip } from "../molecules/TagChip";
import { PresenceCharm } from "../molecules/PresenceCharm";
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

export function DocumentTable({ documents, selectedDocumentId, onSelectDocument, onDeleteDocument, onToggleFavorite }: DocumentTableProps) {
  const { theme } = useTheme();
  const groups = useMemo(() => groupByFolder(documents), [documents]);
  const hasMultipleGroups = groups.length > 1 || (groups.length === 1 && groups[0].folder !== null);

  // If all documents are in one unfiled group, skip the folder chrome
  if (!hasMultipleGroups) {
    return (
      <TileGrid
        docs={documents}
        selectedDocumentId={selectedDocumentId}
        onSelectDocument={onSelectDocument}
        onDeleteDocument={onDeleteDocument}
        onToggleFavorite={onToggleFavorite}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.lg }}>
      {groups.map((group) => (
        <FolderSection
          key={group.folder ?? "__unfiled__"}
          group={group}
          selectedDocumentId={selectedDocumentId}
          onSelectDocument={onSelectDocument}
          onDeleteDocument={onDeleteDocument}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Collapsible folder section
// ---------------------------------------------------------------------------

interface FolderSectionProps {
  group: FolderGroup;
  selectedDocumentId: string | null;
  onSelectDocument: (id: string) => void;
  onDeleteDocument: (doc: DocumentSummary) => void;
  onToggleFavorite: (doc: DocumentSummary) => void;
}

function FolderSection({ group, selectedDocumentId, onSelectDocument, onDeleteDocument, onToggleFavorite }: FolderSectionProps) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(true);

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(!open);
          }
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: theme.spacing.sm,
          padding: `${theme.spacing.sm} ${theme.spacing.xs}`,
          cursor: "pointer",
          userSelect: "none",
          borderRadius: theme.radius.md,
        }}
      >
        <Icon
          name="chevron_right"
          size={16}
          style={{
            color: theme.color.textMuted,
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
            transition: `transform ${theme.motion.fast} ${theme.motion.easing}`,
            flexShrink: 0,
          }}
        />
        <Icon
          name={group.folder ? "folder" : "folder_open"}
          size={14}
          style={{ color: group.folder ? theme.color.textMuted : theme.color.textFaint, flexShrink: 0 }}
        />
        <span
          style={{
            fontSize: theme.font.size.xs,
            fontWeight: 700,
            fontFamily: theme.font.headline,
            letterSpacing: theme.font.letterSpacing.wide,
            textTransform: "uppercase",
            color: group.folder ? theme.color.textMuted : theme.color.textFaint,
          }}
        >
          {group.label}
        </span>
        <span
          style={{
            fontSize: theme.font.size.xxs,
            color: theme.color.textFaint,
            fontWeight: 400,
          }}
        >
          ({group.docs.length})
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateRows: open ? "1fr" : "0fr",
          transition: `grid-template-rows ${theme.motion.normal} ${theme.motion.easing}`,
        }}
      >
        <div style={{ overflow: "hidden", minHeight: 0 }}>
          <div style={{ paddingTop: theme.spacing.xs }}>
            <TileGrid
              docs={group.docs}
              selectedDocumentId={selectedDocumentId}
              onSelectDocument={onSelectDocument}
              onDeleteDocument={onDeleteDocument}
              onToggleFavorite={onToggleFavorite}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tile grid layout
// ---------------------------------------------------------------------------

interface TileGridProps {
  docs: DocumentSummary[];
  selectedDocumentId: string | null;
  onSelectDocument: (id: string) => void;
  onDeleteDocument: (doc: DocumentSummary) => void;
  onToggleFavorite: (doc: DocumentSummary) => void;
}

function TileGrid({ docs, selectedDocumentId, onSelectDocument, onDeleteDocument, onToggleFavorite }: TileGridProps) {
  const { theme } = useTheme();

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
        gap: theme.spacing.sm,
      }}
    >
      {docs.map((doc) => (
        <DocumentTile
          key={doc.id}
          doc={doc}
          selected={selectedDocumentId === doc.id}
          onSelect={() => onSelectDocument(doc.id)}
          onDelete={() => onDeleteDocument(doc)}
          onToggleFavorite={() => onToggleFavorite(doc)}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Individual document tile
// ---------------------------------------------------------------------------

interface DocumentTileProps {
  doc: DocumentSummary;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
}

function DocumentTile({ doc, selected, onSelect, onDelete, onToggleFavorite }: DocumentTileProps) {
  const { theme } = useTheme();
  const [hovered, setHovered] = useState(false);
  const maxTags = 3;
  const overflowCount = doc.tags.length - maxTags;

  return (
    <Tile
      selected={selected}
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Row 1: Title + presence charm */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, minHeight: 20 }}>
        <span
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: theme.font.size.sm,
            fontWeight: 600,
            fontFamily: theme.font.body,
            color: theme.color.text,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {doc.title}
        </span>
        <PresenceCharm active={doc.has_content} label="Content" color={theme.color.success} />
      </div>

      {/* Row 2: Summary (if present) */}
      {doc.summary && (
        <div
          style={{
            fontSize: theme.font.size.xs,
            color: theme.color.textMuted,
            lineHeight: theme.font.lineHeight.normal,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical" as React.CSSProperties["WebkitBoxOrient"],
            overflow: "hidden",
          }}
        >
          {doc.summary}
        </div>
      )}

      {/* Row 3: Tags */}
      {doc.tags.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
          {doc.tags.slice(0, maxTags).map((tag) => (
            <TagChip key={tag} name={tag} />
          ))}
          {overflowCount > 0 && (
            <span style={{ fontSize: theme.font.size.xxs, color: theme.color.textFaint }}>
              +{overflowCount}
            </span>
          )}
        </div>
      )}

      {/* Row 4: Footer — date + charms */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: theme.spacing.xs,
        }}
      >
        <span
          style={{
            fontSize: theme.font.size.xxs,
            color: theme.color.textFaint,
          }}
        >
          {formatDate(doc.updated_at)}
        </span>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 0,
            opacity: hovered || selected ? 1 : 0,
            transition: `opacity ${theme.motion.fast} ${theme.motion.easing}`,
          }}
        >
          <IconButton
            icon={doc.favorite ? "star" : "star_border"}
            size={14}
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
            aria-label={doc.favorite ? "Remove from favorites" : "Add to favorites"}
            style={{
              width: 28,
              height: 28,
              minWidth: 28,
              color: doc.favorite ? theme.color.warning : theme.color.textFaint,
            }}
          />
          <IconButton
            icon="content_copy"
            size={14}
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(doc.title);
            }}
            aria-label="Copy title"
            style={{
              width: 28,
              height: 28,
              minWidth: 28,
              color: theme.color.textFaint,
            }}
          />
          <IconButton
            icon="delete"
            size={14}
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            aria-label="Delete document"
            style={{
              width: 28,
              height: 28,
              minWidth: 28,
              color: theme.color.textFaint,
            }}
          />
        </div>
      </div>
    </Tile>
  );
}
