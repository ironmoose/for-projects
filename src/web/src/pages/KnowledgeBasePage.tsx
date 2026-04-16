/**
 * KnowledgeBasePage — self-contained page component.
 *
 * UI dependencies: @4lt7ab/ui only. No internal atoms/molecules/organisms.
 * Data dependencies: hooks (useDocuments, useDocument) and api layer.
 *
 * This is a "Page component" — it owns its entire UI tree. Sub-components are
 * defined inline in this file, not extracted to the atomic hierarchy. This
 * trades reusability for iteration speed: one file to read, one file to change.
 */

import { useMemo, useState } from "react";
import { semantic as t, useInjectStyles } from "@4lt7ab/ui/core";
import {
  Button,
  IconButton,
  Icon,
  Badge,
  TagChip,
  EmptyState,
  Pagination,
  ConfirmDialog,
  FormModal,
  ModalShell,
  Field,
  Input,
  Textarea,
  SearchInput,
  Skeleton,
  SegmentedControl,
  SectionLabel,
  MetadataTable,
  ChipPicker,
  Combobox,
  Grid,
  useToast,
} from "@4lt7ab/ui/ui";
import { Container, Prose, Markdown } from "@4lt7ab/ui/content";

import { useDocuments } from "../hooks/useDocuments";
import { useDocument } from "../hooks/useDocument";
import { ApiError, importDocument } from "../api";
import { TAG_NAMES, TAG_CATEGORIES } from "../types";
import type { DocumentSummary } from "../types";
import { PillSelect } from "../components/PillSelect";
import { PageShell } from "../components/PageShell";
import { formatRelativeDate, formatShortDate, staggerStyle } from "../utils";

// ---------------------------------------------------------------------------
// Injected styles — hover effects, stagger animations, scrollbar hiding
// ---------------------------------------------------------------------------

const KB_STYLES_ID = "kb-page-styles";
const KB_STYLES_CSS = `
  .kb-card {
    transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
  }
  .kb-card:hover {
    transform: translateY(-2px);
    border-color: ${t.colorBorderFocused};
    box-shadow: ${t.shadowMd};
  }
  .kb-card:hover .kb-card-title {
    color: ${t.colorActionPrimary};
  }
  .kb-card-accent {
    transition: width 0.18s ease;
  }
  .kb-card:hover .kb-card-accent {
    width: 4px !important;
  }
  .kb-fav-strip::-webkit-scrollbar { display: none; }
  .kb-filter-chip {
    transition: all 0.15s ease;
  }
  .kb-filter-chip:hover {
    background: ${t.colorSurfaceRaised} !important;
  }
  .kb-list-row {
    transition: background 0.1s ease;
  }
  .kb-list-row:hover {
    background: ${t.colorSurfaceRaised};
  }
  @media (prefers-reduced-motion: reduce) {
    .kb-card, .kb-card-accent, .kb-list-row { transition: none; }
  }
`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Deterministic accent color per folder so cards cluster visually. */
function folderAccentColor(folder: string | null): string {
  if (!folder) return t.colorBorder;
  const accents = [
    t.colorActionPrimary,
    t.colorInfo,
    t.colorSuccess,
    t.colorWarning,
    t.colorError,
  ];
  let hash = 0;
  for (let i = 0; i < folder.length; i++) hash = ((hash << 5) - hash + folder.charCodeAt(i)) | 0;
  return accents[Math.abs(hash) % accents.length];
}

/** Build ChipPicker items from TAG_CATEGORIES. */
const TAG_CHIP_ITEMS = Object.entries(TAG_CATEGORIES).flatMap(([category, tags]) =>
  tags.map((tag) => ({ value: tag, label: tag, group: category })),
);

// ---------------------------------------------------------------------------
// Hero — welcoming header with centered search
// ---------------------------------------------------------------------------

