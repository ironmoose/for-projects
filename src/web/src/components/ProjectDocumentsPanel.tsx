/**
 * ProjectDocumentsPanel — documents linked to a project, grouped by reference type.
 *
 * Source: `DocumentReferenceDetail[]` from `useProject().project.documents` is
 * the authoritative list of *which* docs are linked and under *what* reference
 * type. To support tag/folder/favorite filtering we also fetch the matching
 * `DocumentSummary[]` via `useDocuments({ project_id })` and merge the two by
 * `document_id`. A single doc referenced under multiple types appears once per
 * section it belongs to.
 *
 * The filter row (title search / tag / folder / favorite / clear-all) filters
 * the merged list client-side before grouping — small to mid projects never
 * need server round-trips. Empty groups stay hidden after filtering.
 *
 * UI dependencies: @4lt7ab/ui only. Inline styles via semantic tokens.
 */

import { useMemo, useState } from "react";
import { semantic as t } from "@4lt7ab/ui/core";
import {
  Icon,
  Grid,
  EmptyState,
  SectionLabel,
  Badge,
  Button,
  SearchInput,
  Select,
  ModalShell,
  IconButton,
  Skeleton,
  ConfirmDialog,
  useToast,
} from "@4lt7ab/ui/ui";

import type {
  DocumentReferenceDetail,
  DocumentReferenceType,
  DocumentSummary,
  TagName,
} from "../types";
import { DOCUMENT_REFERENCE_TYPES, TAG_NAMES } from "../types";
import { useDocuments } from "../hooks/useDocuments";
import { ApiError, updateProjects } from "../api";
import { DocumentReader } from "./DocumentReader";
import { PillSelect } from "./PillSelect";
import { SolidModalBody } from "./SolidModalBody";

// ---------------------------------------------------------------------------
// Section metadata — icon + human label per reference type
// ---------------------------------------------------------------------------

interface ReferenceTypeMeta {
  label: string;
  icon: string;
  /** Accent used for the card icon glyph. Tokens only. */
  accent: string;
}

const REFERENCE_TYPE_META: Record<DocumentReferenceType, ReferenceTypeMeta> = {
  goal: { label: "Goals", icon: "flag", accent: t.colorSuccess },
  plan: { label: "Plans", icon: "checklist", accent: t.colorInfo },
  requirements: { label: "Requirements", icon: "rule", accent: t.colorWarning },
  design: { label: "Design", icon: "architecture", accent: t.colorActionPrimary },
  reference: { label: "References", icon: "bookmark", accent: t.colorTextSecondary },
  note: { label: "Notes", icon: "sticky_note_2", accent: t.colorTextMuted },
};

// ---------------------------------------------------------------------------
// Enriched reference — reference metadata + DocumentSummary fields merged in
// ---------------------------------------------------------------------------

