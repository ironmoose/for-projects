import { useMemo, useState } from "react";
import { Icon } from "../atoms/Icon";
import { IconButton } from "../atoms/IconButton";
import { TagChip } from "../molecules/TagChip";
import { PresenceCharm } from "../molecules/PresenceCharm";
import { useTheme } from "../theme/ThemeContext";
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
}

// ---------------------------------------------------------------------------
// Grouping modes
// ---------------------------------------------------------------------------

type GroupMode = "folder" | "tag";

interface DocGroup {
  key: string;
  label: string;
  icon: string;
  docs: DocumentSummary[];
}

function groupByFolder(documents: DocumentSummary[]): DocGroup[] {
  const map = new Map<string | null, DocumentSummary[]>();
  for (const doc of documents) {
    const key = doc.folder;
    const list = map.get(key);
    if (list) list.push(doc);
    else map.set(key, [doc]);
  }

  const keys = [...map.keys()].sort((a, b) => {
    if (a === null) return 1;
    if (b === null) return -1;
    return a.localeCompare(b);
  });

  return keys.map((key) => ({
    key: key ?? "__unfiled__",
    label: key ?? "Unfiled",
    icon: key ? "folder" : "folder_open",
    docs: map.get(key)!,
  }));
}

function groupByTag(documents: DocumentSummary[]): DocGroup[] {
  const map = new Map<string, DocumentSummary[]>();
  for (const doc of documents) {
    const tag = doc.tags.length > 0 ? doc.tags[0] : "__untagged__";
    const list = map.get(tag);
    if (list) list.push(doc);
    else map.set(tag, [doc]);
  }

  const keys = [...map.keys()].sort((a, b) => {
    if (a === "__untagged__") return 1;
    if (b === "__untagged__") return -1;
    return a.localeCompare(b);
  });

  return keys.map((key) => ({
    key,
    label: key === "__untagged__" ? "Untagged" : key,
    icon: key === "__untagged__" ? "label_off" : "label",
    docs: map.get(key)!,
  }));
}

