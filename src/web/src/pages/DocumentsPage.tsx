import { useMemo, useState } from "react";
import {
  PageHeader,
  EmptyState,
  Pagination,
  ConfirmDialog,
  Button,
  CreateDocumentOverlay,
  ImportDocumentOverlay,
  GitHubBrowserOverlay,
  FolderTileGrid,
} from "../components";
import { semantic as t, useInjectStyles } from "@4lt7ab/ui/core";

const SLIDE_UP_CSS = `@keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }`;
import { Icon } from "@4lt7ab/ui/ui";
import { SearchToggle } from "../components/molecules/SearchToggle";
import { Overlay } from "@4lt7ab/ui/ui";
import { SectionLabel } from "@4lt7ab/ui/ui";
import { DocumentTable } from "../components/organisms/DocumentTable";
import { DocumentReaderModal } from "../components/organisms/DocumentReaderModal";
import { useDocuments } from "../hooks/useDocuments";
import { useProjects, useHealth } from "../hooks";
import { useToastContext } from "../components/ToastContext";
import { useWindowWidth, SMALL_BREAKPOINT } from "../hooks/useWindowWidth";
import { ApiError, importDocument } from "../api";
import { TAG_CATEGORIES } from "../types";
import type { DocumentSummary, TagName } from "../types";

// ---------------------------------------------------------------------------
// Sidebar (desktop)
// ---------------------------------------------------------------------------

interface SidebarProps {
  title: string;
  onTitleChange: (v: string) => void;
  projects: { id: string; title: string }[];
  selectedProjectId: string;
  onProjectChange: (id: string) => void;
  selectedTag: string;
  onTagChange: (t: string) => void;
  folders: string[];
  selectedFolder: string;
  onFolderChange: (f: string) => void;
  favorite: boolean;
  onFavoriteChange: (v: boolean) => void;
  activeCount: number;
  onClearAll: () => void;
  semanticSearchAvailable?: boolean;
  semanticMode?: boolean;
  onSemanticModeChange?: (v: boolean) => void;
}

function Sidebar(props: SidebarProps) {
  return <SidebarInner {...props} mobile={false} />;
}

