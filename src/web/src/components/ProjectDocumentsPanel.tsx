/**
 * ProjectDocumentsPanel — documents linked to a project.
 *
 * Since the project ↔ document relationship is a simple many-to-many (no
 * reference types), this panel renders a single flat grid with the usual
 * search / tag / folder / favorite filters, plus an attach button and a
 * per-card unlink action.
 *
 * Source of truth: `project.documents` from `useProject()` gives the set of
 * linked docs as `ProjectDocumentDetail` (no summary metadata beyond title).
 * For filter fields (tags, folder, favorite), we additionally fetch the
 * linked docs as `DocumentSummary` via `useDocuments({ project_id })` and
 * merge by `document_id`.
 *
 * UI dependencies: @4lt7ab/ui only. Inline styles via semantic tokens.
 */

import { useMemo, useState } from "react";
import { semantic as t } from "@4lt7ab/ui/core";
import {
  Icon,
  Grid,
  EmptyState,
  Badge,
  Button,
  SearchInput,
  ModalShell,
  IconButton,
  Skeleton,
  ConfirmDialog,
  useToast,
} from "@4lt7ab/ui/ui";

import type {
  ProjectDocumentDetail,
  DocumentSummary,
  TagName,
} from "../types";
import { TAG_NAMES } from "../types";
import { useDocuments } from "../hooks/useDocuments";
import { ApiError, updateProjects } from "../api";
import { DocumentReader } from "./DocumentReader";
import { PillSelect } from "./PillSelect";
import { SolidModalBody } from "./SolidModalBody";

// ---------------------------------------------------------------------------
// Enriched link — a project-document pairing plus filterable metadata
// ---------------------------------------------------------------------------