function groupDocs(documents: DocumentSummary[], mode: GroupMode): DocGroup[] {
  return mode === "folder" ? groupByFolder(documents) : groupByTag(documents);
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

export function DocumentTable({ documents, selectedDocumentId, onSelectDocument, onDeleteDocument, onToggleFavorite }: DocumentTableProps) {
  const { theme } = useTheme();
  const [groupMode, setGroupMode] = useState<GroupMode>("folder");
  const groups = useMemo(() => groupDocs(documents, groupMode), [documents, groupMode]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.md }}>
      {/* Group mode toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: theme.spacing.xs }}>
        {(["folder", "tag"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setGroupMode(mode)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
              borderRadius: theme.radius.md,
              border: `1px solid ${groupMode === mode ? theme.color.primary : theme.color.borderSubtle}`,
              background: groupMode === mode ? `${theme.color.primary}18` : "transparent",
              color: groupMode === mode ? theme.color.primary : theme.color.textMuted,
              fontSize: theme.font.size.xxs,
              fontWeight: 600,
              fontFamily: theme.font.body,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            <Icon name={mode === "folder" ? "folder" : "label"} size={13} />
            {mode === "folder" ? "Folder" : "Tag"}
          </button>
        ))}
      </div>

      {/* Grouped decks */}
      {groups.map((group) => (
        <DeckSection
          key={group.key}
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
// Collapsible deck section
// ---------------------------------------------------------------------------

interface DeckSectionProps {
  group: DocGroup;
  selectedDocumentId: string | null;
  onSelectDocument: (id: string) => void;
  onDeleteDocument: (doc: DocumentSummary) => void;
  onToggleFavorite: (doc: DocumentSummary) => void;
}

function DeckSection({ group, selectedDocumentId, onSelectDocument, onDeleteDocument, onToggleFavorite }: DeckSectionProps) {
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
          name={group.icon}
          size={14}
          style={{ color: theme.color.textMuted, flexShrink: 0 }}
        />
        <span
          style={{
            fontSize: theme.font.size.xs,
            fontWeight: 700,
            fontFamily: theme.font.headline,
            letterSpacing: theme.font.letterSpacing.wide,
            textTransform: "uppercase",
            color: theme.color.textMuted,
          }}
        >
          {group.label}
        </span>
        <span style={{ fontSize: theme.font.size.xxs, color: theme.color.textFaint, fontWeight: 400 }}>
          {group.docs.length}
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
            <DocumentDeck
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
// Document deck — cards stacked, focused card expands on hover
// ---------------------------------------------------------------------------

const CARD_COLLAPSED_H = 38;
const CARD_EXPANDED_H = 120;
const OVERLAP = 8;

interface DocumentDeckProps {
  docs: DocumentSummary[];
  selectedDocumentId: string | null;
  onSelectDocument: (id: string) => void;
  onDeleteDocument: (doc: DocumentSummary) => void;
  onToggleFavorite: (doc: DocumentSummary) => void;
}

function DocumentDeck({ docs, selectedDocumentId, onSelectDocument, onDeleteDocument, onToggleFavorite }: DocumentDeckProps) {
  const { theme } = useTheme();
  const [focusedId, setFocusedId] = useState<string | null>(null);

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
        const isFocused = focusedId === doc.id;
        const isSelected = selectedDocumentId === doc.id;

        let top: number;
        if (!focusedId) {
          top = i * (CARD_COLLAPSED_H - OVERLAP);
        } else {
          const focusedIdx = docs.findIndex((d) => d.id === focusedId);
          if (i < focusedIdx) {
            top = i * (CARD_COLLAPSED_H - OVERLAP);
          } else if (i === focusedIdx) {
            top = i * (CARD_COLLAPSED_H - OVERLAP);
          } else {
            top = focusedIdx * (CARD_COLLAPSED_H - OVERLAP) + CARD_EXPANDED_H + (i - focusedIdx - 1) * (CARD_COLLAPSED_H - OVERLAP);
          }
        }

        return (
          <DocumentDeckCard
            key={doc.id}
            doc={doc}
            focused={isFocused}
            selected={isSelected}
            top={top}
            zIndex={isFocused ? docs.length + 1 : isSelected ? docs.length : i}
            onMouseEnter={() => setFocusedId(doc.id)}
            onSelect={() => onSelectDocument(doc.id)}
            onDelete={() => onDeleteDocument(doc)}
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

interface DocumentDeckCardProps {
  doc: DocumentSummary;
  focused: boolean;
  selected: boolean;
  top: number;
  zIndex: number;
  onMouseEnter: () => void;
  onSelect: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
}

function cardBorderColor(focused: boolean, selected: boolean, theme: Theme): string {
  if (selected) return theme.glow.animated ? theme.glow.borderStrong : theme.color.primary;
  if (focused) return theme.glow.animated ? theme.glow.borderMedium : theme.color.border;
  return theme.glow.borderSubtle;
}

function cardShadow(focused: boolean, selected: boolean, theme: Theme): string {
  if (focused) return theme.glow.animated ? theme.glow.shadowMd : theme.shadow.md;
  if (selected) return theme.glow.animated ? theme.glow.shadowSm : theme.shadow.sm;
  return "none";
}

function DocumentDeckCard({ doc, focused, selected, top, zIndex, onMouseEnter, onSelect, onDelete, onToggleFavorite }: DocumentDeckCardProps) {
  const { theme } = useTheme();
  const maxTags = 3;
  const overflowCount = doc.tags.length - maxTags;

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
        border: `1px solid ${cardBorderColor(focused, selected, theme)}`,
        background: focused || selected ? theme.color.surfaceContainerHigh : theme.color.surfaceContainer,
        boxShadow: cardShadow(focused, selected, theme),
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
      {/* Top row — always visible: title + presence + favorite */}
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
        <PresenceCharm active={doc.has_content} label="Content" color={theme.color.success} />
        {doc.favorite && (
          <Icon name="star" size={14} style={{ color: theme.color.warning, flexShrink: 0 }} />
        )}
      </div>

      {/* Expanded content — summary, tags, charms */}
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
            <span style={{ color: theme.color.textFaint, fontStyle: "italic" }}>No summary</span>
          )}
        </div>

        {/* Footer: tags + date + charms */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: theme.spacing.sm,
            marginTop: theme.spacing.xs,
          }}
        >
          {/* Tags */}
          {doc.tags.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", flex: 1, minWidth: 0 }}>
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
          {doc.tags.length === 0 && <div style={{ flex: 1 }} />}

          {/* Date */}
          <span style={{ fontSize: theme.font.size.xxs, color: theme.color.textFaint, flexShrink: 0 }}>
            {formatDate(doc.updated_at)}
          </span>

          {/* Charms */}
          <div style={{ display: "flex", alignItems: "center", gap: 0, flexShrink: 0 }}>
            <IconButton
              icon={doc.favorite ? "star" : "star_border"}
              size={14}
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
              aria-label={doc.favorite ? "Remove from favorites" : "Add to favorites"}
              style={{ width: 26, height: 26, minWidth: 26, color: doc.favorite ? theme.color.warning : theme.color.textFaint }}
            />
            <IconButton
              icon="content_copy"
              size={14}
              onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(doc.title); }}
              aria-label="Copy title"
              style={{ width: 26, height: 26, minWidth: 26, color: theme.color.textFaint }}
            />
            <IconButton
              icon="delete"
              size={14}
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              aria-label="Delete document"
              style={{ width: 26, height: 26, minWidth: 26, color: theme.color.textFaint }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