function SidebarInner({
  title, onTitleChange,
  projects, selectedProjectId, onProjectChange,
  selectedTag, onTagChange,
  folders, selectedFolder, onFolderChange,
  favorite, onFavoriteChange,
  activeCount, onClearAll,
  semanticSearchAvailable, semanticMode, onSemanticModeChange,
  mobile,
}: SidebarProps & { mobile: boolean }) {
  const sectionGap = t.spaceLg;
  const itemGap = t.spaceXs;

  return (
    <nav
      style={{
        display: "flex",
        flexDirection: "column",
        gap: sectionGap,
        padding: mobile ? t.spaceMd : `${t.space2xl} ${t.spaceMd}`,
        ...(mobile ? {} : { width: 220, flexShrink: 0, borderRight: `1px solid ${`color-mix(in srgb, ${t.colorBorder} 50%, transparent)`}` }),
        overflowY: "auto",
        scrollbarWidth: "none" as const,
      }}
    >
      {/* Search — desktop sidebar only */}
      {!mobile && (
        <SearchToggle
          value={title}
          onChange={onTitleChange}
          semantic={semanticMode ?? false}
          onSemanticChange={(v) => onSemanticModeChange?.(v)}
          toggleVisible={semanticSearchAvailable}
        />
      )}

      {activeCount > 0 && (
        <button
          onClick={onClearAll}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: `${t.spaceXs} ${t.spaceSm}`,
            borderRadius: t.radiusMd,
            border: `1px solid ${`color-mix(in srgb, ${t.colorBorder} 50%, transparent)`}`,
            background: "transparent",
            color: t.colorTextMuted,
            fontSize: t.fontSizeXs,
            fontFamily: t.fontSans,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          <Icon name="filter_list_off" size={13} />
          Clear {activeCount} filter{activeCount > 1 ? "s" : ""}
        </button>
      )}

      <button
        onClick={() => onFavoriteChange(!favorite)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: t.spaceXs,
          padding: `${t.spaceXs} ${t.spaceSm}`,
          borderRadius: t.radiusMd,
          border: `1px solid ${favorite ? `color-mix(in srgb, ${t.colorWarning} 38%, transparent)` : `color-mix(in srgb, ${t.colorBorder} 50%, transparent)`}`,
          background: favorite ? `color-mix(in srgb, ${t.colorWarning} 9%, transparent)` : "transparent",
          color: favorite ? t.colorWarning : t.colorTextMuted,
          fontSize: t.fontSizeXs,
          fontFamily: t.fontSans,
          fontWeight: 600,
          cursor: "pointer",
          transition: "all 0.15s",
        }}
      >
        <Icon name={favorite ? "star" : "star_border"} size={14} />
        Favorites
      </button>

      {projects.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: itemGap }}>
          <SectionLabel>Projects</SectionLabel>
          <SidebarItem label="All projects" icon="apps" active={selectedProjectId === ""} onClick={() => onProjectChange("")} />
          {projects.map((p) => (
            <SidebarItem key={p.id} label={p.title} icon="folder_special" active={selectedProjectId === p.id} onClick={() => onProjectChange(selectedProjectId === p.id ? "" : p.id)} />
          ))}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: itemGap }}>
        <SectionLabel>Tags</SectionLabel>
        <SidebarItem label="All tags" icon="label" active={selectedTag === ""} onClick={() => onTagChange("")} />
        {Object.entries(TAG_CATEGORIES).map(([category, tags]) => (
          <div key={category} style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <span style={{ fontSize: t.fontSizeXs, color: t.colorTextSecondary, fontWeight: 600, padding: `${t.spaceXs} ${t.spaceSm}`, paddingBottom: 0 }}>
              {category}
            </span>
            {(tags as readonly TagName[]).map((tag) => (
              <SidebarItem key={tag} label={tag} active={selectedTag === tag} onClick={() => onTagChange(selectedTag === tag ? "" : tag)} />
            ))}
          </div>
        ))}
      </div>

      {folders.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: itemGap }}>
          <SectionLabel>Folders</SectionLabel>
          <SidebarItem label="All folders" icon="folder" active={selectedFolder === ""} onClick={() => onFolderChange("")} />
          {folders.map((f) => (
            <SidebarItem key={f} label={f} icon="folder" active={selectedFolder === f} onClick={() => onFolderChange(selectedFolder === f ? "" : f)} />
          ))}
        </div>
      )}
    </nav>
  );
}