interface EnrichedReference {
  document_id: string;
  type: DocumentReferenceType;
  title: string;
  summary: string | null;
  favorite: boolean;
  /** Filled in from DocumentSummary when available; null when the summary hasn't loaded. */
  tags: TagName[];
  folder: string | null;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ProjectDocumentsPanelProps {
  /** Project whose linked documents we're rendering. */
  projectId: string;
  /** Reference list from `project.documents` (source of truth for types). */
  references: DocumentReferenceDetail[];
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export function ProjectDocumentsPanel({ projectId, references }: ProjectDocumentsPanelProps) {
  // Fetch the matching DocumentSummary rows so we have tags/folder/favorite
  // available for filtering. Cap page size high so one round-trip covers the
  // whole project (the task spec caps at ~few hundred linked docs per project).
  const { documents: enrichedDocs } = useDocuments({ project_id: projectId }, { pageSize: 200 });

  // Filter state — all five compose with each other.
  const [titleSearch, setTitleSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [folderFilter, setFolderFilter] = useState("");
  const [favoriteFilter, setFavoriteFilter] = useState(false);
  const [typeFilter, setTypeFilter] = useState<DocumentReferenceType | null>(null);

  const [openDocId, setOpenDocId] = useState<string | null>(null);
  const [showAttach, setShowAttach] = useState(false);
  const [detachTarget, setDetachTarget] = useState<EnrichedReference | null>(null);
  const [detaching, setDetaching] = useState(false);
  const { showToast } = useToast();

  // Merge references with DocumentSummary rows. Reference list is the source
  // of truth; DocumentSummary only contributes filter fields. When the summary
  // hasn't arrived yet, tags/folder fall back to [] / null so filters still
  // evaluate safely (a folder filter just won't match).
  const enrichedRefs: EnrichedReference[] = useMemo(() => {
    const byId = new Map<string, DocumentSummary>();
    for (const doc of enrichedDocs) byId.set(doc.id, doc);
    return references.map((ref) => {
      const summary = byId.get(ref.document_id);
      return {
        document_id: ref.document_id,
        type: ref.type,
        title: ref.title,
        summary: ref.summary,
        favorite: ref.favorite,
        tags: summary?.tags ?? [],
        folder: summary?.folder ?? null,
      };
    });
  }, [references, enrichedDocs]);

  // Folder options derived from what's actually linked.
  const folderOptions = useMemo(() => {
    const set = new Set<string>();
    for (const e of enrichedRefs) {
      if (e.folder) set.add(e.folder);
    }
    return Array.from(set).sort();
  }, [enrichedRefs]);

  // Apply filters. Reference-type narrows first, then title/tag/folder/favorite.
  // Title is case-insensitive substring over title OR summary.
  const filteredRefs = useMemo(() => {
    const needle = titleSearch.trim().toLowerCase();
    return enrichedRefs.filter((e) => {
      if (typeFilter && e.type !== typeFilter) return false;
      if (needle) {
        const hay = `${e.title} ${e.summary ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      if (tagFilter && !e.tags.includes(tagFilter as TagName)) return false;
      if (folderFilter && e.folder !== folderFilter) return false;
      if (favoriteFilter && !e.favorite) return false;
      return true;
    });
  }, [enrichedRefs, typeFilter, titleSearch, tagFilter, folderFilter, favoriteFilter]);

  // Group filtered results by reference type in canonical order.
  const grouped = useMemo(() => {
    const byType: Record<DocumentReferenceType, EnrichedReference[]> = {
      goal: [], plan: [], requirements: [], design: [], reference: [], note: [],
    };
    for (const e of filteredRefs) byType[e.type].push(e);
    return byType;
  }, [filteredRefs]);

  const activeFilterCount = [
    typeFilter ? 1 : 0,
    titleSearch.trim() ? 1 : 0,
    tagFilter ? 1 : 0,
    folderFilter ? 1 : 0,
    favoriteFilter ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  function clearAllFilters() {
    setTypeFilter(null);
    setTitleSearch("");
    setTagFilter("");
    setFolderFilter("");
    setFavoriteFilter(false);
  }

  async function handleConfirmDetach() {
    if (!detachTarget || detaching) return;
    setDetaching(true);
    try {
      // Setting documents: { [id]: null } removes ALL references between this
      // document and this project per the merge-patch semantics.
      await updateProjects([
        {
          id: projectId,
          documents: { [detachTarget.document_id]: null },
        },
      ]);
      showToast("Document unlinked", "success");
      setDetachTarget(null);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to unlink document");
    } finally {
      setDetaching(false);
    }
  }

  const hasMatches = filteredRefs.length > 0;
  const linkedIds = useMemo(() => new Set(references.map((r) => r.document_id)), [references]);

  // The Attach button is always visible — the empty state calls it out too
  // so a project with zero linked docs can get its first reference.
  const attachButton = (
    <Button
      size="sm"
      variant="secondary"
      onClick={() => setShowAttach(true)}
    >
      <Icon name="link" size={15} />
      Attach Document
    </Button>
  );

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        {attachButton}
      </div>

      {references.length === 0 ? (
        <EmptyState
          icon="menu_book"
          message="No documents linked yet. Attach one from your knowledgebase to get started."
        />
      ) : (
        <>
          <ProjectDocumentsFilters
        titleSearch={titleSearch}
        onTitleChange={setTitleSearch}
        tag={tagFilter}
        onTagChange={setTagFilter}
        folder={folderFilter}
        onFolderChange={setFolderFilter}
        folderOptions={folderOptions}
        favorite={favoriteFilter}
        onFavoriteChange={setFavoriteFilter}
        typeFilter={typeFilter}
        onTypeChange={setTypeFilter}
        activeCount={activeFilterCount}
        onClearAll={clearAllFilters}
      />

      {!hasMatches ? (
        <EmptyState
          icon="search_off"
          message="No linked documents match these filters."
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: t.spaceLg }}>
          {DOCUMENT_REFERENCE_TYPES.map((type) => {
            const items = grouped[type];
            if (items.length === 0) return null;
            const meta = REFERENCE_TYPE_META[type];
            return (
              <section
                key={type}
                aria-labelledby={`project-docs-section-${type}`}
                style={{ display: "flex", flexDirection: "column", gap: t.spaceSm }}
              >
                <div id={`project-docs-section-${type}`}>
                  <SectionLabel>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: t.spaceXs }}>
                      <Icon name={meta.icon} size={14} />
                      {meta.label}
                      <Badge variant="default">{items.length}</Badge>
                    </span>
                  </SectionLabel>
                </div>
                <Grid minColumnWidth={260} gap="sm">
                  {items.map((ref) => (
                    <DocumentReferenceCard
                      key={`${ref.document_id}:${ref.type}`}
                      reference={ref}
                      onOpen={() => setOpenDocId(ref.document_id)}
                      onDetach={() => setDetachTarget(ref)}
                    />
                  ))}
                </Grid>
              </section>
            );
          })}
        </div>
      )}

      {openDocId && (
        <DocumentReader
          documentId={openDocId}
          onClose={() => setOpenDocId(null)}
        />
      )}
        </>
      )}

      {showAttach && (
        <AttachDocumentModal
          projectId={projectId}
          excludeDocIds={linkedIds}
          onClose={() => setShowAttach(false)}
        />
      )}

      {detachTarget && (
        <ConfirmDialog
          title="Unlink Document"
          message={`Unlink "${detachTarget.title}" from this project? The document stays in the knowledge base.`}
          variant="destructive"
          confirmLabel={detaching ? "Unlinking..." : "Unlink"}
          onConfirm={handleConfirmDetach}
          onCancel={() => !detaching && setDetachTarget(null)}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Filter row
// ---------------------------------------------------------------------------

function ProjectDocumentsFilters({
  titleSearch,
  onTitleChange,
  tag,
  onTagChange,
  folder,
  onFolderChange,
  folderOptions,
  favorite,
  onFavoriteChange,
  typeFilter,
  onTypeChange,
  activeCount,
  onClearAll,
}: {
  titleSearch: string;
  onTitleChange: (v: string) => void;
  tag: string;
  onTagChange: (v: string) => void;
  folder: string;
  onFolderChange: (v: string) => void;
  folderOptions: string[];
  favorite: boolean;
  onFavoriteChange: (v: boolean) => void;
  typeFilter: DocumentReferenceType | null;
  onTypeChange: (v: DocumentReferenceType | null) => void;
  activeCount: number;
  onClearAll: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: t.spaceSm }}>
      {/* Primary filter row */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: t.spaceSm,
        flexWrap: "wrap",
      }}>
        <div style={{ flex: "1 1 200px", minWidth: 160 }}>
          <SearchInput
            value={titleSearch}
            onSearch={onTitleChange}
            placeholder="Search linked documents..."
            debounceMs={200}
            aria-label="Search linked documents"
          />
        </div>

        <FilterChipButton
          label="Favorites"
          icon="star"
          active={favorite}
          onClick={() => onFavoriteChange(!favorite)}
        />

        <PillSelect
          value={tag}
          options={[{ value: "", label: "Tag" }, ...TAG_NAMES.map((n) => ({ value: n, label: n }))]}
          onChange={onTagChange}
          ariaLabel="Filter by tag"
        />

        {folderOptions.length > 0 && (
          <PillSelect
            value={folder}
            options={[{ value: "", label: "Folder" }, ...folderOptions.map((f) => ({ value: f, label: f }))]}
            onChange={onFolderChange}
            ariaLabel="Filter by folder"
          />
        )}

        {activeCount > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            aria-label={`Clear ${activeCount} active filter${activeCount === 1 ? "" : "s"}`}
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
            Clear ({activeCount})
          </button>
        )}
      </div>

      {/* Reference-type chip row — single-select, click active chip to clear */}
      <div
        role="group"
        aria-label="Filter by reference type"
        style={{
          display: "flex",
          alignItems: "center",
          gap: t.spaceXs,
          flexWrap: "wrap",
          paddingTop: t.spaceXs,
          borderTop: `1px dashed color-mix(in srgb, ${t.colorBorder} 50%, transparent)`,
        }}
      >
        {DOCUMENT_REFERENCE_TYPES.map((type) => {
          const meta = REFERENCE_TYPE_META[type];
          const active = typeFilter === type;
          return (
            <FilterChipButton
              key={type}
              label={meta.label}
              icon={meta.icon}
              active={active}
              onClick={() => onTypeChange(active ? null : type)}
            />
          );
        })}
      </div>
    </div>
  );
}

function FilterChipButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: `6px ${t.spaceMd}`,
        minHeight: 32,
        borderRadius: t.radiusFull,
        border: `1px solid ${active ? t.colorActionPrimary : `color-mix(in srgb, ${t.colorBorder} 60%, transparent)`}`,
        background: active ? `color-mix(in srgb, ${t.colorActionPrimary} 8%, transparent)` : "transparent",
        color: active ? t.colorActionPrimary : t.colorTextMuted,
        fontSize: t.fontSizeSm,
        fontFamily: t.fontSans,
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      <Icon name={icon} size={12} />
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Document reference card
// ---------------------------------------------------------------------------

function DocumentReferenceCard({
  reference,
  onOpen,
  onDetach,
}: {
  reference: EnrichedReference;
  onOpen: () => void;
  onDetach: () => void;
}) {
  const meta = REFERENCE_TYPE_META[reference.type];
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      aria-label={`Open ${reference.title}`}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: t.spaceXs,
        padding: t.spaceMd,
        borderRadius: t.radiusLg,
        border: `1px solid ${t.colorBorder}`,
        background: t.colorSurfaceSolid,
        boxShadow: t.shadowSm,
        cursor: "pointer",
        minWidth: 0,
        transition: "transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.borderColor = t.colorBorderFocused;
        e.currentTarget.style.boxShadow = t.shadowMd;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "";
        e.currentTarget.style.borderColor = t.colorBorder;
        e.currentTarget.style.boxShadow = t.shadowSm;
      }}
    >
      {/* Title row: type icon + title + favorite star + unlink */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: t.spaceXs, minWidth: 0 }}>
        <Icon
          name={meta.icon}
          size={14}
          style={{ color: meta.accent, flexShrink: 0, marginTop: 3 }}
        />
        <h3 style={{
          margin: 0,
          flex: 1,
          minWidth: 0,
          fontSize: t.fontSizeSm,
          fontWeight: 700,
          fontFamily: t.fontSans,
          color: t.colorText,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          {reference.title}
        </h3>
        {reference.favorite && (
          <Icon
            name="star"
            size={14}
            style={{ color: t.colorWarning, flexShrink: 0, marginTop: 3 }}
            aria-label="Favorite"
          />
        )}
        <IconButton
          icon="link_off"
          size={14}
          aria-label={`Unlink ${reference.title} from this project`}
          onClick={(e) => {
            e.stopPropagation();
            onDetach();
          }}
        />
      </div>

      {/* Summary — 2-line clamp */}
      {reference.summary ? (
        <p style={{
          margin: 0,
          fontSize: t.fontSizeXs,
          color: t.colorTextMuted,
          lineHeight: t.lineHeightRelaxed,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}>
          {reference.summary}
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

      {/* Type badge — small visual anchor, useful once filters collapse groups */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: t.spaceXs }}>
        <Badge variant="default">{meta.label.toLowerCase()}</Badge>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Attach-document modal
// ---------------------------------------------------------------------------

function AttachDocumentModal({
  projectId,
  excludeDocIds,
  onClose,
}: {
  projectId: string;
  excludeDocIds: Set<string>;
  onClose: () => void;
}) {
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<DocumentReferenceType>("reference");
  const [submitting, setSubmitting] = useState(false);

  const { documents, loading } = useDocuments(
    { title: search.trim() || undefined },
    { pageSize: 20 },
  );

  // Exclude anything already linked to this project.
  const candidateDocs = useMemo(
    () => documents.filter((d) => !excludeDocIds.has(d.id)),
    [documents, excludeDocIds],
  );

  async function handleSubmit() {
    if (!selectedDocId || submitting) return;
    setSubmitting(true);
    try {
      await updateProjects([
        {
          id: projectId,
          documents: { [selectedDocId]: [{ type: selectedType }] },
        },
      ]);
      showToast("Document attached", "success");
      onClose();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to attach document");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalShell onClose={onClose} maxWidth={560}>
      <SolidModalBody layout="pinned">
        {/* Header */}
        <div
          style={{
            padding: `${t.spaceLg} ${t.spaceXl}`,
            borderBottom: `1px solid color-mix(in srgb, ${t.colorBorder} 30%, transparent)`,
            display: "flex",
            alignItems: "center",
            gap: t.spaceSm,
            flexShrink: 0,
          }}
        >
          <Icon name="link" size={18} />
          <h2
            style={{
              flex: 1,
              margin: 0,
              fontSize: t.fontSizeLg,
              fontWeight: 700,
              fontFamily: t.fontSerif,
              color: t.colorText,
            }}
          >
            Attach Document
          </h2>
          <IconButton icon="close" size={18} onClick={onClose} aria-label="Close" />
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: t.spaceXl,
            display: "flex",
            flexDirection: "column",
            gap: t.spaceMd,
            minWidth: 0,
          }}
        >
          <SearchInput
            value={search}
            onSearch={setSearch}
            placeholder="Search knowledgebase..."
            debounceMs={200}
            aria-label="Search knowledgebase"
          />

          <div
            role="listbox"
            aria-label="Knowledgebase documents"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: t.spaceXs,
              minHeight: 120,
            }}
          >
            {loading ? (
              <>
                <Skeleton height={40} />
                <Skeleton height={40} />
                <Skeleton height={40} />
              </>
            ) : candidateDocs.length === 0 ? (
              <EmptyState
                icon="search_off"
                message={
                  search.trim()
                    ? "No unlinked documents match that search."
                    : "No unlinked documents available."
                }
              />
            ) : (
              candidateDocs.map((doc) => {
                const selected = selectedDocId === doc.id;
                return (
                  <div
                    key={doc.id}
                    role="option"
                    aria-selected={selected}
                    tabIndex={0}
                    aria-label={`Select ${doc.title}`}
                    onClick={() => setSelectedDocId(doc.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedDocId(doc.id);
                      }
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: t.spaceSm,
                      padding: `${t.spaceSm} ${t.spaceMd}`,
                      borderRadius: t.radiusMd,
                      border: `1px solid ${selected ? t.colorActionPrimary : t.colorBorder}`,
                      background: selected
                        ? `color-mix(in srgb, ${t.colorActionPrimary} 8%, transparent)`
                        : t.colorSurfaceSolid,
                      cursor: "pointer",
                      minWidth: 0,
                    }}
                  >
                    <Icon
                      name={selected ? "radio_button_checked" : "radio_button_unchecked"}
                      size={16}
                      style={{
                        color: selected ? t.colorActionPrimary : t.colorTextMuted,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: t.fontSizeSm,
                          fontWeight: 600,
                          color: t.colorText,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {doc.title}
                      </div>
                      {doc.summary && (
                        <div
                          style={{
                            fontSize: t.fontSizeXs,
                            color: t.colorTextMuted,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {doc.summary}
                        </div>
                      )}
                    </div>
                    {doc.favorite && (
                      <Icon
                        name="star"
                        size={14}
                        style={{ color: t.colorWarning, flexShrink: 0 }}
                        aria-label="Favorite"
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Reference-type picker */}
          <div style={{ display: "flex", flexDirection: "column", gap: t.spaceXs }}>
            <label
              htmlFor="attach-doc-type"
              style={{
                fontSize: t.fontSizeXs,
                fontFamily: t.fontMono,
                color: t.colorTextMuted,
                textTransform: "uppercase",
                letterSpacing: t.letterSpacingWide,
              }}
            >
              Reference type
            </label>
            <Select
              id="attach-doc-type"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as DocumentReferenceType)}
            >
              {DOCUMENT_REFERENCE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {REFERENCE_TYPE_META[type].label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: `${t.spaceMd} ${t.spaceXl}`,
            borderTop: `1px solid color-mix(in srgb, ${t.colorBorder} 30%, transparent)`,
            display: "flex",
            justifyContent: "flex-end",
            gap: t.spaceSm,
            flexShrink: 0,
          }}
        >
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!selectedDocId || submitting}
          >
            {submitting ? "Attaching..." : "Attach"}
          </Button>
        </div>
      </SolidModalBody>
    </ModalShell>
  );
}
