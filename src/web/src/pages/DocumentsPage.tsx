import { useState } from "react";
import {
  useTheme,
  ListPageLayout,
  DetailPageLayout,
  PageHeader,
  EmptyState,
  BackButton,
  Pagination,
  ConfirmDialog,
  TagChip,
  MetadataTable,
} from "../components";
import { DocumentListItem } from "../components/molecules/DocumentListItem";
import { DocumentSearchBar } from "../components/molecules/DocumentSearchBar";
import { DocumentViewer } from "../components/organisms/DocumentViewer";
import { useDocuments } from "../hooks/useDocuments";
import { useDocument } from "../hooks/useDocument";
import { useToastContext } from "../components/ToastContext";
import { ApiError } from "../api";
import type { DocumentSummary } from "../types";
import { formatDate } from "../utils";

// ---------------------------------------------------------------------------
// DocumentDetail
// ---------------------------------------------------------------------------

function DocumentDetail({ documentId, onBack }: { documentId: string; onBack: () => void }) {
  const { theme } = useTheme();
  const { document, notFound, loading } = useDocument(documentId);

  if (notFound) {
    return (
      <DetailPageLayout>
        <div style={{ flex: 1, width: "100%", maxWidth: 900, padding: `${theme.spacing["2xl"]} ${theme.spacing.xl}`, boxSizing: "border-box" }}>
          <BackButton onClick={onBack} label="All Documents" />
          <EmptyState
            icon="error_outline"
            message="Document not found."
            variant="card"
            style={{ marginTop: theme.spacing.xl }}
          />
        </div>
      </DetailPageLayout>
    );
  }

  if (loading || !document) {
    return (
      <DetailPageLayout>
        <div style={{ flex: 1, width: "100%", maxWidth: 900, padding: `${theme.spacing["2xl"]} ${theme.spacing.xl}`, boxSizing: "border-box" }}>
          <p style={{ color: theme.color.textMuted, fontSize: theme.font.size.sm }}>Loading...</p>
        </div>
      </DetailPageLayout>
    );
  }

  return (
    <DetailPageLayout>
      <div
        style={{
          flex: 1,
          minWidth: 0,
          padding: `${theme.spacing["2xl"]} ${theme.spacing.xl}`,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto" as const,
          scrollbarWidth: "none" as const,
        }}
      >
        <BackButton onClick={onBack} label="All Documents" style={{ marginBottom: theme.spacing.lg }} />

        <h2
          style={{
            margin: 0,
            fontFamily: theme.font.headline,
            fontSize: theme.font.size.xl,
            fontWeight: 800,
            letterSpacing: theme.font.letterSpacing.tight,
            color: theme.color.text,
            marginBottom: theme.spacing.md,
          }}
        >
          {document.title}
        </h2>

        {document.tags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: theme.spacing.lg }}>
            {document.tags.map((tag) => (
              <TagChip key={tag} name={tag} />
            ))}
          </div>
        )}

        <div style={{ marginBottom: theme.spacing.xl }}>
          <DocumentViewer content={document.content} />
        </div>

        <div
          style={{
            marginTop: "auto",
            paddingTop: theme.spacing.xl,
            borderTop: `1px solid ${theme.color.borderSubtle}`,
          }}
        >
          <MetadataTable
            title="Metadata"
            rows={[
              { label: "ID", value: document.id },
              { label: "Created", value: formatDate(document.created_at) },
              { label: "Updated", value: formatDate(document.updated_at) },
            ]}
          />
        </div>
      </div>
    </DetailPageLayout>
  );
}

// ---------------------------------------------------------------------------
// DocumentsPage
// ---------------------------------------------------------------------------

export function DocumentsPage({ onOpenDocument, selectedDocumentId, onBack }: {
  onOpenDocument: (id: string) => void;
  selectedDocumentId: string | null;
  onBack: () => void;
}) {
  const { theme } = useTheme();
  const { showToast } = useToastContext();
  const [titleFilter, setTitleFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DocumentSummary | null>(null);

  const filter = {
    ...(titleFilter ? { title: titleFilter } : {}),
    ...(tagFilter ? { tag: tagFilter } : {}),
  };

  const { documents, loading, total, totalPages, page, setPage, remove } = useDocuments(
    Object.keys(filter).length > 0 ? filter : undefined,
  );

  // Detail mode
  if (selectedDocumentId) {
    return <DocumentDetail documentId={selectedDocumentId} onBack={onBack} />;
  }

  // List mode
  const sorted = [...documents].sort((a, b) => b.updated_at.localeCompare(a.updated_at));

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await remove([deleteTarget.id]);
      setDeleteTarget(null);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to delete document");
    }
  }

  return (
    <ListPageLayout>
      <PageHeader
        title="Documents"
        subtitle="Browse and search your knowledge base."
        style={{ marginBottom: theme.spacing.xl }}
      />

      <DocumentSearchBar
        title={titleFilter}
        tag={tagFilter}
        onTitleChange={setTitleFilter}
        onTagChange={setTagFilter}
      />

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
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: theme.spacing.lg,
          }}
        >
          {sorted.map((doc) => (
            <DocumentListItem
              key={doc.id}
              document={doc}
              onClick={() => onOpenDocument(doc.id)}
              onDelete={() => setDeleteTarget(doc)}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          onPageChange={setPage}
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
    </ListPageLayout>
  );
}