function SidebarItem({ label, icon, active, onClick }: { label: string; icon?: string; active: boolean; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: t.spaceXs,
        padding: `3px ${t.spaceSm}`,
        borderRadius: t.radiusMd,
        border: "none",
        background: active ? `color-mix(in srgb, ${t.colorActionPrimary} 9%, transparent)` : hovered ? `color-mix(in srgb, ${t.colorTextSecondary} 6%, transparent)` : "transparent",
        color: active ? t.colorActionPrimary : t.colorTextMuted,
        fontSize: t.fontSizeXs,
        fontFamily: t.fontSans,
        fontWeight: active ? 700 : 500,
        cursor: "pointer",
        transition: "all 0.12s",
        textAlign: "left",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
      title={label}
    >
      {icon && <Icon name={icon} size={13} style={{ flexShrink: 0 }} />}
      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Active filter chips (mobile — shown below the sticky search bar)
// ---------------------------------------------------------------------------

interface ActiveFilter {
  key: string;
  label: string;
  icon: string;
  onRemove: () => void;
}

function ActiveFilterChips({ filters }: { filters: ActiveFilter[] }) {
  if (filters.length === 0) return null;
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: `0 0 ${t.spaceSm}` }}>
      {filters.map((f) => (
        <button
          key={f.key}
          onClick={f.onRemove}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: `2px ${t.spaceXs} 2px ${t.spaceSm}`,
            borderRadius: t.radiusFull,
            border: `1px solid ${`color-mix(in srgb, ${t.colorActionPrimary} 25%, transparent)`}`,
            background: `color-mix(in srgb, ${t.colorActionPrimary} 8%, transparent)`,
            color: t.colorActionPrimary,
            fontSize: t.fontSizeXs,
            fontWeight: 600,
            fontFamily: t.fontSans,
            cursor: "pointer",
            transition: "all 0.12s",
            maxWidth: 160,
          }}
        >
          <Icon name={f.icon} size={11} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.label}</span>
          <Icon name="close" size={11} style={{ opacity: 0.7, flexShrink: 0 }} />
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bottom sheet (mobile filter panel)
// ---------------------------------------------------------------------------

function BottomSheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;

  return (
    <>
      <Overlay onClick={onClose} zIndex={200} />
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 201,
          maxHeight: "65vh",
          background: t.colorSurface,
          borderTop: `1px solid ${t.colorBorder}`,
          borderRadius: `${t.radiusLg} ${t.radiusLg} 0 0`,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "slide-up 0.25s ease-out",
        }}
      >
        {/* Handle bar */}
        <div style={{ display: "flex", justifyContent: "center", padding: `${t.spaceSm} 0 0` }}>
          <div style={{ width: 36, height: 4, borderRadius: t.radiusFull, background: t.colorTextSecondary, opacity: 0.4 }} />
        </div>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: `${t.spaceSm} ${t.spaceMd}` }}>
          <span style={{ fontSize: t.fontSizeSm, fontWeight: 700, fontFamily: t.fontSerif, color: t.colorText }}>
            Filters
          </span>
          <button
            onClick={onClose}
            style={{
              padding: t.spaceXs,
              border: "none",
              background: "transparent",
              color: t.colorActionPrimary,
              fontSize: t.fontSizeXs,
              fontWeight: 600,
              fontFamily: t.fontSans,
              cursor: "pointer",
            }}
          >
            Done
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" as const }}>
          {children}
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Sticky mobile search bar
// ---------------------------------------------------------------------------

