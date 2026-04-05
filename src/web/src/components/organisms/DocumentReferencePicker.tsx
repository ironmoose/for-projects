import { useEffect, useRef, useState } from "react";
import { useTheme } from "../theme/ThemeContext";
import { Input } from "../atoms/Input";
import { Select } from "../atoms/Select";
import { Button } from "../atoms/Button";
import { TagChip } from "../molecules/TagChip";
import { CreateEntityOverlay } from "./CreateEntityOverlay";
import { fetchDocuments } from "../../api";
import type { DocumentSummary } from "../../types";

const REFERENCE_TYPES = [
  { value: "reference", label: "Reference" },
  { value: "goal", label: "Goal" },
  { value: "plan", label: "Plan" },
  { value: "requirements", label: "Requirements" },
  { value: "design", label: "Design" },
  { value: "note", label: "Note" },
] as const;

export type ReferenceType = (typeof REFERENCE_TYPES)[number]["value"];

const PAGE_SIZE = 50;

interface DocumentReferencePickerProps {
  /** IDs of documents already linked to the entity */
  linkedDocIds: Set<string>;
  /** Called with arrays of doc IDs to attach and detach */
  onSave: (attach: string[], detach: string[]) => Promise<void>;
  /** Called when the picker is dismissed */
  onClose: () => void;
  /**
   * When true, hides the reference type dropdown and auto-assigns
   * `preselectedType` (defaults to "reference") on attach.
   */
  hideTypeSelection?: boolean;
  /**
   * The reference type to auto-assign when `hideTypeSelection` is true.
   * Ignored when `hideTypeSelection` is false.
   */
  preselectedType?: ReferenceType;
}

export function DocumentReferencePicker({
  linkedDocIds,
  onSave,
  onClose,
  hideTypeSelection = false,
  preselectedType = "reference",
}: DocumentReferencePickerProps) {
  const { theme } = useTheme();
  const [allDocs, setAllDocs] = useState<DocumentSummary[]>([]);
  const [totalDocs, setTotalDocs] = useState(0);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(linkedDocIds));
  const [titleSearch, setTitleSearch] = useState("");
  const [debouncedTitle, setDebouncedTitle] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<Map<string, ReferenceType>>(new Map());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce title search input (300ms)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedTitle(titleSearch);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [titleSearch]);

  // Fetch documents server-side with title filter
  useEffect(() => {
    let cancelled = false;
    setLoadingDocs(true);
    const params: { limit: number; title?: string } = { limit: PAGE_SIZE };
    if (debouncedTitle.trim()) params.title = debouncedTitle.trim();
    fetchDocuments(params)
      .then((res) => {
        if (cancelled) return;
        setAllDocs(res.data);
        setTotalDocs(res.total);
      })
      .catch(() => {
        /* error handled by caller toast context */
      })
      .finally(() => {
        if (!cancelled) setLoadingDocs(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedTitle]);

  function handleLoadMore() {
    setLoadingMore(true);
    const params: { limit: number; offset: number; title?: string } = {
      limit: PAGE_SIZE,
      offset: allDocs.length,
    };
    if (debouncedTitle.trim()) params.title = debouncedTitle.trim();
    fetchDocuments(params)
      .then((res) => {
        setAllDocs((prev) => [...prev, ...res.data]);
        setTotalDocs(res.total);
      })
      .catch(() => {
        /* error handled by caller toast context */
      })
      .finally(() => setLoadingMore(false));
  }

  function toggleDoc(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        // Clean up type selection when deselecting
        setSelectedTypes((prev) => {
          const m = new Map(prev);
          m.delete(id);
          return m;
        });
      } else {
        next.add(id);
        // Auto-assign type when hideTypeSelection is true
        if (hideTypeSelection) {
          setSelectedTypes((prev) => new Map(prev).set(id, preselectedType));
        }
      }
      return next;
    });
  }

  function handleTypeChange(docId: string, type: ReferenceType) {
    setSelectedTypes((prev) => new Map(prev).set(docId, type));
  }

  async function handleSubmit() {
    const attach: string[] = [];
    const detach: string[] = [];
    for (const id of selected) {
      if (!linkedDocIds.has(id)) attach.push(id);
    }
    for (const id of linkedDocIds) {
      if (!selected.has(id)) detach.push(id);
    }
    if (attach.length === 0 && detach.length === 0) {
      onClose();
      return;
    }
    setSubmitting(true);
    try {
      await onSave(attach, detach);
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <CreateEntityOverlay
      title="Manage Documents"
      onSubmit={handleSubmit}
      onClose={onClose}
      loading={submitting}
      submitLabel="Save"
      submitDisabled={loadingDocs}
    >
      <Input
        value={titleSearch}
        onChange={(e) => setTitleSearch(e.target.value)}
        placeholder="Search by title..."
        style={{ marginBottom: theme.spacing.sm }}
      />
      <div
        style={{
          maxHeight: 320,
          overflowY: "auto",
          border: `1px solid ${theme.color.borderSubtle}`,
          borderRadius: theme.radius.md,
          background: theme.color.surface,
        }}
      >
        {loadingDocs ? (
          <div
            style={{
              padding: theme.spacing.lg,
              textAlign: "center",
              color: theme.color.textMuted,
              fontSize: theme.font.size.sm,
            }}
          >
            Loading documents...
          </div>
        ) : allDocs.length === 0 ? (
          <div
            style={{
              padding: theme.spacing.lg,
              textAlign: "center",
              color: theme.color.textMuted,
              fontSize: theme.font.size.sm,
            }}
          >
            No documents exist yet.
          </div>
        ) : (
          <>
            {allDocs.map((doc) => {
              const isSelected = selected.has(doc.id);
              const isNewlyAttached = isSelected && !linkedDocIds.has(doc.id);

              return (
                <label
                  key={doc.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: theme.spacing.sm,
                    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                    cursor: "pointer",
                    borderBottom: `1px solid ${theme.color.borderSubtle}`,
                    fontSize: theme.font.size.sm,
                    color: theme.color.text,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleDoc(doc.id)}
                    style={{ flexShrink: 0 }}
                  />
                  <span
                    style={{
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {doc.title}
                  </span>
                  {/* Type selector — only shown when hideTypeSelection is false and doc is newly attached */}
                  {!hideTypeSelection && isNewlyAttached && (
                    <Select
                      options={[...REFERENCE_TYPES]}
                      value={selectedTypes.get(doc.id) ?? "reference"}
                      onChange={(e) =>
                        handleTypeChange(doc.id, e.target.value as ReferenceType)
                      }
                      style={{
                        width: 130,
                        flexShrink: 0,
                        fontSize: theme.font.size.xs,
                      }}
                    />
                  )}
                  {doc.tags.length > 0 && (
                    <span
                      style={{
                        display: "flex",
                        gap: theme.spacing.xs,
                        flexShrink: 0,
                      }}
                    >
                      {doc.tags.map((tag) => (
                        <TagChip key={tag} name={tag} />
                      ))}
                    </span>
                  )}
                </label>
              );
            })}
            {allDocs.length < totalDocs && (
              <div style={{ padding: theme.spacing.sm, textAlign: "center" }}>
                <Button
                  variant="ghost"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore
                    ? "Loading..."
                    : `Load more (${allDocs.length} of ${totalDocs})`}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </CreateEntityOverlay>
  );
}
