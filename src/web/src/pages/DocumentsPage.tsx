import { useEffect, useMemo, useRef, useState } from "react";
import {
  useTheme,
  PageHeader,
  EmptyState,
  Pagination,
  ConfirmDialog,
  Button,
  CreateDocumentOverlay,
} from "../components";
import { Icon } from "../components/atoms/Icon";
import { Input } from "../components/atoms/Input";
import { Overlay } from "../components/atoms/Overlay";
import { SectionLabel } from "../components/atoms/SectionLabel";
import { DocumentTable } from "../components/organisms/DocumentTable";
import { DocumentReaderModal } from "../components/organisms/DocumentReaderModal";
import { useDocuments } from "../hooks/useDocuments";
import { useProjects } from "../hooks";
import { useToastContext } from "../components/ToastContext";
import { useWindowWidth, SMALL_BREAKPOINT } from "../hooks/useWindowWidth";
import { ApiError } from "../api";
import { TAG_CATEGORIES } from "../types";
import type { Theme } from "../components/theme/theme";
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
  mobile,
}: SidebarProps & { mobile: boolean }) {
  const { theme } = useTheme();
  const [localTitle, setLocalTitle] = useState(title);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setLocalTitle(title); }, [title]);

  function handleTitleInput(value: string) {
    setLocalTitle(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onTitleChange(value), 350);
  }

  const sectionGap = theme.spacing.lg;
  const itemGap = theme.spacing.xs;

  return (
    <nav
      style={{
        display: "flex",
        flexDirection: "column",
        gap: sectionGap,
        padding: mobile ? theme.spacing.md : `${theme.spacing["2xl"]} ${theme.spacing.md}`,
        ...(mobile ? {} : { width: 220, flexShrink: 0, borderRight: `1px solid ${theme.color.borderSubtle}` }),
        overflowY: "auto",
        scrollbarWidth: "none" as const,
      }}
    >
      {/* Search — desktop sidebar only */}
      {!mobile && (
        <div>
          <Input
            placeholder="Search..."
            value={localTitle}
            onChange={(e) => handleTitleInput(e.target.value)}
          />
        </div>
      )}

      {activeCount > 0 && (
        <button
          onClick={onClearAll}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
            borderRadius: theme.radius.md,
            border: `1px solid ${theme.color.borderSubtle}`,
            background: "transparent",
            color: theme.color.textMuted,
            fontSize: theme.font.size.xxs,
            fontFamily: theme.font.body,
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
          gap: theme.spacing.xs,
          padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
          borderRadius: theme.radius.md,
          border: `1px solid ${favorite ? theme.color.warning + "60" : theme.color.borderSubtle}`,
          background: favorite ? `${theme.color.warning}18` : "transparent",
          color: favorite ? theme.color.warning : theme.color.textMuted,
          fontSize: theme.font.size.xxs,
          fontFamily: theme.font.body,
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
          <SidebarItem label="All projects" icon="apps" active={selectedProjectId === ""} onClick={() => onProjectChange("")} theme={theme} />
          {projects.map((p) => (
            <SidebarItem key={p.id} label={p.title} icon="folder_special" active={selectedProjectId === p.id} onClick={() => onProjectChange(selectedProjectId === p.id ? "" : p.id)} theme={theme} />
          ))}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: itemGap }}>
        <SectionLabel>Tags</SectionLabel>
        <SidebarItem label="All tags" icon="label" active={selectedTag === ""} onClick={() => onTagChange("")} theme={theme} />
        {Object.entries(TAG_CATEGORIES).map(([category, tags]) => (
          <div key={category} style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <span style={{ fontSize: theme.font.size.xxs, color: theme.color.textFaint, fontWeight: 600, padding: `${theme.spacing.xs} ${theme.spacing.sm}`, paddingBottom: 0 }}>
              {category}
            </span>
            {(tags as readonly TagName[]).map((tag) => (
              <SidebarItem key={tag} label={tag} active={selectedTag === tag} onClick={() => onTagChange(selectedTag === tag ? "" : tag)} theme={theme} />
            ))}
          </div>
        ))}
      </div>

      {folders.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: itemGap }}>
          <SectionLabel>Folders</SectionLabel>
          <SidebarItem label="All folders" icon="folder" active={selectedFolder === ""} onClick={() => onFolderChange("")} theme={theme} />
          {folders.map((f) => (
            <SidebarItem key={f} label={f} icon="folder" active={selectedFolder === f} onClick={() => onFolderChange(selectedFolder === f ? "" : f)} theme={theme} />
          ))}
        </div>
      )}
    </nav>
  );
}