function MobileSearchBar({
  title, onTitleChange, activeCount, onOpenFilters,
  semanticSearchAvailable, semanticMode, onSemanticModeChange,
}: {
  title: string;
  onTitleChange: (v: string) => void;
  activeCount: number;
  onOpenFilters: () => void;
  semanticSearchAvailable?: boolean;
  semanticMode?: boolean;
  onSemanticModeChange?: (v: boolean) => void;
}) {
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        background: t.colorSurface,
        paddingTop: t.spaceSm,
        paddingBottom: t.spaceSm,
        display: "flex",
        gap: t.spaceSm,
        alignItems: "center",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <SearchToggle
          value={title}
          onChange={onTitleChange}
          semantic={semanticMode ?? false}
          onSemanticChange={(v) => onSemanticModeChange?.(v)}
          toggleVisible={semanticSearchAvailable}
          placeholder="Search knowledge base..."
        />
      </div>
      <button
        onClick={onOpenFilters}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: `${t.spaceXs} ${t.spaceSm}`,
          borderRadius: t.radiusMd,
          border: `1px solid ${activeCount > 0 ? t.colorActionPrimary : `color-mix(in srgb, ${t.colorBorder} 50%, transparent)`}`,
          background: activeCount > 0 ? `color-mix(in srgb, ${t.colorActionPrimary} 9%, transparent)` : "transparent",
          color: activeCount > 0 ? t.colorActionPrimary : t.colorTextMuted,
          fontSize: t.fontSizeXs,
          fontWeight: 600,
          fontFamily: t.fontSans,
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        <Icon name="tune" size={14} />
        {activeCount > 0 ? activeCount : "Filter"}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DocumentsPage
// ---------------------------------------------------------------------------

export function DocumentsPage() {
  useInjectStyles("tfp-slide-up", SLIDE_UP_CSS);
  const { showToast } = useToastContext();
  const windowWidth = useWindowWidth();
  const isWide = windowWidth >= SMALL_BREAKPOINT;

  // Filter state
  const [titleFilter, setTitleFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [folderFilter, setFolderFilter] = useState("");
  const [favoriteFilter, setFavoriteFilter] = useState(false);
  const [projectFilter, setProjectFilter] = useState("");
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [semanticMode, setSemanticMode] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "directory">("grid");
  /** Current path in directory navigation (e.g., "facebook-react/src"). Empty = root. */
  const [directoryPath, setDirectoryPath] = useState("");

  // Entity state
  const [deleteTarget, setDeleteTarget] = useState<DocumentSummary | null>(null);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<{ path: string; docCount: number } | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [showCreateOverlay, setShowCreateOverlay] = useState(false);
  const [showImportOverlay, setShowImportOverlay] = useState(false);
  const [showGitHubBrowser, setShowGitHubBrowser] = useState(false);

  // Data
  const { projects } = useProjects();
  const { semanticSearchAvailable } = useHealth();

  // __unfiled__ is a client-side sentinel for "no folder" — don't pass to API
  const isUnfiledView = folderFilter === "__unfiled__";
  const filter = {
    ...(titleFilter ? { title: titleFilter } : {}),
    ...(tagFilter ? { tag: tagFilter } : {}),
    ...(!isUnfiledView && folderFilter ? { folder: folderFilter } : {}),
    ...(favoriteFilter ? { favorite: true as const } : {}),
    ...(projectFilter ? { project_id: projectFilter } : {}),
  };

  const useSemanticSearch = semanticSearchAvailable && semanticMode;
  // Directory mode needs all documents to build the tree; grid mode uses standard pagination
  const pageSize = viewMode === "directory" ? 500 : undefined;
  const { documents, loading, total, totalPages, page, setPage, create, update, remove, removeByFolder, isSemanticResults } = useDocuments(
    Object.keys(filter).length > 0 ? filter : undefined,
    { semanticSearch: useSemanticSearch, pageSize },
  );

  const knownFolders = useMemo(() => {
    const set = new Set<string>();
    for (const doc of documents) {
      if (doc.folder) set.add(doc.folder);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [documents]);

  // Semantic results are pre-sorted by similarity; standard results sort by recency
  const sorted = isSemanticResults ? documents : [...documents].sort((a, b) => b.updated_at.localeCompare(a.updated_at));

  const activeFilterCount = [tagFilter, folderFilter, favoriteFilter, projectFilter].filter(Boolean).length;

  // Build the active filter chip list for mobile
  const activeFilters: ActiveFilter[] = [];
  if (projectFilter) {
    const proj = projects.find((p) => p.id === projectFilter);
    activeFilters.push({
      key: "project",
      label: proj?.title ?? "Project",
      icon: "folder_special",
      onRemove: () => setProjectFilter(""),
    });
  }
  if (tagFilter) {
    activeFilters.push({ key: "tag", label: tagFilter, icon: "label", onRemove: () => setTagFilter("") });
  }
  if (folderFilter) {
    activeFilters.push({ key: "folder", label: isUnfiledView ? "Unfiled" : folderFilter, icon: "folder", onRemove: () => setFolderFilter("") });
  }
  if (favoriteFilter) {
    activeFilters.push({ key: "favorite", label: "Favorites", icon: "star", onRemove: () => setFavoriteFilter(false) });
  }

  function clearAllFilters() {
    setTagFilter("");
    setFolderFilter("");
    setFavoriteFilter(false);
    setProjectFilter("");
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await remove([deleteTarget.id]);
      if (selectedDocumentId === deleteTarget.id) setSelectedDocumentId(null);
      setDeleteTarget(null);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to delete document");
    }
  }

  async function handleDeleteFolder() {
    if (!deleteFolderTarget) return;
    try {
      await removeByFolder(deleteFolderTarget.path);
      setDeleteFolderTarget(null);
      // If we were viewing inside the deleted folder, navigate back to root
      if (directoryPath === deleteFolderTarget.path || directoryPath.startsWith(deleteFolderTarget.path + "/")) {
        setDirectoryPath("");
      }
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to delete folder");
    }
  }

  const sidebarProps: SidebarProps = {
    title: titleFilter,
    onTitleChange: setTitleFilter,
    projects: projects.map((p) => ({ id: p.id, title: p.title })),
    selectedProjectId: projectFilter,
    onProjectChange: setProjectFilter,
    selectedTag: tagFilter,
    onTagChange: setTagFilter,
    folders: knownFolders,
    selectedFolder: folderFilter,
    onFolderChange: setFolderFilter,
    favorite: favoriteFilter,
    onFavoriteChange: setFavoriteFilter,
    activeCount: activeFilterCount,
    onClearAll: clearAllFilters,
    semanticSearchAvailable,
    semanticMode,
    onSemanticModeChange: setSemanticMode,
  };

  return (
    <div
      style={{
        flex: 1,
        width: "100%",
        maxWidth: 1400,
        alignSelf: "center",
        display: "flex",
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      {/* Sidebar — desktop only */}
      {isWide && <Sidebar {...sidebarProps} />}

      {/* Main content area */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          padding: isWide ? `${t.space2xl} ${t.spaceXl}` : `${t.spaceMd} ${t.spaceMd}`,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          scrollbarWidth: "none" as const,
        }}
      >
        {/* Header */}
        <PageHeader
          title="Knowledge Base"
          subtitle={total > 0 ? `${total} document${total !== 1 ? "s" : ""}` : undefined}
          trailing={
            <div style={{ display: "flex", gap: t.spaceSm, alignItems: "center" }}>
              {/* View mode toggle */}
              <div style={{ display: "flex", border: `1px solid ${`color-mix(in srgb, ${t.colorBorder} 50%, transparent)`}`, borderRadius: t.radiusMd, overflow: "hidden" }}>
                <button
                  onClick={() => setViewMode("directory")}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: 30, height: 28, border: "none", cursor: "pointer",
                    background: viewMode === "directory" ? `color-mix(in srgb, ${t.colorActionPrimary} 9%, transparent)` : "transparent",
                    color: viewMode === "directory" ? t.colorActionPrimary : t.colorTextMuted,
                  }}
                  title="Directory view"
                >
                  <Icon name="folder" size={15} />
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: 30, height: 28, border: "none", cursor: "pointer",
                    borderLeft: `1px solid ${`color-mix(in srgb, ${t.colorBorder} 50%, transparent)`}`,
                    background: viewMode === "grid" ? `color-mix(in srgb, ${t.colorActionPrimary} 9%, transparent)` : "transparent",
                    color: viewMode === "grid" ? t.colorActionPrimary : t.colorTextMuted,
                  }}
                  title="Grid view"
                >
                  <Icon name="grid_view" size={15} />
                </button>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setShowGitHubBrowser(true)}>
                Browse GitHub
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowImportOverlay(true)}>
                Import URL
              </Button>
              <Button size="sm" onClick={() => setShowCreateOverlay(true)}>
                New Document
              </Button>
            </div>
          }
          style={{ marginBottom: isWide ? t.spaceLg : t.spaceSm }}
        />

        {/* Breadcrumb — directory mode with active path */}
        {viewMode === "directory" && (directoryPath || isUnfiledView) && (
          <DirectoryBreadcrumb
            path={isUnfiledView ? "__unfiled__" : directoryPath}
            onNavigate={(path) => {
              setDirectoryPath(path);
              if (!path) setFolderFilter("");
            }}
          />
        )}

        {/* Mobile: sticky search bar */}
        {!isWide && (
          <MobileSearchBar
            title={titleFilter}
            onTitleChange={setTitleFilter}
            activeCount={activeFilterCount}
            onOpenFilters={() => setShowBottomSheet(true)}
            semanticSearchAvailable={semanticSearchAvailable}
            semanticMode={semanticMode}
            onSemanticModeChange={setSemanticMode}
          />
        )}

        {/* Mobile: active filter chips */}
        {!isWide && <ActiveFilterChips filters={activeFilters} />}

        {/* Document grid */}
        <div style={{ flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: t.spaceXl, color: t.colorTextMuted }}>
              Loading...
            </div>
          ) : sorted.length === 0 ? (
            <EmptyState
              icon="description"
              message={activeFilterCount > 0 || titleFilter
                ? "No documents match your filters."
                : "No documents yet."}
              variant="card"
            />
          ) : viewMode === "directory" && !isSemanticResults && !isUnfiledView ? (
            <DirectoryView
              documents={sorted}
              currentPath={directoryPath}
              selectedDocumentId={selectedDocumentId}
              onNavigate={(path) => setDirectoryPath(path)}
              onSelectUnfiled={() => { setDirectoryPath(""); setFolderFilter("__unfiled__"); }}
              onSelectDocument={(id) => setSelectedDocumentId(id)}
              onDeleteDocument={(doc) => setDeleteTarget(doc)}
              onDeleteFolder={(path, docCount) => setDeleteFolderTarget({ path, docCount })}
              onToggleFavorite={(doc) => update(doc.id, { favorite: !doc.favorite })}
            />
          ) : (
            <DocumentTable
              documents={isUnfiledView ? sorted.filter(d => !d.folder) : sorted}
              selectedDocumentId={selectedDocumentId}
              onSelectDocument={(id) => setSelectedDocumentId(id)}
              onDeleteDocument={(doc) => setDeleteTarget(doc)}
              onToggleFavorite={(doc) => update(doc.id, { favorite: !doc.favorite })}
              groupByFolder={false}
            />
          )}
        </div>

        {totalPages > 1 && !isSemanticResults && (
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            onPageChange={setPage}
          />
        )}
      </div>

      {/* Mobile: bottom sheet filter panel */}
      {!isWide && (
        <BottomSheet open={showBottomSheet} onClose={() => setShowBottomSheet(false)}>
          <SidebarInner {...sidebarProps} mobile />
        </BottomSheet>
      )}

      {selectedDocumentId && (
        <DocumentReaderModal
          documentId={selectedDocumentId}
          onClose={() => setSelectedDocumentId(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Document"
          message={`Are you sure you want to delete "${deleteTarget.title}"? This action cannot be undone.`}
          variant="destructive"
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {deleteFolderTarget && (
        <ConfirmDialog
          title="Delete Folder"
          message={`Delete all ${deleteFolderTarget.docCount} document${deleteFolderTarget.docCount !== 1 ? "s" : ""} in "${deleteFolderTarget.path}"? This action cannot be undone.`}
          variant="destructive"
          confirmLabel="Delete"
          onConfirm={handleDeleteFolder}
          onCancel={() => setDeleteFolderTarget(null)}
        />
      )}

      {showGitHubBrowser && (
        <GitHubBrowserOverlay
          folders={knownFolders}
          onDone={() => showToast("Files imported", "success")}
          onClose={() => setShowGitHubBrowser(false)}
        />
      )}

      {showImportOverlay && (
        <ImportDocumentOverlay
          folders={knownFolders}
          onImport={async (fields) => {
            try {
              await importDocument(fields);
              showToast("Document imported", "success");
            } catch (err) {
              showToast(err instanceof ApiError ? err.message : "Failed to import document");
              throw err;
            }
          }}
          onClose={() => setShowImportOverlay(false)}
        />
      )}

      {showCreateOverlay && (
        <CreateDocumentOverlay
          folders={knownFolders}
          onCreated={async (fields) => {
            try {
              await create(fields);
              showToast("Document created", "success");
            } catch (err) {
              showToast(err instanceof ApiError ? err.message : "Failed to create document");
              throw err;
            }
          }}
          onClose={() => setShowCreateOverlay(false)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Directory breadcrumb
// ---------------------------------------------------------------------------

function DirectoryBreadcrumb({ path, onNavigate }: { path: string; onNavigate: (path: string) => void }) {
  if (path === "__unfiled__") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: t.spaceXs, marginBottom: t.spaceMd }}>
        <BreadcrumbLink label="All Folders" icon="folder" onClick={() => onNavigate("")} />
        <Icon name="chevron_right" size={14} style={{ color: t.colorTextSecondary }} />
        <span style={{ fontSize: t.fontSizeXs, fontFamily: t.fontSans, color: t.colorText, fontWeight: 600 }}>
          Unfiled
        </span>
      </div>
    );
  }

  const segments = path.split("/");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: t.spaceXs, marginBottom: t.spaceMd, flexWrap: "wrap" }}>
      <BreadcrumbLink label="All Folders" icon="folder" onClick={() => onNavigate("")} />
      {segments.map((segment, i) => {
        const isLast = i === segments.length - 1;
        const pathUpTo = segments.slice(0, i + 1).join("/");
        return (
          <span key={pathUpTo} style={{ display: "flex", alignItems: "center", gap: t.spaceXs }}>
            <Icon name="chevron_right" size={14} style={{ color: t.colorTextSecondary }} />
            {isLast ? (
              <span style={{ fontSize: t.fontSizeXs, fontFamily: t.fontSans, color: t.colorText, fontWeight: 600 }}>
                {segment}
              </span>
            ) : (
              <BreadcrumbLink label={segment} onClick={() => onNavigate(pathUpTo)} />
            )}
          </span>
        );
      })}
    </div>
  );
}

