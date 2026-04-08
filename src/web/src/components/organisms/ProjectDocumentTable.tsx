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
// Grouping
// ---------------------------------------------------------------------------

interface TypeGroup {
  type: ReferenceType;
  docs: DocumentReferenceDetail[];
}

function groupByType(documents: DocumentReferenceDetail[]): TypeGroup[] {
  const map = new Map<ReferenceType, DocumentReferenceDetail[]>();
  for (const doc of documents) {
    const list = map.get(doc.type);
    if (list) list.push(doc);
    else map.set(doc.type, [doc]);
  }

  return TYPE_ORDER
    .filter((t) => map.has(t))
    .map((t) => ({ type: t, docs: map.get(t)! }));
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
  const groups = useMemo(() => groupByType(documents), [documents]);

  if (groups.length === 0) {
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
    <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.md }}>
      {groups.map((group) => (
        <TypeSection
          key={group.type}
          group={group}
          selectedDocumentId={selectedDocumentId}
          onSelectDocument={onSelectDocument}
          onDetachDocument={onDetachDocument}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Collapsible type section
// ---------------------------------------------------------------------------

interface TypeSectionProps {
  group: TypeGroup;
  selectedDocumentId: string | null;
  onSelectDocument: (documentId: string) => void;
  onDetachDocument: (doc: DocumentReferenceDetail) => void;
  onToggleFavorite: (doc: DocumentReferenceDetail) => void;
}

function TypeSection({ group, selectedDocumentId, onSelectDocument, onDetachDocument, onToggleFavorite }: TypeSectionProps) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(true);
  const meta = TYPE_META[group.type];
  const accent = typeColor(group.type, theme);

  return (
    <div>
      {/* Section header */}
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
          padding: `${theme.spacing.xs} ${theme.spacing.xs}`,
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
          name={meta.icon}
          size={15}
          style={{ color: accent, flexShrink: 0 }}
        />
        <span
          style={{
            fontSize: theme.font.size.xs,
            fontWeight: 700,
            fontFamily: theme.font.headline,
            letterSpacing: theme.font.letterSpacing.wide,
            textTransform: "uppercase",
            color: accent,
          }}
        >
          {meta.label}
        </span>
        <span
          style={{
            fontSize: theme.font.size.xxs,
            color: theme.color.textFaint,
            fontWeight: 400,
          }}
        >
          {group.docs.length}
        </span>
      </div>

      {/* Collapsible content */}
      <div
        style={{
          display: "grid",
          gridTemplateRows: open ? "1fr" : "0fr",
          transition: `grid-template-rows ${theme.motion.normal} ${theme.motion.easing}`,
        }}
      >
        <div style={{ overflow: "hidden", minHeight: 0 }}>
          <div style={{ paddingTop: theme.spacing.xs }}>
            <DocumentDeck
              docs={group.docs}
              accent={accent}
              selectedDocumentId={selectedDocumentId}
              onSelectDocument={onSelectDocument}
              onDetachDocument={onDetachDocument}
              onToggleFavorite={onToggleFavorite}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Document deck — cards stacked, focused card expands on hover
// ---------------------------------------------------------------------------

const CARD_COLLAPSED_H = 36;
const CARD_EXPANDED_H = 100;
const OVERLAP = 8;

interface DocumentDeckProps {
  docs: DocumentReferenceDetail[];
  accent: string;
  selectedDocumentId: string | null;
  onSelectDocument: (documentId: string) => void;
  onDetachDocument: (doc: DocumentReferenceDetail) => void;
  onToggleFavorite: (doc: DocumentReferenceDetail) => void;
}

function DocumentDeck({ docs, accent, selectedDocumentId, onSelectDocument, onDetachDocument, onToggleFavorite }: DocumentDeckProps) {
  const { theme } = useTheme();
  const [focusedId, setFocusedId] = useState<string | null>(null);

  // Compute height of the deck container so it doesn't jump wildly.
  // One card is expanded, rest are collapsed and slightly overlapping.
  const collapsedCount = docs.length - (focusedId ? 1 : 0);
  const expandedCount = focusedId ? 1 : 0;
  const deckHeight = focusedId
    ? expandedCount * CARD_EXPANDED_H + collapsedCount * (CARD_COLLAPSED_H - OVERLAP) + OVERLAP
    : docs.length * (CARD_COLLAPSED_H - OVERLAP) + OVERLAP;

  return (
    <div
      style={{
        position: "relative",
        height: deckHeight,
        transition: `height ${theme.motion.normal} ${theme.motion.easing}`,
      }}
      onMouseLeave={() => setFocusedId(null)}
    >
      {docs.map((doc, i) => {
        const isFocused = focusedId === doc.document_id;
        const isSelected = selectedDocumentId === doc.document_id;

        // Calculate vertical position: cards before the focused one stack normally,
        // the focused one takes full expanded height, cards after shift down.
        let top: number;
        if (!focusedId) {
          top = i * (CARD_COLLAPSED_H - OVERLAP);
        } else {
          const focusedIdx = docs.findIndex((d) => d.document_id === focusedId);
          if (i < focusedIdx) {
            top = i * (CARD_COLLAPSED_H - OVERLAP);
          } else if (i === focusedIdx) {
            top = i * (CARD_COLLAPSED_H - OVERLAP);
          } else {
            top = focusedIdx * (CARD_COLLAPSED_H - OVERLAP) + CARD_EXPANDED_H + (i - focusedIdx - 1) * (CARD_COLLAPSED_H - OVERLAP);
          }
        }

        return (
          <DeckCard
            key={`${doc.document_id}-${doc.type}`}
            doc={doc}
            accent={accent}
            focused={isFocused}
            selected={isSelected}
            top={top}
            zIndex={isFocused ? docs.length + 1 : isSelected ? docs.length : i}
            onMouseEnter={() => setFocusedId(doc.document_id)}
            onSelect={() => onSelectDocument(doc.document_id)}
            onDetach={() => onDetachDocument(doc)}
            onToggleFavorite={() => onToggleFavorite(doc)}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Individual deck card
// ---------------------------------------------------------------------------

interface DeckCardProps {
  doc: DocumentReferenceDetail;
  accent: string;
  focused: boolean;
  selected: boolean;
  top: number;
  zIndex: number;
  onMouseEnter: () => void;
  onSelect: () => void;
  onDetach: () => void;
  onToggleFavorite: () => void;
}

function DeckCard({ doc, accent, focused, selected, top, zIndex, onMouseEnter, onSelect, onDetach, onToggleFavorite }: DeckCardProps) {
  const { theme } = useTheme();

  const borderColor = selected
    ? accent
    : focused
      ? `${accent}99`
      : theme.glow.borderSubtle;

  const shadow = focused
    ? theme.glow.animated ? theme.glow.shadowMd : theme.shadow.md
    : selected
      ? theme.glow.animated ? theme.glow.shadowSm : theme.shadow.sm
      : "none";

  return (
    <div
      onMouseEnter={onMouseEnter}
      onClick={onSelect}
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top,
        height: focused ? CARD_EXPANDED_H : CARD_COLLAPSED_H,
        zIndex,
        borderRadius: theme.radius.lg,
        border: `1px solid ${borderColor}`,
        borderLeft: `3px solid ${selected ? accent : focused ? accent : `${accent}44`}`,
        background: focused || selected ? theme.color.surfaceContainerHigh : theme.color.surfaceContainer,
        boxShadow: shadow,
        cursor: "pointer",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        transition: [
          `top ${theme.motion.normal} ${theme.motion.easing}`,
          `height ${theme.motion.normal} ${theme.motion.easing}`,
          `border-color 0.2s`,
          `box-shadow 0.25s`,
          `background 0.15s`,
        ].join(", "),
      }}
    >
      {/* Top row — always visible: title + favorite */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: theme.spacing.sm,
          padding: `${theme.spacing.sm} ${theme.spacing.md}`,
          minHeight: CARD_COLLAPSED_H,
          flexShrink: 0,
        }}
      >
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
            letterSpacing: theme.font.letterSpacing.tight,
          }}
        >
          {doc.title}
        </span>

        {doc.favorite && (
          <Icon
            name="star"
            size={14}
            style={{ color: theme.color.warning, flexShrink: 0 }}
          />
        )}
      </div>

      {/* Expanded content — summary + charms */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: `0 ${theme.spacing.md} ${theme.spacing.sm}`,
          opacity: focused ? 1 : 0,
          transition: `opacity ${theme.motion.fast} ${theme.motion.easing}`,
          pointerEvents: focused ? "auto" : "none",
        }}
      >
        {/* Summary */}
        <div
          style={{
            fontSize: theme.font.size.xs,
            color: theme.color.textMuted,
            lineHeight: theme.font.lineHeight.normal,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical" as React.CSSProperties["WebkitBoxOrient"],
            minHeight: 0,
          }}
        >
          {doc.summary || (
            <span style={{ color: theme.color.textFaint, fontStyle: "italic" }}>
              No summary
            </span>
          )}
        </div>

        {/* Charms row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 0,
            marginTop: theme.spacing.xs,
          }}
        >
          <IconButton
            icon={doc.favorite ? "star" : "star_border"}
            size={14}
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
            aria-label={doc.favorite ? "Remove from favorites" : "Add to favorites"}
            style={{
              width: 26,
              height: 26,
              minWidth: 26,
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
              width: 26,
              height: 26,
              minWidth: 26,
              color: theme.color.textFaint,
            }}
          />
          <IconButton
            icon="link_off"
            size={14}
            onClick={(e) => { e.stopPropagation(); onDetach(); }}
            aria-label={`Detach ${doc.title}`}
            style={{
              width: 26,
              height: 26,
              minWidth: 26,
              color: theme.color.textFaint,
            }}
          />
        </div>
      </div>
    </div>
  );
}
