import { useState, useMemo } from "react";
import { Icon } from "../atoms/Icon";
import { IconButton } from "../atoms/IconButton";
import { TagChip } from "../molecules/TagChip";
import { useTheme } from "../theme/ThemeContext";
import { useWindowWidth, SMALL_BREAKPOINT } from "../../hooks/useWindowWidth";
import type { Theme } from "../theme/theme";
import type { DocumentSummary } from "../../types";
import { formatDate } from "../../utils";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DocumentTableProps {
  documents: DocumentSummary[];
  selectedDocumentId: string | null;
  onSelectDocument: (id: string) => void;
  onDeleteDocument: (doc: DocumentSummary) => void;
  onToggleFavorite: (doc: DocumentSummary) => void;
  /** Group documents under collapsible folder headers */
  groupByFolder?: boolean;
}

// ---------------------------------------------------------------------------
// Project chips — reused inside each card
// ---------------------------------------------------------------------------

function ProjectChips({ projects, compact, theme }: { projects: DocumentSummary["linked_projects"]; compact: boolean; theme: Theme }) {
  if (projects.length === 0) return null;

  if (compact) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 3,
          fontSize: theme.font.size.xxs,
          color: theme.color.textMuted,
          fontWeight: 600,
          fontFamily: theme.font.body,
          flexShrink: 0,
        }}
      >
        <Icon name="folder_special" size={12} style={{ color: theme.color.textFaint }} />
        {projects.length}
      </span>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
      {projects.map((p) => (
        <span
          key={p.id}
          style={{
            display: "inline-block",
            maxWidth: 140,
            padding: `1px ${theme.spacing.xs}`,
            borderRadius: theme.radius.sm,
            background: `${theme.color.primary}14`,
            border: `1px solid ${theme.color.primary}30`,
            color: theme.color.primary,
            fontSize: theme.font.size.xxs,
            fontWeight: 600,
            fontFamily: theme.font.body,
            letterSpacing: theme.font.letterSpacing.tight,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={p.title}
        >
          {p.title}
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Magazine card grid — the main export
// ---------------------------------------------------------------------------

export function DocumentTable({ documents, selectedDocumentId, onSelectDocument, onDeleteDocument, onToggleFavorite, groupByFolder }: DocumentTableProps) {
  const { theme } = useTheme();
  const windowWidth = useWindowWidth();
  const columns = windowWidth >= SMALL_BREAKPOINT ? 2 : 1;

  const groups = useMemo(() => {
    if (!groupByFolder) return null;
    const map = new Map<string, DocumentSummary[]>();
    const unfiled: DocumentSummary[] = [];
    for (const doc of documents) {
      if (doc.folder) {
        let list = map.get(doc.folder);
        if (!list) { list = []; map.set(doc.folder, list); }
        list.push(doc);
      } else {
        unfiled.push(doc);
      }
    }
    // Sort folder names alphabetically
    const sorted = [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    return { folders: sorted, unfiled };
  }, [documents, groupByFolder]);

  const cardProps = { columns, selectedDocumentId, onSelectDocument, onDeleteDocument, onToggleFavorite };

  if (!groups) {
    return <CardGrid documents={documents} {...cardProps} />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.lg }}>
      {groups.folders.map(([folder, docs]) => (
        <FolderGroup key={folder} folder={folder} documents={docs} {...cardProps} />
      ))}
      {groups.unfiled.length > 0 && (
        <FolderGroup key="__unfiled" folder={null} documents={groups.unfiled} {...cardProps} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Collapsible folder group
// ---------------------------------------------------------------------------

interface FolderGroupProps {
  folder: string | null;
  documents: DocumentSummary[];
  columns: number;
  selectedDocumentId: string | null;
  onSelectDocument: (id: string) => void;
  onDeleteDocument: (doc: DocumentSummary) => void;
  onToggleFavorite: (doc: DocumentSummary) => void;
}

function FolderGroup({ folder, documents, ...cardGridProps }: FolderGroupProps) {
  const { theme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div>
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: theme.spacing.xs,
          padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
          marginBottom: collapsed ? 0 : theme.spacing.sm,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          width: "100%",
          textAlign: "left",
        }}
      >
        <Icon
          name={collapsed ? "chevron_right" : "expand_more"}
          size={16}
          style={{ color: theme.color.textMuted, flexShrink: 0 }}
        />
        <Icon
          name={folder ? "folder" : "draft"}
          size={15}
          style={{ color: folder ? theme.color.primary : theme.color.textFaint, flexShrink: 0 }}
        />
        <span
          style={{
            fontSize: theme.font.size.xs,
            fontWeight: 700,
            fontFamily: theme.font.body,
            color: theme.color.text,
            letterSpacing: theme.font.letterSpacing.tight,
          }}
        >
          {folder ?? "Unfiled"}
        </span>
        <span
          style={{
            fontSize: theme.font.size.xxs,
            color: theme.color.textFaint,
            fontWeight: 500,
          }}
        >
          {documents.length}
        </span>
      </button>
      {!collapsed && <CardGrid documents={documents} {...cardGridProps} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card grid (extracted for reuse)
// ---------------------------------------------------------------------------

function CardGrid({
  documents, columns, selectedDocumentId, onSelectDocument, onDeleteDocument, onToggleFavorite,
}: {
  documents: DocumentSummary[];
  columns: number;
  selectedDocumentId: string | null;
  onSelectDocument: (id: string) => void;
  onDeleteDocument: (doc: DocumentSummary) => void;
  onToggleFavorite: (doc: DocumentSummary) => void;
}) {
  const { theme } = useTheme();
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: columns === 1 ? theme.spacing.sm : theme.spacing.md,
      }}
    >
      {documents.map((doc) => (
        <DocumentCard
          key={doc.id}
          doc={doc}
          compact={columns === 1}
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
// Individual magazine card
// ---------------------------------------------------------------------------

interface DocumentCardProps {
  doc: DocumentSummary;
  compact: boolean;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
}

function DocumentCard({ doc, compact, selected, onSelect, onDelete, onToggleFavorite }: DocumentCardProps) {
  const { theme } = useTheme();
  const [hovered, setHovered] = useState(false);
  const maxTags = compact ? 2 : 4;
  const overflowCount = doc.tags.length - maxTags;
  const summaryLines = compact ? 2 : 3;

  const borderColor = selected
    ? theme.glow.animated ? theme.glow.borderStrong : theme.color.primary
    : hovered
      ? theme.glow.animated ? theme.glow.borderMedium : theme.color.border
      : theme.glow.borderSubtle;

  const shadow = selected
    ? theme.glow.animated ? theme.glow.shadowSm : theme.shadow.sm
    : hovered
      ? theme.glow.animated ? theme.glow.shadowMd : theme.shadow.md
      : "none";

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: compact ? theme.radius.md : theme.radius.lg,
        border: `1px solid ${borderColor}`,
        background: selected ? theme.color.surfaceContainerHigh : theme.color.surfaceContainer,
        boxShadow: shadow,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        padding: compact ? theme.spacing.sm : theme.spacing.md,
        gap: compact ? theme.spacing.xs : theme.spacing.sm,
        transition: [
          "border-color 0.2s",
          "box-shadow 0.25s",
          "background 0.15s",
        ].join(", "),
      }}
    >
      {/* Header row: title + project count (compact) or favorite */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: theme.spacing.xs }}>
        <span
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: compact ? theme.font.size.xs : theme.font.size.sm,
            fontWeight: 600,
            fontFamily: theme.font.body,
            color: theme.color.text,
            lineHeight: theme.font.lineHeight.tight,
            letterSpacing: theme.font.letterSpacing.tight,
            display: "-webkit-box",
            WebkitLineClamp: compact ? 1 : 2,
            WebkitBoxOrient: "vertical" as React.CSSProperties["WebkitBoxOrient"],
            overflow: "hidden",
          }}
        >
          {doc.title}
        </span>
        {/* Source indicator */}
        {doc.source_type && (
          <Icon name="link" size={compact ? 12 : 13} style={{ color: theme.color.textFaint, flexShrink: 0, marginTop: 2 }} title="Imported from external source" />
        )}
        {/* Compact: project count + favorite inline */}
        {compact && doc.linked_projects.length > 0 && (
          <ProjectChips projects={doc.linked_projects} compact theme={theme} />
        )}
        {doc.favorite && (
          <Icon name="star" size={compact ? 12 : 14} style={{ color: theme.color.warning, flexShrink: 0, marginTop: 2 }} />
        )}
      </div>

      {/* Summary — always visible */}
      <div
        style={{
          fontSize: theme.font.size.xxs,
          color: theme.color.textMuted,
          lineHeight: theme.font.lineHeight.normal,
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: summaryLines,
          WebkitBoxOrient: "vertical" as React.CSSProperties["WebkitBoxOrient"],
          minHeight: 0,
        }}
      >
        {doc.summary || (
          <span style={{ color: theme.color.textFaint, fontStyle: "italic" }}>No summary</span>
        )}
      </div>

      {/* Project chips — full chips on wide only */}
      {!compact && doc.linked_projects.length > 0 && (
        <ProjectChips projects={doc.linked_projects} compact={false} theme={theme} />
      )}

      {/* Footer: tags + date + actions */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: compact ? theme.spacing.xs : theme.spacing.sm,
          marginTop: "auto",
          paddingTop: compact ? theme.spacing.xs : theme.spacing.xs,
          borderTop: `1px solid ${theme.color.borderSubtle}`,
        }}
      >
        {/* Tags */}
        {doc.tags.length > 0 ? (
          <div style={{ display: "flex", alignItems: "center", gap: 3, flexWrap: "wrap", flex: 1, minWidth: 0 }}>
            {doc.tags.slice(0, maxTags).map((tag) => (
              <TagChip key={tag} name={tag} />
            ))}
            {overflowCount > 0 && (
              <span style={{ fontSize: theme.font.size.xxs, color: theme.color.textFaint }}>
                +{overflowCount}
              </span>
            )}
          </div>
        ) : (
          <div style={{ flex: 1 }} />
        )}

        {/* Date */}
        <span style={{ fontSize: theme.font.size.xxs, color: theme.color.textFaint, flexShrink: 0 }}>
          {formatDate(doc.updated_at)}
        </span>

        {/* Actions — always visible on mobile (no hover), hover-reveal on desktop */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 0,
            flexShrink: 0,
            opacity: compact ? 1 : hovered ? 1 : 0,
            transition: `opacity ${theme.motion.fast}`,
          }}
        >
          <IconButton
            icon={doc.favorite ? "star" : "star_border"}
            size={compact ? 13 : 14}
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
            aria-label={doc.favorite ? "Remove from favorites" : "Add to favorites"}
            style={{ width: compact ? 24 : 26, height: compact ? 24 : 26, minWidth: compact ? 24 : 26, color: doc.favorite ? theme.color.warning : theme.color.textFaint }}
          />
          <IconButton
            icon="delete"
            size={compact ? 13 : 14}
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            aria-label="Delete document"
            style={{ width: compact ? 24 : 26, height: compact ? 24 : 26, minWidth: compact ? 24 : 26, color: theme.color.textFaint }}
          />
        </div>
      </div>
    </div>
  );
}