function BreadcrumbLink({ label, icon, onClick }: { label: string; icon?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 4,
        border: "none", background: "transparent", cursor: "pointer",
        fontSize: t.fontSizeXs, fontFamily: t.fontSans,
        color: t.colorActionPrimary, fontWeight: 600, padding: 0,
      }}
    >
      {icon && <Icon name={icon} size={14} />}
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Directory view — combines folder tiles + documents at current level
// ---------------------------------------------------------------------------

function DirectoryView({
  documents, currentPath, selectedDocumentId,
  onNavigate, onSelectUnfiled, onSelectDocument, onDeleteDocument, onDeleteFolder, onToggleFavorite,
}: {
  documents: DocumentSummary[];
  currentPath: string;
  selectedDocumentId: string | null;
  onNavigate: (path: string) => void;
  onSelectUnfiled: () => void;
  onSelectDocument: (id: string) => void;
  onDeleteDocument: (doc: DocumentSummary) => void;
  onDeleteFolder: (path: string, docCount: number) => void;
  onToggleFavorite: (doc: DocumentSummary) => void;
}) {
  // Compute documents at exactly this path (not deeper)
  const docsAtLevel = useMemo(() => {
    if (!currentPath) return documents.filter(d => !d.folder);
    return documents.filter(d =>
      d.folder === currentPath || // exact match — doc is filed at this folder
      false // don't include docs in subfolders
    );
  }, [documents, currentPath]);

  // Check if folder tiles will render
  const hasSubfolders = useMemo(() => {
    if (!currentPath) {
      return documents.some(d => d.folder);
    }
    const prefix = currentPath + "/";
    return documents.some(d => d.folder && d.folder.startsWith(prefix) && d.folder !== currentPath);
  }, [documents, currentPath]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: t.spaceLg }}>
      {/* Folder tiles */}
      <FolderTileGrid
        documents={documents}
        currentPath={currentPath}
        onNavigate={onNavigate}
        onSelectUnfiled={onSelectUnfiled}
        onDeleteFolder={onDeleteFolder}
      />

      {/* Documents at this level */}
      {docsAtLevel.length > 0 && (
        <div>
          {hasSubfolders && (
            <div style={{
              display: "flex", alignItems: "center", gap: t.spaceXs,
              marginBottom: t.spaceSm, paddingLeft: t.spaceSm,
            }}>
              <Icon name="description" size={15} style={{ color: t.colorTextSecondary }} />
              <span style={{
                fontSize: t.fontSizeXs, fontWeight: 700,
                fontFamily: t.fontSans, color: t.colorTextMuted,
              }}>
                Documents
              </span>
              <span style={{ fontSize: t.fontSizeXs, color: t.colorTextSecondary }}>
                {docsAtLevel.length}
              </span>
            </div>
          )}
          <DocumentTable
            documents={docsAtLevel}
            selectedDocumentId={selectedDocumentId}
            onSelectDocument={onSelectDocument}
            onDeleteDocument={onDeleteDocument}
            onToggleFavorite={onToggleFavorite}
          />
        </div>
      )}

      {/* Empty state when no subfolders and no docs at this level */}
      {!hasSubfolders && docsAtLevel.length === 0 && (
        <EmptyState
          icon="folder_open"
          message="This folder is empty."
          variant="card"
        />
      )}
    </div>
  );
}
