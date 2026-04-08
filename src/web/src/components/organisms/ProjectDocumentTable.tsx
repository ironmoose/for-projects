import { useMemo, useState } from "react";
import { Icon } from "../atoms/Icon";
import { IconButton } from "../atoms/IconButton";
import { useTheme } from "../theme/ThemeContext";
import type { Theme } from "../theme/theme";
import type { DocumentReferenceDetail, ReferenceType } from "../../types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ProjectDocumentTableProps {
  documents: DocumentReferenceDetail[];
  selectedDocumentId: string | null;
  onSelectDocument: (documentId: string) => void;
  onDetachDocument: (doc: DocumentReferenceDetail) => void;
  onToggleFavorite: (doc: DocumentReferenceDetail) => void;
}

// ---------------------------------------------------------------------------
// Reference type metadata
// ---------------------------------------------------------------------------

const TYPE_ORDER: ReferenceType[] = ["goal", "plan", "requirements", "design", "reference", "note"];

const TYPE_META: Record<ReferenceType, { label: string; icon: string }> = {
  goal: { label: "Goal", icon: "flag" },
  plan: { label: "Plan", icon: "route" },
  requirements: { label: "Requirements", icon: "checklist" },
  design: { label: "Design", icon: "architecture" },
  reference: { label: "Reference", icon: "menu_book" },
  note: { label: "Notes", icon: "sticky_note_2" },
};

function typeColor(type: ReferenceType, theme: Theme): string {
  const map: Record<ReferenceType, string> = {
    goal: theme.color.success,
    plan: theme.color.primary,
    requirements: theme.color.warning,
    design: theme.color.tertiary,
    reference: theme.color.textMuted,
    note: theme.color.textFaint,
  };
  return map[type];
}

// ---------------------------------------------------------------------------
// Sort helper — order by type priority, then title
// ---------------------------------------------------------------------------

