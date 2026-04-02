import { useState } from "react";
import {
  useTheme,
  PageHeader,
  EmptyState,
  Pagination,
  ConfirmDialog,
} from "../components";
import { DocumentSearchBar } from "../components/molecules/DocumentSearchBar";
import { DocumentTable } from "../components/organisms/DocumentTable";
import { DocumentReaderModal } from "../components/organisms/DocumentReaderModal";
import { useDocuments } from "../hooks/useDocuments";
import { useToastContext } from "../components/ToastContext";
import { ApiError } from "../api";
import type { DocumentSummary } from "../types";

// ---------------------------------------------------------------------------
// DocumentsPage
// ---------------------------------------------------------------------------

export function DocumentsPage() {
  const { theme } = useTheme();
  const { showToast } = useToastContext();
  const [titleFilter, setTitleFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DocumentSummary | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);

  const filter = {
    ...(titleFilter ? { title: titleFilter } : {}),
    ...(tagFilter ? { tag: tagFilter } : {}),
  };

  const { documents, loading, total, totalPages, page, setPage, remove } = useDocuments(
    Object.keys(filter).length > 0 ? filter : undefined,
  );

  const sorted = [...documents].sort((a, b) => b.updated_at.localeCompare(a.updated_at));

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await remove([deleteTarget.id]);
      if (selectedDocumentId === deleteTarget.id) {
        setSelectedDocumentId(null);
      }
      setDeleteTarget(null);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to delete document");
    }
  }

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
      {/* Main content — table + filters */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          padding: `${theme.spacing["2xl"]} ${theme.spacing.xl}`,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          scrollbarWidth: "none" as const,
        }}
      >
        <PageHeader
          title="Documents"
          subtitle="Browse and search your knowledge base."
          trailing={
            <span style={{ fontSize: theme.font.size.xs, color: theme.color.textFaint }}>
              {total} document{total !== 1 ? "s" : ""}
            </span>
          }
          style={{ marginBottom: theme.spacing.xl }}
        />

        <DocumentSearchBar
          title={titleFilter}
          tag={tagFilter}
          onTitleChange={setTitleFilter}
          onTagChange={setTagFilter}
        />

        <div style={{ marginTop: theme.spacing.lg }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: theme.spacing.xl, color: theme.color.textMuted }}>
              Loading...
            </div>
          ) : sorted.length === 0 ? (
            <EmptyState
              icon="description"
              message={titleFilter || tagFilter
                ? "No documents match your search."
                : "No documents yet."}
              variant="card"
            />
          ) : (
            <DocumentTable
              documents={sorted}
              selectedDocumentId={selectedDocumentId}
              onSelectDocument={(id) => setSelectedDocumentId(id)}
              onDeleteDocument={(doc) => setDeleteTarget(doc)}
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
    </div>
  );
}
