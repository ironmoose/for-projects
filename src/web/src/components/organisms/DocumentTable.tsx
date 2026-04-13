import { useState, useMemo } from "react";
import { semantic as t, useInjectStyles } from "@4lt7ab/ui/core";
import { Icon } from "../atoms/Icon";
import { IconButton } from "../atoms/IconButton";
import { TagChip } from "@4lt7ab/ui/ui";
import { useTheme } from "../theme/ThemeContext";
import { useWindowWidth, SMALL_BREAKPOINT } from "../../hooks/useWindowWidth";
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

function ProjectChips({ projects, compact }: { projects: DocumentSummary["linked_projects"]; compact: boolean }) {
  if (projects.length === 0) return null;

  if (compact) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 3,
          fontSize: t.fontSizeXs,
          color: t.colorTextMuted,
          fontWeight: 600,
          fontFamily: t.fontSans,
          flexShrink: 0,
        }}
      >
        <Icon name="folder_special" size={12} style={{ color: t.colorTextSecondary }} />
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
            padding: `1px ${t.spaceXs}`,
            borderRadius: t.radiusSm,
            background: `color-mix(in srgb, ${t.colorActionPrimary} 8%, transparent)`,
            border: `1px solid color-mix(in srgb, ${t.colorActionPrimary} 19%, transparent)`,
            color: t.colorActionPrimary,
            fontSize: t.fontSizeXs,
            fontWeight: 600,
            fontFamily: t.fontSans,
            letterSpacing: t.letterSpacingTight,
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
    <div style={{ display: "flex", flexDirection: "column", gap: t.spaceLg }}>
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
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div>
      <button
        onClick={() => setCollapsed(!collapsed)}
        aria-expanded={!collapsed}
        style={{
          display: "flex",
          alignItems: "center",
          gap: t.spaceXs,
          padding: `${t.spaceXs} ${t.spaceSm}`,
          marginBottom: collapsed ? 0 : t.spaceSm,
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
          style={{ color: t.colorTextMuted, flexShrink: 0 }}
        />
        <Icon
          name={folder ? "folder" : "draft"}
          size={15}
          style={{ color: folder ? t.colorActionPrimary : t.colorTextSecondary, flexShrink: 0 }}
        />
        <span
          style={{
            fontSize: t.fontSizeXs,
            fontWeight: 700,
            fontFamily: t.fontSans,
            color: t.colorText,
            letterSpacing: t.letterSpacingTight,
          }}
        >
          {folder ?? "Unfiled"}
        </span>
        <span
          style={{
            fontSize: t.fontSizeXs,
            color: t.colorTextSecondary,
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
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: columns === 1 ? t.spaceSm : t.spaceMd,
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
  const maxTags = compact ? 2 : 4;
  const overflowCount = doc.tags.length - maxTags;
  const summaryLines = compact ? 2 : 3;

  useInjectStyles("tfp-doc-card", `
    .tfp-doc-card:hover {
      border-color: var(--color-border) !important;
      box-shadow: var(--shadow-md) !important;
    }
    .tfp-doc-card:focus-visible {
      outline: 2px solid var(--focus-ring-color);
      outline-offset: 2px;
    }
    .tfp-doc-card .tfp-doc-card-actions {
      opacity: 0;
      transition: opacity 0.1s;
    }
    .tfp-doc-card:hover .tfp-doc-card-actions {
      opacity: 1;
    }
    .tfp-doc-card-compact .tfp-doc-card-actions {
      opacity: 1 !important;
    }
    :root[data-synth] .tfp-doc-card:hover {
      border-color: color-mix(in srgb, var(--synth-glow) 27%, transparent) !important;
      box-shadow: 0 0 8px color-mix(in srgb, var(--synth-glow) 8%, transparent) !important;
    }
  `);

  const borderColor = selected
    ? theme.glow.animated ? theme.glow.borderStrong : t.colorActionPrimary
    : theme.glow.borderSubtle;

  const shadow = selected
    ? theme.glow.animated ? theme.glow.shadowSm : t.shadowSm
    : "none";

  const cardClass = compact ? "tfp-doc-card tfp-doc-card-compact" : "tfp-doc-card";

  return (
    <div
      className={cardClass}
      tabIndex={0}
      role="article"
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onSelect();
        }
      }}
      style={{
        borderRadius: compact ? t.radiusMd : t.radiusLg,
        border: `1px solid ${borderColor}`,
        background: selected ? t.colorSurfaceRaised : t.colorSurface,
        boxShadow: shadow,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        padding: compact ? t.spaceSm : t.spaceMd,
        gap: compact ? t.spaceXs : t.spaceSm,
        transition: "border-color 0.2s, box-shadow 0.25s, background 0.15s",
      }}
    >
      {/* Header row: title + project count (compact) or favorite */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: t.spaceXs }}>
        <span
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: compact ? t.fontSizeXs : t.fontSizeSm,
            fontWeight: 600,
            fontFamily: t.fontSans,
            color: t.colorText,
            lineHeight: t.lineHeightTight,
            letterSpacing: t.letterSpacingTight,
            display: "-webkit-box",
            WebkitLineClamp: compact ? 1 : 2,
            WebkitBoxOrient: "vertical" as React.CSSProperties["WebkitBoxOrient"],
            overflow: "hidden",
          }}
        >
          {doc.title}
        </span>
        {/* Source indicator */}
        {doc.source_type && !doc.source_url && (
          <Icon name="link" size={compact ? 12 : 13} style={{ color: t.colorTextSecondary, flexShrink: 0, marginTop: 2 }} title="Imported from external source" />
        )}
        {/* Compact: project count + favorite inline */}
        {compact && doc.linked_projects.length > 0 && (
          <ProjectChips projects={doc.linked_projects} compact />
        )}
        {doc.favorite && (
          <Icon name="star" size={compact ? 12 : 14} style={{ color: t.colorWarning, flexShrink: 0, marginTop: 2 }} />
        )}
      </div>

      {/* Summary — always visible */}
      <div
        style={{
          fontSize: t.fontSizeXs,
          color: t.colorTextMuted,
          lineHeight: t.lineHeightBase,
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: summaryLines,
          WebkitBoxOrient: "vertical" as React.CSSProperties["WebkitBoxOrient"],
          minHeight: 0,
        }}
      >
        {doc.summary || (
          <span style={{ color: t.colorTextSecondary, fontStyle: "italic" }}>No summary</span>
        )}
      </div>

      {/* Project chips — full chips on wide only */}
      {!compact && doc.linked_projects.length > 0 && (
        <ProjectChips projects={doc.linked_projects} compact={false} />
      )}

      {/* Footer: tags + date + actions */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: compact ? t.spaceXs : t.spaceSm,
          marginTop: "auto",
          paddingTop: t.spaceXs,
          borderTop: `1px solid color-mix(in srgb, ${t.colorBorder} 50%, transparent)`,
        }}
      >
        {/* Tags */}
        {doc.tags.length > 0 ? (
          <div style={{ display: "flex", alignItems: "center", gap: 3, flexWrap: "wrap", flex: 1, minWidth: 0 }}>
            {doc.tags.slice(0, maxTags).map((tag) => (
              <TagChip key={tag} name={tag} />
            ))}
            {overflowCount > 0 && (
              <span style={{ fontSize: t.fontSizeXs, color: t.colorTextSecondary }}>
                +{overflowCount}
              </span>
            )}
          </div>
        ) : (
          <div style={{ flex: 1 }} />
        )}

        {/* Source provenance */}
        {doc.source_type && doc.source_url && (
          <a
            href={doc.source_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title={doc.source_url}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              fontSize: t.fontSizeXs,
              color: t.colorTextMuted,
              textDecoration: "none",
              flexShrink: 0,
              padding: "1px 6px",
              borderRadius: t.radiusSm,
              background: t.colorSurfaceRaised,
              border: `1px solid color-mix(in srgb, ${t.colorBorder} 50%, transparent)`,
            }}
          >
            <Icon name="link" size={10} />
            {doc.source_type}
          </a>
        )}

        {/* Date */}
        <span style={{ fontSize: t.fontSizeXs, color: t.colorTextSecondary, flexShrink: 0 }}>
          {formatDate(doc.updated_at)}
        </span>

        {/* Actions — always visible on mobile (no hover), hover-reveal on desktop */}
        <div
          className="tfp-doc-card-actions"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 0,
            flexShrink: 0,
          }}
        >
          <IconButton
            icon={doc.favorite ? "star" : "star_border"}
            size={compact ? 13 : 14}
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
            aria-label={doc.favorite ? "Remove from favorites" : "Add to favorites"}
            style={{ width: compact ? 24 : 26, height: compact ? 24 : 26, minWidth: compact ? 24 : 26, color: doc.favorite ? t.colorWarning : t.colorTextSecondary }}
          />
          <IconButton
            icon="delete"
            size={compact ? 13 : 14}
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            aria-label="Delete document"
            style={{ width: compact ? 24 : 26, height: compact ? 24 : 26, minWidth: compact ? 24 : 26, color: t.colorTextSecondary }}
          />
        </div>
      </div>
    </div>
  );
}