function sortDocs(docs: DocumentReferenceDetail[]): DocumentReferenceDetail[] {
  const typeIndex = new Map(TYPE_ORDER.map((t, i) => [t, i]));
  return [...docs].sort((a, b) => {
    const ta = typeIndex.get(a.type) ?? 99;
    const tb = typeIndex.get(b.type) ?? 99;
    if (ta !== tb) return ta - tb;
    return a.title.localeCompare(b.title);
  });
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

export function ProjectDocumentTable({
  documents,
  selectedDocumentId,
  onSelectDocument,
  onDetachDocument,
  onToggleFavorite,
}: ProjectDocumentTableProps) {
  const { theme } = useTheme();
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    const sorted = sortDocs(documents);
    if (!filter.trim()) return sorted;
    const needle = filter.trim().toLowerCase();
    return sorted.filter((d) => d.title.toLowerCase().includes(needle));
  }, [documents, filter]);

  const showFilter = documents.length >= 5;

  if (documents.length === 0) {
    return (
      <div
        style={{
          padding: `${theme.spacing.xl} ${theme.spacing.md}`,
          textAlign: "center",
          color: theme.color.textFaint,
          fontSize: theme.font.size.sm,
        }}
      >
        No documents linked yet
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.sm }}>
      {showFilter && (
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter documents\u2026"
          style={{
            padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
            fontSize: theme.font.size.xs,
            fontFamily: theme.font.body,
            color: theme.color.text,
            background: theme.color.surfaceContainer,
            border: `1px solid ${theme.glow.borderSubtle}`,
            borderRadius: theme.radius.md,
            outline: "none",
          }}
        />
      )}

      {/* Table */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: theme.font.size.sm,
          fontFamily: theme.font.body,
        }}
      >
        <thead>
          <tr>
            <th
              style={{
                textAlign: "left",
                padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                fontSize: theme.font.size.xxs,
                fontWeight: 700,
                fontFamily: theme.font.headline,
                letterSpacing: theme.font.letterSpacing.wide,
                textTransform: "uppercase",
                color: theme.color.textMuted,
                borderBottom: `1px solid ${theme.glow.borderSubtle}`,
                width: 80,
              }}
            >
              Type
            </th>
            <th
              style={{
                textAlign: "left",
                padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                fontSize: theme.font.size.xxs,
                fontWeight: 700,
                fontFamily: theme.font.headline,
                letterSpacing: theme.font.letterSpacing.wide,
                textTransform: "uppercase",
                color: theme.color.textMuted,
                borderBottom: `1px solid ${theme.glow.borderSubtle}`,
              }}
            >
              Title
            </th>
            <th
              style={{
                textAlign: "right",
                padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                fontSize: theme.font.size.xxs,
                fontWeight: 700,
                fontFamily: theme.font.headline,
                letterSpacing: theme.font.letterSpacing.wide,
                textTransform: "uppercase",
                color: theme.color.textMuted,
                borderBottom: `1px solid ${theme.glow.borderSubtle}`,
                width: 72,
              }}
            >
              {/* Actions — no header label */}
            </th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 && filter.trim() && (
            <tr>
              <td
                colSpan={3}
                style={{
                  padding: `${theme.spacing.md}`,
                  textAlign: "center",
                  color: theme.color.textFaint,
                  fontSize: theme.font.size.sm,
                }}
              >
                No matching documents
              </td>
            </tr>
          )}
          {filtered.map((doc) => (
            <DocumentRow
              key={`${doc.document_id}-${doc.type}`}
              doc={doc}
              selected={selectedDocumentId === doc.document_id}
              onSelect={() => onSelectDocument(doc.document_id)}
              onDetach={() => onDetachDocument(doc)}
              onToggleFavorite={() => onToggleFavorite(doc)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Table row
// ---------------------------------------------------------------------------

interface DocumentRowProps {
  doc: DocumentReferenceDetail;
  selected: boolean;
  onSelect: () => void;
  onDetach: () => void;
  onToggleFavorite: () => void;
}

function DocumentRow({ doc, selected, onSelect, onDetach, onToggleFavorite }: DocumentRowProps) {
  const { theme } = useTheme();
  const [hovered, setHovered] = useState(false);
  const meta = TYPE_META[doc.type];
  const accent = typeColor(doc.type, theme);

  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        cursor: "pointer",
        background: selected
          ? `${accent}11`
          : hovered
            ? theme.color.surfaceContainerHigh
            : "transparent",
        transition: `background ${theme.motion.fast} ${theme.motion.easing}`,
      }}
      onClick={onSelect}
    >
      {/* Type badge */}
      <td
        style={{
          padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
          borderBottom: `1px solid ${theme.glow.borderSubtle}`,
          verticalAlign: "middle",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: theme.font.size.xxs,
            fontWeight: 600,
            color: accent,
            whiteSpace: "nowrap",
          }}
        >
          <Icon name={meta.icon} size={13} style={{ flexShrink: 0 }} />
          {meta.label}
        </span>
      </td>

      {/* Title */}
      <td
        style={{
          padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
          borderBottom: `1px solid ${theme.glow.borderSubtle}`,
          verticalAlign: "middle",
          maxWidth: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: theme.spacing.sm }}>
          <span
            style={{
              fontWeight: 500,
              color: theme.color.text,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              letterSpacing: theme.font.letterSpacing.tight,
            }}
          >
            {doc.title}
          </span>
          {doc.favorite && (
            <Icon
              name="star"
              size={13}
              style={{ color: theme.color.warning, flexShrink: 0 }}
            />
          )}
        </div>
      </td>

      {/* Actions */}
      <td
        style={{
          padding: `${theme.spacing.xs} ${theme.spacing.xs}`,
          borderBottom: `1px solid ${theme.glow.borderSubtle}`,
          verticalAlign: "middle",
          textAlign: "right",
        }}
      >
        <div style={{ display: "inline-flex", alignItems: "center", gap: 0 }}>
          <IconButton
            icon={doc.favorite ? "star" : "star_border"}
            size={13}
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
            aria-label={doc.favorite ? "Remove from favorites" : "Add to favorites"}
            style={{
              width: 24,
              height: 24,
              minWidth: 24,
              color: doc.favorite ? theme.color.warning : theme.color.textFaint,
            }}
          />
          <IconButton
            icon="link_off"
            size={13}
            onClick={(e) => { e.stopPropagation(); onDetach(); }}
            aria-label={`Detach ${doc.title}`}
            style={{
              width: 24,
              height: 24,
              minWidth: 24,
              color: theme.color.textFaint,
            }}
          />
        </div>
      </td>
    </tr>
  );
}