function HeroSection({
  total,
  search,
  onSearchChange,
  onCreateClick,
  onImportClick,
}: {
  total: number;
  search: string;
  onSearchChange: (v: string) => void;
  onCreateClick: () => void;
  onImportClick: () => void;
}) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: t.spaceMd,
      padding: `${t.space2xl} 0 ${t.spaceLg}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: t.spaceSm }}>
        <Icon name="auto_stories" size={28} style={{ color: t.colorActionPrimary }} />
        <h1 style={{
          margin: 0,
          fontSize: t.fontSize2xl,
          fontWeight: 700,
          fontFamily: t.fontSerif,
          color: t.colorText,
          letterSpacing: t.letterSpacingTight,
        }}>
          Knowledge Base
        </h1>
      </div>
      <p style={{
        margin: 0,
        fontSize: t.fontSizeSm,
        color: t.colorTextMuted,
        textAlign: "center",
      }}>
        {total > 0
          ? `${total} document${total !== 1 ? "s" : ""} — search, browse, or add something new.`
          : "Your library is empty. Start building your knowledge base."}
      </p>
      <div style={{
        width: "100%",
        maxWidth: 520,
        display: "flex",
        gap: t.spaceSm,
        alignItems: "center",
      }}>
        <div style={{ flex: 1 }}>
          <SearchInput
            value={search}
            onSearch={onSearchChange}
            placeholder="Search your documents..."
            debounceMs={200}
          />
        </div>
        <Button size="sm" variant="ghost" onClick={onImportClick}>
          <Icon name="link" size={15} />
          Import
        </Button>
        <Button size="sm" onClick={onCreateClick}>
          <Icon name="add" size={15} />
          New
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Favorites strip — horizontal scrolling row of pinned docs
// ---------------------------------------------------------------------------

function FavoritesStrip({
  documents,
  onSelect,
}: {
  documents: DocumentSummary[];
  onSelect: (id: string) => void;
}) {
  if (documents.length === 0) return null;

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: t.spaceSm,
    }}>
      <SectionLabel>
        <span style={{ display: "inline-flex", alignItems: "center", gap: t.spaceXs }}>
          <Icon name="star" size={13} style={{ color: t.colorWarning }} />
          Favorites
        </span>
      </SectionLabel>
      <div
        className="kb-fav-strip"
        style={{
          display: "flex",
          gap: t.spaceSm,
          overflowX: "auto",
          scrollbarWidth: "none" as const,
          paddingBottom: t.spaceXs,
        }}
      >
        {documents.map((doc) => (
          <button
            key={doc.id}
            onClick={() => onSelect(doc.id)}
            style={{
              flex: "0 0 auto",
              display: "flex",
              alignItems: "center",
              gap: t.spaceXs,
              padding: `${t.spaceXs} ${t.spaceMd}`,
              borderRadius: t.radiusFull,
              border: `1px solid color-mix(in srgb, ${t.colorWarning} 25%, transparent)`,
              background: `color-mix(in srgb, ${t.colorWarning} 5%, transparent)`,
              color: t.colorText,
              fontSize: t.fontSizeXs,
              fontFamily: t.fontSans,
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
              maxWidth: 200,
              overflow: "hidden",
              textOverflow: "ellipsis",
              transition: "all 0.15s",
            }}
          >
            <Icon name="star" size={12} style={{ color: t.colorWarning, flexShrink: 0 }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{doc.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filter pills — light, horizontal, tappable
// ---------------------------------------------------------------------------

function FilterPills({
  tag,
  onTagChange,
  folder,
  onFolderChange,
  favorite,
  onFavoriteChange,
  folders,
  activeCount,
  onClearAll,
  viewMode,
  onViewModeChange,
}: {
  tag: string;
  onTagChange: (v: string) => void;
  folder: string;
  onFolderChange: (v: string) => void;
  favorite: boolean;
  onFavoriteChange: (v: boolean) => void;
  folders: string[];
  activeCount: number;
  onClearAll: () => void;
  viewMode: "table" | "cards";
  onViewModeChange: (v: "table" | "cards") => void;
}) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: t.spaceSm,
      flexWrap: "wrap",
    }}>
      {/* View toggle */}
      <SegmentedControl
        size="sm"
        segments={[
          { value: "cards", label: "", icon: "grid_view" },
          { value: "table", label: "", icon: "view_list" },
        ]}
        value={viewMode}
        onChange={(v) => onViewModeChange(v as "table" | "cards")}
      />

      <div style={{
        width: 1,
        height: 20,
        background: `color-mix(in srgb, ${t.colorBorder} 50%, transparent)`,
        flexShrink: 0,
      }} />

      {/* Favorite toggle */}
      <FilterChip
        label="Favorites"
        icon="star"
        active={favorite}
        onClick={() => onFavoriteChange(!favorite)}
      />

      {/* Tag filter */}
      <PillSelect
        value={tag}
        options={[{ value: "", label: "Tag" }, ...TAG_NAMES.map((n) => ({ value: n, label: n }))]}
        onChange={onTagChange}
        ariaLabel="Filter by tag"
      />

      {/* Folder filter */}
      {folders.length > 0 && (
        <PillSelect
          value={folder}
          options={[{ value: "", label: "Folder" }, ...folders.map((f) => ({ value: f, label: f }))]}
          onChange={onFolderChange}
          ariaLabel="Filter by folder"
        />
      )}

      {/* Clear all */}
      {activeCount > 0 && (
        <button
          onClick={onClearAll}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: `6px ${t.spaceMd}`,
            borderRadius: t.radiusFull,
            border: "none",
            background: "transparent",
            color: t.colorTextMuted,
            fontSize: t.fontSizeSm,
            minHeight: 32,
            fontFamily: t.fontSans,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <Icon name="close" size={12} />
          Clear
        </button>
      )}
    </div>
  );
}

function FilterChip({ label, icon, active, onClick }: { label: string; icon: string; active: boolean; onClick: () => void }) {
  return (
    <button
      className="kb-filter-chip"
      onClick={onClick}
      aria-pressed={active}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: `6px ${t.spaceMd}`,
        borderRadius: t.radiusFull,
        border: `1px solid ${active ? t.colorActionPrimary : `color-mix(in srgb, ${t.colorBorder} 60%, transparent)`}`,
        background: active ? `color-mix(in srgb, ${t.colorActionPrimary} 8%, transparent)` : "transparent",
        color: active ? t.colorActionPrimary : t.colorTextMuted,
        fontSize: t.fontSizeSm,
        fontFamily: t.fontSans,
        fontWeight: 600,
        cursor: "pointer",
        minHeight: 32,
      }}
    >
      <Icon name={icon} size={15} />
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Document card grid — index-card style browsing
// ---------------------------------------------------------------------------

function DocumentCardGrid({
  documents,
  onSelect,
  onDelete,
  onToggleFavorite,
}: {
  documents: DocumentSummary[];
  onSelect: (id: string) => void;
  onDelete: (doc: DocumentSummary) => void;
  onToggleFavorite: (doc: DocumentSummary) => void;
}) {
  return (
    <Grid minColumnWidth={280} gap="md">
      {documents.map((doc, i) => {
        const accent = folderAccentColor(doc.folder);
        return (
          <div
            key={doc.id}
            className="kb-card"
            role="button"
            tabIndex={0}
            onClick={() => onSelect(doc.id)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(doc.id); } }}
            style={{
              display: "flex",
              borderRadius: t.radiusLg,
              border: `1px solid ${t.colorBorder}`,
              background: t.colorSurfaceSolid,
              boxShadow: t.shadowSm,
              cursor: "pointer",
              overflow: "hidden",
              ...staggerStyle(i),
            }}
          >
            {/* Left accent bar */}
            <div
              className="kb-card-accent"
              style={{
                width: 3,
                flexShrink: 0,
                background: `color-mix(in srgb, ${accent} 60%, transparent)`,
                borderRadius: `${t.radiusLg} 0 0 ${t.radiusLg}`,
              }}
            />

            {/* Content */}
            <div style={{
              flex: 1,
              padding: t.spaceMd,
              display: "flex",
              flexDirection: "column",
              gap: t.spaceSm,
              minWidth: 0,
            }}>
              {/* Title row */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: t.spaceXs }}>
                <Icon
                  name="description"
                  size={16}
                  style={{
                    color: `color-mix(in srgb, ${accent} 70%, ${t.colorTextMuted})`,
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                />
                <h3
                  className="kb-card-title"
                  style={{
                    margin: 0,
                    fontSize: t.fontSizeSm,
                    fontWeight: 700,
                    fontFamily: t.fontSans,
                    color: t.colorText,
                    flex: 1,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    transition: "color 0.15s",
                  }}
                >
                  {doc.title}
                </h3>
                <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                  <IconButton
                    icon={doc.favorite ? "star" : "star_border"}
                    aria-label={doc.favorite ? "Remove from favorites" : "Add to favorites"}
                    size={16}
                    onClick={(e) => { e.stopPropagation(); onToggleFavorite(doc); }}
                  />
                  <IconButton
                    icon="delete"
                    aria-label={`Delete ${doc.title}`}
                    size={16}
                    onClick={(e) => { e.stopPropagation(); onDelete(doc); }}
                  />
                </div>
              </div>

              {/* Summary — 3 lines max */}
              {doc.summary ? (
                <p style={{
                  margin: 0,
                  fontSize: t.fontSizeXs,
                  color: t.colorTextMuted,
                  lineHeight: t.lineHeightRelaxed,
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}>
                  {doc.summary}
                </p>
              ) : (
                <p style={{
                  margin: 0,
                  fontSize: t.fontSizeXs,
                  color: `color-mix(in srgb, ${t.colorTextMuted} 50%, transparent)`,
                  fontStyle: "italic",
                }}>
                  No summary
                </p>
              )}

              {/* Tags */}
              {doc.tags.length > 0 && (
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {doc.tags.slice(0, 3).map((tag) => (
                    <span key={tag} style={{
                      padding: `1px ${t.spaceXs}`,
                      borderRadius: t.radiusSm,
                      background: `color-mix(in srgb, ${t.colorBorder} 40%, transparent)`,
                      fontSize: "0.65rem",
                      fontFamily: t.fontMono,
                      fontWeight: 500,
                      color: t.colorTextMuted,
                      letterSpacing: "0.02em",
                    }}>
                      {tag}
                    </span>
                  ))}
                  {doc.tags.length > 3 && (
                    <span style={{
                      padding: `1px ${t.spaceXs}`,
                      fontSize: "0.65rem",
                      color: t.colorTextMuted,
                    }}>
                      +{doc.tags.length - 3}
                    </span>
                  )}
                </div>
              )}

              {/* Footer */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "auto",
                fontSize: "0.65rem",
                color: `color-mix(in srgb, ${t.colorTextMuted} 70%, transparent)`,
                fontFamily: t.fontMono,
              }}>
                {doc.folder ? (
                  <span style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    color: `color-mix(in srgb, ${folderAccentColor(doc.folder)} 80%, ${t.colorTextMuted})`,
                  }}>
                    <Icon name="folder" size={10} />
                    {doc.folder}
                  </span>
                ) : <span />}
                <span>{formatRelativeDate(doc.updated_at)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </Grid>
  );
}

// ---------------------------------------------------------------------------
// Document list — compact catalog listing
// ---------------------------------------------------------------------------

function DocumentList({
  documents,
  onSelect,
  onDelete,
  onToggleFavorite,
}: {
  documents: DocumentSummary[];
  onSelect: (id: string) => void;
  onDelete: (doc: DocumentSummary) => void;
  onToggleFavorite: (doc: DocumentSummary) => void;
}) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      background: t.colorSurfaceSolid,
      borderRadius: t.radiusMd,
      border: `1px solid ${t.colorBorder}`,
      overflow: "hidden",
      flexShrink: 0,
    }}>
      {documents.map((doc, i) => {
        const accent = folderAccentColor(doc.folder);
        return (
          <div
            key={doc.id}
            className="kb-list-row"
            role="button"
            tabIndex={0}
            onClick={() => onSelect(doc.id)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(doc.id); } }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: t.spaceMd,
              padding: `${t.spaceSm} ${t.spaceMd}`,
              borderBottom: `1px solid color-mix(in srgb, ${t.colorBorder} 30%, transparent)`,
              cursor: "pointer",
              ...staggerStyle(i, { delayMs: 20, maxMs: 200, duration: 0.25 }),
            }}
          >
            {/* Document icon with accent color */}
            <Icon
              name="description"
              size={16}
              style={{
                color: `color-mix(in srgb, ${accent} 70%, ${t.colorTextMuted})`,
                flexShrink: 0,
              }}
            />

            {/* Favorite */}
            <IconButton
              icon={doc.favorite ? "star" : "star_border"}
              aria-label={doc.favorite ? "Remove from favorites" : "Add to favorites"}
              size={16}
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(doc); }}
            />

            {/* Title + summary */}
            <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
              <span style={{
                fontWeight: 600,
                fontSize: t.fontSizeSm,
                color: t.colorText,
              }}>
                {doc.title}
              </span>
              {doc.summary && (
                <span style={{
                  marginLeft: t.spaceXs,
                  fontSize: t.fontSizeXs,
                  color: t.colorTextMuted,
                }}>
                  — {doc.summary}
                </span>
              )}
            </div>

            {/* Tags */}
            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              {doc.tags.slice(0, 2).map((tag) => (
                <span key={tag} style={{
                  padding: `1px ${t.spaceXs}`,
                  borderRadius: t.radiusSm,
                  background: `color-mix(in srgb, ${t.colorBorder} 40%, transparent)`,
                  fontSize: "0.65rem",
                  fontFamily: t.fontMono,
                  fontWeight: 500,
                  color: t.colorTextMuted,
                }}>
                  {tag}
                </span>
              ))}
            </div>

            {/* Folder */}
            {doc.folder && (
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                fontSize: "0.65rem",
                fontFamily: t.fontMono,
                color: `color-mix(in srgb, ${accent} 80%, ${t.colorTextMuted})`,
                flexShrink: 0,
                maxWidth: 100,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                <Icon name="folder" size={10} />
                {doc.folder}
              </span>
            )}

            {/* Date */}
            <span style={{
              fontSize: "0.65rem",
              fontFamily: t.fontMono,
              color: `color-mix(in srgb, ${t.colorTextMuted} 70%, transparent)`,
              flexShrink: 0,
              width: 60,
              textAlign: "right",
            }}>
              {formatRelativeDate(doc.updated_at)}
            </span>

            {/* Delete */}
            <IconButton
              icon="delete"
              aria-label={`Delete ${doc.title}`}
              size={16}
              onClick={(e) => { e.stopPropagation(); onDelete(doc); }}
            />
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Document reader modal — the library reading experience
// ---------------------------------------------------------------------------

function DocumentReader({ documentId, onClose }: { documentId: string; onClose: () => void }) {
  const { document: doc, loading, notFound } = useDocument(documentId);

  // Build metadata rows for MetadataTable
  const metadataItems = useMemo(() => {
    if (!doc) return [];
    const items: Array<{ label: string; value: React.ReactNode }> = [];

    if (doc.folder) {
      const accent = folderAccentColor(doc.folder);
      items.push({
        label: "Folder",
        value: (
          <span style={{ display: "inline-flex", alignItems: "center", gap: t.spaceXs }}>
            <Icon name="folder" size={14} style={{ color: accent }} />
            {doc.folder}
          </span>
        ),
      });
    }

    if (doc.tags.length > 0) {
      items.push({
        label: "Tags",
        value: (
          <span style={{ display: "inline-flex", gap: t.spaceXs, flexWrap: "wrap" }}>
            {doc.tags.map((tag) => <TagChip key={tag} name={tag} />)}
          </span>
        ),
      });
    }

    if (doc.source_url) {
      items.push({
        label: "Source",
        value: (
          <a
            href={doc.source_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: t.colorTextLink,
              textDecoration: "none",
              fontSize: t.fontSizeSm,
              wordBreak: "break-all",
            }}
          >
            {doc.source_url}
          </a>
        ),
      });
    }

    items.push({ label: "Created", value: formatShortDate(doc.created_at) });
    items.push({ label: "Updated", value: formatShortDate(doc.updated_at) });

    return items;
  }, [doc]);

  return (
    <ModalShell onClose={onClose} maxWidth={800} style={{ maxHeight: "90vh", overflowY: "auto", background: t.colorSurfaceSolid }}>
      {loading ? (
        <div style={{ padding: t.spaceXl }}>
          <Container width="prose">
            <div style={{ display: "flex", flexDirection: "column", gap: t.spaceMd }}>
              <Skeleton height={36} width="70%" />
              <Skeleton height={18} width="50%" />
              <Skeleton height={1} />
              <Skeleton height={300} />
            </div>
          </Container>
        </div>
      ) : notFound ? (
        <div style={{ padding: t.spaceXl }}>
          <EmptyState icon="error" message="Document not found." />
        </div>
      ) : doc ? (
        <div style={{ padding: `${t.space2xl} 0 ${t.spaceXl}` }}>
          <Container width="prose">
            {/* Header — serif title, summary, metadata */}
            <header style={{ marginBottom: t.spaceLg }}>
              {/* Title */}
              <h1 style={{
                margin: 0,
                fontSize: "clamp(1.5rem, 4vw, 2rem)",
                fontWeight: 600,
                fontFamily: t.fontSerif,
                color: t.colorText,
                lineHeight: 1.25,
                letterSpacing: t.letterSpacingTight,
              }}>
                {doc.title}
              </h1>

              {/* Summary */}
              {doc.summary && (
                <p style={{
                  margin: `${t.spaceMd} 0 0`,
                  fontSize: t.fontSizeLg,
                  fontFamily: t.fontSans,
                  color: t.colorTextSecondary,
                  lineHeight: t.lineHeightRelaxed,
                }}>
                  {doc.summary}
                </p>
              )}

              {/* Favorite badge */}
              {doc.favorite && (
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: t.spaceXs,
                  marginTop: t.spaceMd,
                }}>
                  <Icon name="star" size={16} style={{ color: t.colorWarning }} />
                  <span style={{
                    fontSize: t.fontSizeXs,
                    fontWeight: 600,
                    color: t.colorWarning,
                    textTransform: "uppercase",
                    letterSpacing: t.letterSpacingWide,
                  }}>
                    Favorite
                  </span>
                </div>
              )}

              {/* Metadata table */}
              {metadataItems.length > 0 && (
                <div style={{ marginTop: t.spaceLg }}>
                  <MetadataTable items={metadataItems} />
                </div>
              )}
            </header>

            {/* Divider */}
            <hr style={{
              border: "none",
              borderTop: `1px solid ${t.colorBorder}`,
              margin: `${t.spaceLg} 0`,
            }} />

            {/* Content — the star of the show */}
            {doc.content ? (
              <Markdown>{doc.content}</Markdown>
            ) : (
              <EmptyState icon="article" message="This document has no content yet." variant="card" />
            )}
          </Container>
        </div>
      ) : null}
    </ModalShell>
  );
}

// ---------------------------------------------------------------------------
// Create document form
// ---------------------------------------------------------------------------

function CreateDocumentForm({
  folders,
  onCreate,
  onClose,
}: {
  folders: string[];
  onCreate: (input: { title: string; summary?: string; content?: string; tags?: string[]; folder?: string | null }) => Promise<void>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [folder, setFolder] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const folderOptions = useMemo(() =>
    folders.map((f) => ({ value: f, label: f })),
    [folders],
  );

  return (
    <FormModal
      title="New Document"
      submitLabel="Create"
      onSubmit={async () => {
        await onCreate({
          title,
          ...(summary ? { summary } : {}),
          ...(content ? { content } : {}),
          ...(selectedTags.length > 0 ? { tags: selectedTags } : {}),
          ...(folder ? { folder } : { folder: null }),
        });
        onClose();
      }}
      onCancel={onClose}
      maxWidth={600}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: t.spaceMd }}>
        <Field label="Title" required>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Document title"
          />
        </Field>

        <Field label="Summary">
          <Input
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Brief summary (optional)"
          />
        </Field>

        <Field label="Folder">
          <Combobox
            options={folderOptions}
            value={folder}
            onChange={setFolder}
            placeholder="Type a folder name or pick existing..."
          />
        </Field>

        <Field label="Tags">
          <ChipPicker
            items={TAG_CHIP_ITEMS}
            selected={selectedTags}
            onChange={setSelectedTags}
          />
        </Field>

        <Field label="Content">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Markdown content (optional)"
            rows={8}
          />
        </Field>
      </div>
    </FormModal>
  );
}

// ---------------------------------------------------------------------------
// Import URL form
// ---------------------------------------------------------------------------

function ImportUrlForm({
  folders,
  onImport,
  onClose,
}: {
  folders: string[];
  onImport: (input: { url: string; folder?: string; tags?: string[] }) => Promise<void>;
  onClose: () => void;
}) {
  const [url, setUrl] = useState("");
  const [folder, setFolder] = useState("");

  const folderOptions = useMemo(() =>
    folders.map((f) => ({ value: f, label: f })),
    [folders],
  );

  return (
    <FormModal
      title="Import from URL"
      submitLabel="Import"
      onSubmit={async () => {
        await onImport({
          url,
          ...(folder ? { folder } : {}),
        });
        onClose();
      }}
      onCancel={onClose}
      maxWidth={480}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: t.spaceMd }}>
        <Field label="URL" required>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/owner/repo/blob/main/README.md"
          />
        </Field>

        <Field label="Folder">
          <Combobox
            options={folderOptions}
            value={folder}
            onChange={setFolder}
            placeholder="Type a folder name or pick existing..."
          />
        </Field>
      </div>
    </FormModal>
  );
}

// ---------------------------------------------------------------------------
// KnowledgeBasePage
// ---------------------------------------------------------------------------

export function KnowledgeBasePage() {
  useInjectStyles(KB_STYLES_ID, KB_STYLES_CSS);
  const { showToast } = useToast();

  // Filters
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [folderFilter, setFolderFilter] = useState("");
  const [favoriteFilter, setFavoriteFilter] = useState(false);

  // View
  const [viewMode, setViewMode] = useState<"table" | "cards">("cards");

  // Modals
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocumentSummary | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);

  // Data
  const filter = {
    ...(search ? { title: search } : {}),
    ...(tagFilter ? { tag: tagFilter } : {}),
    ...(folderFilter ? { folder: folderFilter } : {}),
    ...(favoriteFilter ? { favorite: true as const } : {}),
  };

  const { documents, loading, total, totalPages, page, setPage, create, update, remove } =
    useDocuments(Object.keys(filter).length > 0 ? filter : undefined);

  const knownFolders = useMemo(() => {
    const set = new Set<string>();
    for (const doc of documents) {
      if (doc.folder) set.add(doc.folder);
    }
    return [...set].sort();
  }, [documents]);

  const sorted = useMemo(
    () => [...documents].sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
    [documents],
  );

  const favorites = useMemo(
    () => sorted.filter((d) => d.favorite),
    [sorted],
  );

  const activeFilterCount = [tagFilter, folderFilter, favoriteFilter].filter(Boolean).length;

  function clearFilters() {
    setTagFilter("");
    setFolderFilter("");
    setFavoriteFilter(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await remove([deleteTarget.id]);
      if (selectedDocId === deleteTarget.id) setSelectedDocId(null);
      setDeleteTarget(null);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to delete document");
    }
  }

  return (
    <PageShell topPadding={false}>
      {/* Hero */}
      <HeroSection
        total={total}
        search={search}
        onSearchChange={setSearch}
        onCreateClick={() => setShowCreate(true)}
        onImportClick={() => setShowImport(true)}
      />

      {/* Favorites strip */}
      {!favoriteFilter && favorites.length > 0 && (
        <FavoritesStrip
          documents={favorites}
          onSelect={setSelectedDocId}
        />
      )}

      {/* Filters + view toggle */}
      <FilterPills
        tag={tagFilter}
        onTagChange={setTagFilter}
        folder={folderFilter}
        onFolderChange={setFolderFilter}
        favorite={favoriteFilter}
        onFavoriteChange={setFavoriteFilter}
        folders={knownFolders}
        activeCount={activeFilterCount}
        onClearAll={clearFilters}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Content */}
      {loading ? (
        viewMode === "cards" ? (
          <Grid minColumnWidth={280} gap="md">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} height={140} />
            ))}
          </Grid>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} height={40} />
            ))}
          </div>
        )
      ) : sorted.length === 0 ? (
        <EmptyState
          icon="menu_book"
          message={
            activeFilterCount > 0 || search
              ? "Nothing matches those filters. Try broadening your search."
              : "Your library is waiting. Import a URL or write your first document."
          }
          action={
            !search && activeFilterCount === 0 ? (
              <div style={{ display: "flex", gap: t.spaceSm }}>
                <Button size="sm" variant="ghost" onClick={() => setShowImport(true)}>
                  Import URL
                </Button>
                <Button size="sm" onClick={() => setShowCreate(true)}>
                  New Document
                </Button>
              </div>
            ) : undefined
          }
        />
      ) : viewMode === "cards" ? (
        <DocumentCardGrid
          documents={sorted}
          onSelect={setSelectedDocId}
          onDelete={setDeleteTarget}
          onToggleFavorite={(doc) => update(doc.id, { favorite: !doc.favorite })}
        />
      ) : (
        <DocumentList
          documents={sorted}
          onSelect={setSelectedDocId}
          onDelete={setDeleteTarget}
          onToggleFavorite={(doc) => update(doc.id, { favorite: !doc.favorite })}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          onPageChange={setPage}
        />
      )}

      {/* Reader modal */}
      {selectedDocId && (
        <DocumentReader
          documentId={selectedDocId}
          onClose={() => setSelectedDocId(null)}
        />
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete Document"
          message={`Delete "${deleteTarget.title}"? This cannot be undone.`}
          variant="destructive"
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Create form */}
      {showCreate && (
        <CreateDocumentForm
          folders={knownFolders}
          onCreate={async (fields) => {
            try {
              await create(fields);
              showToast("Document created", "success");
            } catch (err) {
              showToast(err instanceof ApiError ? err.message : "Failed to create document");
              throw err;
            }
          }}
          onClose={() => setShowCreate(false)}
        />
      )}

      {/* Import form */}
      {showImport && (
        <ImportUrlForm
          folders={knownFolders}
          onImport={async (fields) => {
            try {
              await importDocument(fields);
              showToast("Document imported", "success");
            } catch (err) {
              showToast(err instanceof ApiError ? err.message : "Failed to import");
              throw err;
            }
          }}
          onClose={() => setShowImport(false)}
        />
      )}
    </PageShell>
  );
}
