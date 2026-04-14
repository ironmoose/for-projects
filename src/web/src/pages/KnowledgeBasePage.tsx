/**
 * KnowledgeBasePage — self-contained page component.
 *
 * UI dependencies: @4lt7ab/ui only. No internal atoms/molecules/organisms.
 * Data dependencies: hooks (useDocuments, useDocument, useHealth) and api layer.
 *
 * This is a "Page component" — it owns its entire UI tree. Sub-components are
 * defined inline in this file, not extracted to the atomic hierarchy. This
 * trades reusability for iteration speed: one file to read, one file to change.
 */

import { useMemo, useState } from "react";
import { semantic as t, useInjectStyles, KEYFRAMES } from "@4lt7ab/ui/core";
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
  Select,
  SearchInput,
  Skeleton,
  SegmentedControl,
  useToast,
} from "@4lt7ab/ui/ui";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { useDocuments } from "../hooks/useDocuments";
import { useDocument } from "../hooks/useDocument";
import { ApiError, importDocument } from "../api";
import { TAG_NAMES } from "../types";
import type { DocumentSummary } from "../types";

// ---------------------------------------------------------------------------
// Injected styles — hover effects, stagger animations, scrollbar hiding
// ---------------------------------------------------------------------------

const KB_STYLES_ID = "kb-page-styles";
const KB_STYLES_CSS = `
  .kb-card {
    transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  }
  .kb-card:hover {
    transform: translateY(-3px);
    border-color: ${t.colorBorderFocused};
    box-shadow: ${t.shadowMd};
  }
  .kb-card:hover .kb-card-title {
    color: ${t.colorActionPrimary};
  }
  .kb-card-accent {
    transition: width 0.2s ease;
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
  @media (prefers-reduced-motion: reduce) {
    .kb-card { transition: none; }
    .kb-card-accent { transition: none; }
  }
`;

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
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: t.spaceXs,
        paddingLeft: t.spaceXs,
      }}>
        <Icon name="star" size={14} style={{ color: t.colorWarning }} />
        <span style={{
          fontSize: t.fontSizeXs,
          fontWeight: 700,
          fontFamily: t.fontSans,
          color: t.colorTextMuted,
          textTransform: "uppercase",
          letterSpacing: t.letterSpacingWide,
        }}>
          Favorites
        </span>
      </div>
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
      <div style={{ position: "relative" }}>
        <select
          value={tag}
          onChange={(e) => onTagChange(e.target.value)}
          aria-label="Filter by tag"
          style={{
            appearance: "none",
            padding: `4px ${t.spaceLg} 4px ${t.spaceSm}`,
            borderRadius: t.radiusFull,
            border: `1px solid ${tag ? t.colorActionPrimary : `color-mix(in srgb, ${t.colorBorder} 60%, transparent)`}`,
            background: tag ? `color-mix(in srgb, ${t.colorActionPrimary} 8%, transparent)` : "transparent",
            color: tag ? t.colorActionPrimary : t.colorTextMuted,
            fontSize: t.fontSizeXs,
            fontFamily: t.fontSans,
            fontWeight: 600,
            cursor: "pointer",
            outline: "none",
          }}
        >
          <option value="">Tag</option>
          {TAG_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <Icon name="expand_more" size={12} style={{
          position: "absolute",
          right: 8,
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
          color: tag ? t.colorActionPrimary : t.colorTextMuted,
        }} />
      </div>

      {/* Folder filter */}
      {folders.length > 0 && (
        <div style={{ position: "relative" }}>
          <select
            value={folder}
            onChange={(e) => onFolderChange(e.target.value)}
            aria-label="Filter by folder"
            style={{
              appearance: "none",
              padding: `4px ${t.spaceLg} 4px ${t.spaceSm}`,
              borderRadius: t.radiusFull,
              border: `1px solid ${folder ? t.colorActionPrimary : `color-mix(in srgb, ${t.colorBorder} 60%, transparent)`}`,
              background: folder ? `color-mix(in srgb, ${t.colorActionPrimary} 8%, transparent)` : "transparent",
              color: folder ? t.colorActionPrimary : t.colorTextMuted,
              fontSize: t.fontSizeXs,
              fontFamily: t.fontSans,
              fontWeight: 600,
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="">Folder</option>
            {folders.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <Icon name="expand_more" size={12} style={{
            position: "absolute",
            right: 8,
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
            color: folder ? t.colorActionPrimary : t.colorTextMuted,
          }} />
        </div>
      )}

      {/* Clear all */}
      {activeCount > 0 && (
        <button
          onClick={onClearAll}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: `4px ${t.spaceSm}`,
            borderRadius: t.radiusFull,
            border: "none",
            background: "transparent",
            color: t.colorTextMuted,
            fontSize: t.fontSizeXs,
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
        padding: `4px ${t.spaceSm}`,
        borderRadius: t.radiusFull,
        border: `1px solid ${active ? t.colorActionPrimary : `color-mix(in srgb, ${t.colorBorder} 60%, transparent)`}`,
        background: active ? `color-mix(in srgb, ${t.colorActionPrimary} 8%, transparent)` : "transparent",
        color: active ? t.colorActionPrimary : t.colorTextMuted,
        fontSize: t.fontSizeXs,
        fontFamily: t.fontSans,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      <Icon name={icon} size={13} />
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Document card grid — the main browsing experience
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
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
      gap: t.spaceMd,
    }}>
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
              background: t.colorSurface,
              boxShadow: t.shadowSm,
              cursor: "pointer",
              overflow: "hidden",
              animation: `${KEYFRAMES.fadeInUp} 0.3s ease both`,
              animationDelay: `${Math.min(i * 30, 300)}ms`,
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
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
    </div>
  );
}

// ---------------------------------------------------------------------------
// Document table — compact list view
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
    <div style={{ display: "flex", flexDirection: "column" }}>
      {documents.map((doc, i) => {
        const accent = folderAccentColor(doc.folder);
        return (
          <div
            key={doc.id}
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
              transition: "background 0.1s",
              animation: `${KEYFRAMES.fadeInUp} 0.25s ease both`,
              animationDelay: `${Math.min(i * 20, 200)}ms`,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = t.colorSurfaceRaised; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            {/* Accent dot */}
            <div style={{
              width: 6,
              height: 6,
              borderRadius: t.radiusFull,
              background: `color-mix(in srgb, ${accent} 60%, transparent)`,
              flexShrink: 0,
            }} />

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
// Markdown component overrides — sans-serif, compact, no editorial flourishes
// ---------------------------------------------------------------------------

const mdComponents: Record<string, React.ComponentType<Record<string, unknown>>> = {
  h1: ({ children, ...p }) => (
    <h1 {...p} style={{ fontSize: t.fontSizeXl, fontWeight: 700, fontFamily: t.fontSans, color: t.colorText, margin: `${t.spaceLg} 0 ${t.spaceSm}` }}>
      {children as React.ReactNode}
    </h1>
  ),
  h2: ({ children, ...p }) => (
    <h2 {...p} style={{ fontSize: t.fontSizeLg, fontWeight: 700, fontFamily: t.fontSans, color: t.colorText, margin: `${t.spaceLg} 0 ${t.spaceSm}` }}>
      {children as React.ReactNode}
    </h2>
  ),
  h3: ({ children, ...p }) => (
    <h3 {...p} style={{ fontSize: t.fontSizeBase, fontWeight: 600, fontFamily: t.fontSans, color: t.colorText, margin: `${t.spaceMd} 0 ${t.spaceXs}` }}>
      {children as React.ReactNode}
    </h3>
  ),
  p: ({ children, ...p }) => (
    <p {...p} style={{ margin: `${t.spaceSm} 0` }}>{children as React.ReactNode}</p>
  ),
  a: ({ children, href, ...p }) => (
    <a {...p} href={href as string} style={{ color: t.colorTextLink, textDecoration: "underline", textUnderlineOffset: "3px" }}>
      {children as React.ReactNode}
    </a>
  ),
  ul: ({ children, ...p }) => (
    <ul {...p} style={{ paddingLeft: "1.25rem", margin: `${t.spaceSm} 0` }}>{children as React.ReactNode}</ul>
  ),
  ol: ({ children, ...p }) => (
    <ol {...p} style={{ paddingLeft: "1.25rem", margin: `${t.spaceSm} 0` }}>{children as React.ReactNode}</ol>
  ),
  li: ({ children, ...p }) => (
    <li {...p} style={{ marginTop: "0.25em" }}>{children as React.ReactNode}</li>
  ),
  blockquote: ({ children, ...p }) => (
    <blockquote {...p} style={{ borderLeft: `3px solid ${t.colorBorder}`, paddingLeft: t.spaceMd, margin: `${t.spaceMd} 0`, color: t.colorTextSecondary }}>
      {children as React.ReactNode}
    </blockquote>
  ),
  pre: ({ children, ...p }) => (
    <pre {...p} style={{
      background: t.colorSurfacePanel,
      border: `1px solid ${t.colorBorder}`,
      borderRadius: t.radiusMd,
      padding: t.spaceMd,
      margin: `${t.spaceMd} 0`,
      overflowX: "auto",
      fontSize: t.fontSizeXs,
      lineHeight: t.lineHeightBase,
    }}>
      {children as React.ReactNode}
    </pre>
  ),
  code: ({ children, className, ...p }) => {
    if (className) {
      return <code {...p} className={className as string} style={{ fontFamily: t.fontMono, fontSize: "inherit", color: t.colorTextSecondary }}>{children as React.ReactNode}</code>;
    }
    return (
      <code {...p} style={{ fontFamily: t.fontMono, fontSize: "0.875em", background: t.colorSurfacePanel, padding: "0.1em 0.3em", borderRadius: t.radiusSm }}>
        {children as React.ReactNode}
      </code>
    );
  },
  table: ({ children, ...p }) => (
    <table {...p} style={{ width: "100%", borderCollapse: "collapse", margin: `${t.spaceMd} 0`, fontSize: t.fontSizeXs }}>
      {children as React.ReactNode}
    </table>
  ),
  th: ({ children, ...p }) => (
    <th {...p} style={{ textAlign: "left", fontWeight: 600, padding: `${t.spaceXs} ${t.spaceSm}`, borderBottom: `2px solid ${t.colorBorder}`, color: t.colorText }}>
      {children as React.ReactNode}
    </th>
  ),
  td: ({ children, ...p }) => (
    <td {...p} style={{ padding: `${t.spaceXs} ${t.spaceSm}`, borderBottom: `1px solid ${t.colorBorder}`, color: t.colorTextSecondary }}>
      {children as React.ReactNode}
    </td>
  ),
  hr: (p) => (
    <hr {...p} style={{ border: "none", borderTop: `1px solid ${t.colorBorder}`, margin: `${t.spaceLg} 0` }} />
  ),
  strong: ({ children, ...p }) => (
    <strong {...p} style={{ fontWeight: 600, color: t.colorText }}>{children as React.ReactNode}</strong>
  ),
};

// ---------------------------------------------------------------------------
// Document reader modal
// ---------------------------------------------------------------------------

function DocumentReader({ documentId, onClose }: { documentId: string; onClose: () => void }) {
  const { document: doc, loading, notFound } = useDocument(documentId);

  return (
    <ModalShell onClose={onClose} maxWidth={720} style={{ maxHeight: "85vh", overflowY: "auto" }}>
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: t.spaceMd, padding: t.spaceMd }}>
          <Skeleton height={28} width="60%" />
          <Skeleton height={16} width="40%" />
          <Skeleton height={200} />
        </div>
      ) : notFound ? (
        <EmptyState icon="error" message="Document not found." />
      ) : doc ? (
        <div style={{ display: "flex", flexDirection: "column", gap: t.spaceMd }}>
          {/* Header */}
          <div>
            <h2 style={{
              margin: 0,
              fontSize: t.fontSizeXl,
              fontWeight: 700,
              fontFamily: t.fontSerif,
              color: t.colorText,
            }}>
              {doc.title}
            </h2>
            {doc.summary && (
              <p style={{
                margin: `${t.spaceXs} 0 0`,
                fontSize: t.fontSizeSm,
                color: t.colorTextSecondary,
              }}>
                {doc.summary}
              </p>
            )}
          </div>

          {/* Meta row */}
          <div style={{ display: "flex", gap: t.spaceSm, alignItems: "center", flexWrap: "wrap" }}>
            {doc.folder && (
              <Badge variant="default">
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Icon name="folder" size={12} />
                  {doc.folder}
                </span>
              </Badge>
            )}
            {doc.tags.map((tag) => (
              <TagChip key={tag} name={tag} />
            ))}
            {doc.favorite && (
              <Icon name="star" size={16} style={{ color: t.colorWarning }} />
            )}
          </div>

          {/* Content */}
          {doc.content ? (
            <div style={{
              borderTop: `1px solid ${t.colorBorder}`,
              paddingTop: t.spaceMd,
              fontSize: t.fontSizeSm,
              lineHeight: t.lineHeightRelaxed,
              fontFamily: t.fontSans,
              color: t.colorTextMuted,
            }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                {doc.content}
              </ReactMarkdown>
            </div>
          ) : (
            <EmptyState icon="info" message="No content." variant="card" />
          )}

          {/* Source info */}
          {doc.source_url && (
            <div style={{
              borderTop: `1px solid ${t.colorBorder}`,
              paddingTop: t.spaceSm,
              fontSize: t.fontSizeXs,
              color: t.colorTextMuted,
              display: "flex",
              alignItems: "center",
              gap: t.spaceXs,
            }}>
              <Icon name="link" size={12} />
              <a
                href={doc.source_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: t.colorTextLink, textDecoration: "none" }}
              >
                {doc.source_url}
              </a>
            </div>
          )}
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

  const folderOptions = [
    { value: "", label: "No folder" },
    ...folders.map((f) => ({ value: f, label: f })),
  ];

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
      maxWidth={560}
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

        {folders.length > 0 && (
          <Field label="Folder">
            <Select value={folder} onChange={(e) => setFolder(e.target.value)}>
              {folderOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </Field>
        )}

        <Field label="Tags">
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {TAG_NAMES.map((tag) => {
              const active = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() =>
                    setSelectedTags(
                      active
                        ? selectedTags.filter((t) => t !== tag)
                        : [...selectedTags, tag],
                    )
                  }
                  aria-pressed={active}
                  style={{
                    padding: `2px ${t.spaceSm}`,
                    borderRadius: t.radiusFull,
                    border: `1px solid ${active ? t.colorActionPrimary : t.colorBorder}`,
                    background: active ? `color-mix(in srgb, ${t.colorActionPrimary} 12%, transparent)` : "transparent",
                    color: active ? t.colorActionPrimary : t.colorTextMuted,
                    fontSize: t.fontSizeXs,
                    fontFamily: t.fontSans,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.12s",
                  }}
                >
                  {tag}
                </button>
              );
            })}
          </div>
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

  const folderOptions = [
    { value: "", label: "No folder" },
    ...folders.map((f) => ({ value: f, label: f })),
  ];

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

        {folders.length > 0 && (
          <Field label="Folder">
            <Select value={folder} onChange={(e) => setFolder(e.target.value)}>
              {folderOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </Field>
        )}
      </div>
    </FormModal>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeDate(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
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
    <div style={{
      flex: 1,
      width: "100%",
      maxWidth: 1100,
      alignSelf: "center",
      display: "flex",
      flexDirection: "column",
      padding: `0 ${t.spaceXl} ${t.space2xl}`,
      boxSizing: "border-box",
      overflowY: "auto",
      scrollbarWidth: "none" as const,
      gap: t.spaceLg,
    }}>
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: t.spaceMd }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} height={140} />
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} height={40} />
            ))}
          </div>
        )
      ) : sorted.length === 0 ? (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: t.spaceMd,
          padding: `${t.space2xl} 0`,
        }}>
          <Icon name="menu_book" size={48} style={{ color: `color-mix(in srgb, ${t.colorTextMuted} 40%, transparent)` }} />
          <p style={{
            margin: 0,
            fontSize: t.fontSizeSm,
            color: t.colorTextMuted,
            textAlign: "center",
            maxWidth: 320,
            lineHeight: t.lineHeightRelaxed,
          }}>
            {activeFilterCount > 0 || search
              ? "Nothing matches those filters. Try broadening your search."
              : "Your library is waiting. Import a URL or write your first document."}
          </p>
          {!search && activeFilterCount === 0 && (
            <div style={{ display: "flex", gap: t.spaceSm }}>
              <Button size="sm" variant="ghost" onClick={() => setShowImport(true)}>
                Import URL
              </Button>
              <Button size="sm" onClick={() => setShowCreate(true)}>
                New Document
              </Button>
            </div>
          )}
        </div>
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
    </div>
  );
}