interface EnrichedLink {
  document_id: string;
  title: string;
  summary: string | null;
  favorite: boolean;
  tags: TagName[];
  folder: string | null;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ProjectDocumentsPanelProps {
  projectId: string;
  /** Linked documents from `project.documents`. */
  documents: ProjectDocumentDetail[];
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export function ProjectDocumentsPanel({ projectId, documents }: ProjectDocumentsPanelProps) {
  const { documents: enrichedDocs } = useDocuments({ project_id: projectId }, { pageSize: 200 });
  const { showToast } = useToast();

  const [titleSearch, setTitleSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [folderFilter, setFolderFilter] = useState("");
  const [favoriteFilter, setFavoriteFilter] = useState(false);

  const [openDocId, setOpenDocId] = useState<string | null>(null);
  const [showAttach, setShowAttach] = useState(false);
  const [detachTarget, setDetachTarget] = useState<EnrichedLink | null>(null);
  const [detaching, setDetaching] = useState(false);

  const linkedIds = useMemo(() => new Set(documents.map((d) => d.document_id)), [documents]);

  // Merge link list with DocumentSummary metadata for filtering.
  const enrichedLinks: EnrichedLink[] = useMemo(() => {
    const byId = new Map<string, DocumentSummary>();
    for (const doc of enrichedDocs) byId.set(doc.id, doc);
    return documents.map((link) => {
      const summary = byId.get(link.document_id);
      return {
        document_id: link.document_id,
        title: link.title,
        summary: link.summary,
        favorite: link.favorite,
        tags: summary?.tags ?? [],
        folder: summary?.folder ?? null,
      };
    });
  }, [documents, enrichedDocs]);

  const folderOptions = useMemo(() => {
    const set = new Set<string>();
    for (const link of enrichedLinks) {
      if (link.folder) set.add(link.folder);
    }
    return Array.from(set).sort();
  }, [enrichedLinks]);

  const filteredLinks = useMemo(() => {
    const needle = titleSearch.trim().toLowerCase();
    return enrichedLinks.filter((link) => {
      if (needle) {
        const hay = `${link.title} ${link.summary ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      if (tagFilter && !link.tags.includes(tagFilter as TagName)) return false;
      if (folderFilter && link.folder !== folderFilter) return false;
      if (favoriteFilter && !link.favorite) return false;
      return true;
    });
  }, [enrichedLinks, titleSearch, tagFilter, folderFilter, favoriteFilter]);

  const activeFilterCount = [
    titleSearch.trim() ? 1 : 0,
    tagFilter ? 1 : 0,
    folderFilter ? 1 : 0,
    favoriteFilter ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  function clearAllFilters() {
    setTitleSearch("");
    setTagFilter("");
    setFolderFilter("");
    setFavoriteFilter(false);
  }

  async function handleConfirmDetach() {
    if (!detachTarget || detaching) return;
    setDetaching(true);
    try {
      await updateProjects([
        { id: projectId, documents: { [detachTarget.document_id]: null } },
      ]);
      showToast("Document unlinked", "success");
      setDetachTarget(null);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to unlink document");
    } finally {
      setDetaching(false);
    }
  }

  // Ordered id list for reader flip-through — honours the current filter.
  const neighborIdOrder = useMemo(
    () => filteredLinks.map((l) => l.document_id),
    [filteredLinks],
  );

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Button size="sm" variant="secondary" onClick={() => setShowAttach(true)}>
          <Icon name="link" size={15} />
          Attach Document
        </Button>
      </div>

      {documents.length === 0 ? (
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
            activeCount={activeFilterCount}
            onClearAll={clearAllFilters}
          />

          {filteredLinks.length === 0 ? (
            <EmptyState
              icon="search_off"
              message="No linked documents match these filters."
            />
          ) : (
            <Grid minColumnWidth={260} gap="sm">
              {filteredLinks.map((link) => (
                <DocumentLinkCard
                  key={link.document_id}
                  link={link}
                  onOpen={() => setOpenDocId(link.document_id)}
                  onDetach={() => setDetachTarget(link)}
                />
              ))}
            </Grid>
          )}
        </>
      )}

      {openDocId && (
        <DocumentReader
          documentId={openDocId}
          onClose={() => setOpenDocId(null)}
          neighborIds={neighborIdOrder}
          onNavigate={(id) => setOpenDocId(id)}
        />
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
  activeCount: number;
  onClearAll: () => void;
}) {
  return (
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
// Card for a single project-document link
// ---------------------------------------------------------------------------

function DocumentLinkCard({
  link,
  onOpen,
  onDetach,
}: {
  link: EnrichedLink;
  onOpen: () => void;
  onDetach: () => void;
}) {
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
      aria-label={`Open ${link.title}`}
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
      <div style={{ display: "flex", alignItems: "flex-start", gap: t.spaceXs, minWidth: 0 }}>
        <Icon
          name="description"
          size={14}
          style={{ color: t.colorTextMuted, flexShrink: 0, marginTop: 3 }}
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
          {link.title}
        </h3>
        {link.favorite && (
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
          aria-label={`Unlink ${link.title} from this project`}
          onClick={(e) => {
            e.stopPropagation();
            onDetach();
          }}
        />
      </div>

      {link.summary ? (
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
          {link.summary}
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

      {(link.folder || link.tags.length > 0) && (
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          gap: t.spaceXs,
          marginTop: t.spaceXs,
          fontSize: t.fontSizeXs,
        }}>
          {link.folder && (
            <Badge variant="default">
              <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                <Icon name="folder" size={10} />
                {link.folder}
              </span>
            </Badge>
          )}
          {link.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="default">{tag}</Badge>
          ))}
        </div>
      )}
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
  const [submitting, setSubmitting] = useState(false);

  const { documents, loading } = useDocuments(
    { title: search.trim() || undefined },
    { pageSize: 20 },
  );

  const candidateDocs = useMemo(
    () => documents.filter((d) => !excludeDocIds.has(d.id)),
    [documents, excludeDocIds],
  );

  async function handleSubmit() {
    if (!selectedDocId || submitting) return;
    setSubmitting(true);
    try {
      await updateProjects([
        { id: projectId, documents: { [selectedDocId]: true } },
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

        <div
          style={{
            flex: 1,
            padding: t.spaceXl,
            display: "flex",
            flexDirection: "column",
            gap: t.spaceMd,
            minWidth: 0,
            minHeight: 0,
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
              flex: 1,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: t.spaceXs,
              minHeight: 160,
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
        </div>

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