function SidebarItem({ label, icon, active, onClick, theme }: { label: string; icon?: string; active: boolean; onClick: () => void; theme: Theme }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: theme.spacing.xs,
        padding: `3px ${theme.spacing.sm}`,
        borderRadius: theme.radius.md,
        border: "none",
        background: active ? `${theme.color.primary}18` : hovered ? `${theme.color.textFaint}10` : "transparent",
        color: active ? theme.color.primary : theme.color.textMuted,
        fontSize: theme.font.size.xxs,
        fontFamily: theme.font.body,
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

function ActiveFilterChips({ filters, theme }: { filters: ActiveFilter[]; theme: Theme }) {
  if (filters.length === 0) return null;
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: `0 0 ${theme.spacing.sm}` }}>
      {filters.map((f) => (
        <button
          key={f.key}
          onClick={f.onRemove}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: `2px ${theme.spacing.xs} 2px ${theme.spacing.sm}`,
            borderRadius: theme.radius.full,
            border: `1px solid ${theme.color.primary}40`,
            background: `${theme.color.primary}14`,
            color: theme.color.primary,
            fontSize: theme.font.size.xxs,
            fontWeight: 600,
            fontFamily: theme.font.body,
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
  const { theme } = useTheme();

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
          background: theme.color.surfaceContainer,
          borderTop: `1px solid ${theme.color.border}`,
          borderRadius: `${theme.radius.xl}px ${theme.radius.xl}px 0 0`,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "slide-up 0.25s ease-out",
        }}
      >
        {/* Handle bar */}
        <div style={{ display: "flex", justifyContent: "center", padding: `${theme.spacing.sm} 0 0` }}>
          <div style={{ width: 36, height: 4, borderRadius: theme.radius.full, background: theme.color.textFaint, opacity: 0.4 }} />
        </div>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: `${theme.spacing.sm} ${theme.spacing.md}` }}>
          <span style={{ fontSize: theme.font.size.sm, fontWeight: 700, fontFamily: theme.font.headline, color: theme.color.text }}>
            Filters
          </span>
          <button
            onClick={onClose}
            style={{
              padding: theme.spacing.xs,
              border: "none",
              background: "transparent",
              color: theme.color.primary,
              fontSize: theme.font.size.xs,
              fontWeight: 600,
              fontFamily: theme.font.body,
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
}: {
  title: string;
  onTitleChange: (v: string) => void;
  activeCount: number;
  onOpenFilters: () => void;
}) {
  const { theme } = useTheme();
  const [localTitle, setLocalTitle] = useState(title);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setLocalTitle(title); }, [title]);

  function handleTitleInput(value: string) {
    setLocalTitle(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onTitleChange(value), 350);
  }

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        background: theme.color.surface,
        paddingBottom: theme.spacing.sm,
        display: "flex",
        gap: theme.spacing.sm,
        alignItems: "center",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <Input
          placeholder="Search knowledge base..."
          value={localTitle}
          onChange={(e) => handleTitleInput(e.target.value)}
        />
      </div>
      <button
        onClick={onOpenFilters}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
          borderRadius: theme.radius.md,
          border: `1px solid ${activeCount > 0 ? theme.color.primary : theme.color.borderSubtle}`,
          background: activeCount > 0 ? `${theme.color.primary}18` : "transparent",
          color: activeCount > 0 ? theme.color.primary : theme.color.textMuted,
          fontSize: theme.font.size.xxs,
          fontWeight: 600,
          fontFamily: theme.font.body,
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
  const { theme } = useTheme();
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

  // Entity state
  const [deleteTarget, setDeleteTarget] = useState<DocumentSummary | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [showCreateOverlay, setShowCreateOverlay] = useState(false);

  // Data
  const { projects } = useProjects();

  const filter = {
    ...(titleFilter ? { title: titleFilter } : {}),
    ...(tagFilter ? { tag: tagFilter } : {}),
    ...(folderFilter ? { folder: folderFilter } : {}),
    ...(favoriteFilter ? { favorite: true as const } : {}),
    ...(projectFilter ? { project_id: projectFilter } : {}),
  };

  const { documents, loading, total, totalPages, page, setPage, create, update, remove } = useDocuments(
    Object.keys(filter).length > 0 ? filter : undefined,
  );

  const knownFolders = useMemo(() => {
    const set = new Set<string>();
    for (const doc of documents) {
      if (doc.folder) set.add(doc.folder);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [documents]);

  const sorted = [...documents].sort((a, b) => b.updated_at.localeCompare(a.updated_at));

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
    activeFilters.push({ key: "folder", label: folderFilter, icon: "folder", onRemove: () => setFolderFilter("") });
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
          padding: isWide ? `${theme.spacing["2xl"]} ${theme.spacing.xl}` : `${theme.spacing.md} ${theme.spacing.md}`,
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
            <Button size="sm" onClick={() => setShowCreateOverlay(true)}>
              New Document
            </Button>
          }
          style={{ marginBottom: isWide ? theme.spacing.lg : theme.spacing.sm }}
        />

        {/* Mobile: sticky search bar */}
        {!isWide && (
          <MobileSearchBar
            title={titleFilter}
            onTitleChange={setTitleFilter}
            activeCount={activeFilterCount}
            onOpenFilters={() => setShowBottomSheet(true)}
          />
        )}

        {/* Mobile: active filter chips */}
        {!isWide && <ActiveFilterChips filters={activeFilters} theme={theme} />}

        {/* Document grid */}
        <div style={{ flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: theme.spacing.xl, color: theme.color.textMuted }}>
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
          ) : (
            <DocumentTable
              documents={sorted}
              selectedDocumentId={selectedDocumentId}
              onSelectDocument={(id) => setSelectedDocumentId(id)}
              onDeleteDocument={(doc) => setDeleteTarget(doc)}
              onToggleFavorite={(doc) => update(doc.id, { favorite: !doc.favorite })}
            />
          )}
        </div>

        {totalPages > 1 && (
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
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
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
