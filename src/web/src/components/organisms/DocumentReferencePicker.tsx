import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "../theme/ThemeContext";
import { CreateEntityOverlay } from "./CreateEntityOverlay";
import { Badge } from "../atoms/Badge";
import { Icon } from "../atoms/Icon";
import { IconButton } from "../atoms/IconButton";
import { Button } from "../atoms/Button";
import { Input } from "../atoms/Input";
import { Select } from "../atoms/Select";
import { TagChip } from "../molecules/TagChip";
import { fetchDocuments } from "../../api";
import type { DocumentSummary } from "../../types";
import { REFERENCE_TYPES, type ReferenceType, type DocumentReferenceDetail } from "../../types";

interface DocumentReferencePickerProps {
  entityType: "project" | "task";
  entityId: string;
  existingReferences: DocumentReferenceDetail[];
  preselectedType?: ReferenceType;
  onSave: (mergePatch: Record<string, Array<{ type: ReferenceType }> | null>) => Promise<void>;
  onClose: () => void;
}

const TYPE_LABELS: Record<ReferenceType, string> = {
  goal: "Goal",
  plan: "Plan",
  requirements: "Requirements",
  design: "Design",
  reference: "Reference",
  note: "Note",
};

const TYPE_OPTIONS = REFERENCE_TYPES.map((t) => ({
  value: t,
  label: TYPE_LABELS[t],
}));

const PAGE_SIZE = 50;

export function DocumentReferencePicker({
  entityType,
  entityId,
  existingReferences,
  preselectedType = "reference",
  onSave,
  onClose,
}: DocumentReferencePickerProps) {
  const { theme } = useTheme();
  const [saving, setSaving] = useState(false);

  // -- Search state --
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // -- Document list state --
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);

  // -- Merge-patch state --
  // Tracks all pending changes
  const [patch, setPatch] = useState<Record<string, Array<{ type: ReferenceType }> | null>>({});

  // -- Staging state for new links: doc_id -> selected types
  const [stagedTypes, setStagedTypes] = useState<Record<string, ReferenceType[]>>({});

  // -- Debounced search --
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setOffset(0);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchTerm]);

  // -- Load documents --
  const loadDocuments = useCallback(
    async (newOffset: number) => {
      setLoading(true);
      try {
        const params: Record<string, string | number> = {
          limit: PAGE_SIZE,
          offset: newOffset,
        };
        if (debouncedSearch) params.title = debouncedSearch;
        const result = await fetchDocuments(params);
        if (newOffset === 0) {
          setDocuments(result.data);
        } else {
          setDocuments((prev) => [...prev, ...result.data]);
        }
        setTotal(result.total);
      } finally {
        setLoading(false);
      }
    },
    [debouncedSearch],
  );

  useEffect(() => {
    loadDocuments(0);
  }, [loadDocuments]);

  const handleLoadMore = () => {
    const newOffset = offset + PAGE_SIZE;
    setOffset(newOffset);
    loadDocuments(newOffset);
  };

  // -- Compute current state of references (existing + patch) --
  const linkedDocMap = useMemo(() => {
    const map = new Map<string, Array<{ type: ReferenceType }>>();
    // Start with existing references
    for (const ref of existingReferences) {
      const existing = map.get(ref.document_id) ?? [];
      existing.push({ type: ref.type });
      map.set(ref.document_id, existing);
    }
    // Apply patch
    for (const [docId, value] of Object.entries(patch)) {
      if (value === null) {
        map.delete(docId);
      } else {
        map.set(docId, value);
      }
    }
    return map;
  }, [existingReferences, patch]);

  const linkedDocIds = useMemo(() => new Set(linkedDocMap.keys()), [linkedDocMap]);

  // Split documents into linked and available
  const linkedDocs = useMemo(
    () => documents.filter((d) => linkedDocIds.has(d.id)),
    [documents, linkedDocIds],
  );
  const availableDocs = useMemo(
    () => documents.filter((d) => !linkedDocIds.has(d.id)),
    [documents, linkedDocIds],
  );

  // -- Handlers --
  const addTypeToLinked = (docId: string, newType: ReferenceType) => {
    const current = linkedDocMap.get(docId) ?? [];
    if (current.some((r) => r.type === newType)) return;
    const updated = [...current, { type: newType }];
    setPatch((prev) => ({ ...prev, [docId]: updated }));
  };

  const removeTypeFromLinked = (docId: string, typeToRemove: ReferenceType) => {
    const current = linkedDocMap.get(docId) ?? [];
    const updated = current.filter((r) => r.type !== typeToRemove);
    if (updated.length === 0) {
      setPatch((prev) => ({ ...prev, [docId]: null }));
    } else {
      setPatch((prev) => ({ ...prev, [docId]: updated }));
    }
  };

  const unlinkDocument = (docId: string) => {
    setPatch((prev) => ({ ...prev, [docId]: null }));
    // Clean up staged types too
    setStagedTypes((prev) => {
      const next = { ...prev };
      delete next[docId];
      return next;
    });
  };

  const linkDocument = (docId: string) => {
    const types = stagedTypes[docId] ?? [preselectedType];
    const refs = types.map((t) => ({ type: t }));
    setPatch((prev) => ({ ...prev, [docId]: refs }));
    // Clear staged
    setStagedTypes((prev) => {
      const next = { ...prev };
      delete next[docId];
      return next;
    });
  };

  const updateStagedType = (docId: string, index: number, newType: ReferenceType) => {
    setStagedTypes((prev) => {
      const current = prev[docId] ?? [preselectedType];
      const updated = [...current];
      updated[index] = newType;
      return { ...prev, [docId]: updated };
    });
  };

  const addStagedTypeSlot = (docId: string) => {
    setStagedTypes((prev) => {
      const current = prev[docId] ?? [preselectedType];
      return { ...prev, [docId]: [...current, "reference"] };
    });
  };

  const handleSave = async () => {
    if (Object.keys(patch).length === 0) {
      onClose();
      return;
    }
    setSaving(true);
    try {
      await onSave(patch);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = Object.keys(patch).length > 0;
  const hasMore = documents.length < total;

  return (
    <CreateEntityOverlay
      title="Link Documents"
      onSubmit={handleSave}
      onClose={onClose}
      loading={saving}
      submitDisabled={!hasChanges}
      submitLabel="Save Changes"
    >
      {/* Search */}
      <Input
        placeholder="Search by title..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.currentTarget.value)}
        style={{ width: "100%" }}
      />

      <div
        style={{
          maxHeight: "60vh",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.lg,
        }}
      >
        {/* Already linked section */}
        {linkedDocs.length > 0 && (
          <div>
            <div
              style={{
                fontSize: theme.font.size.xs,
                fontWeight: 700,
                letterSpacing: theme.font.letterSpacing.wide,
                textTransform: "uppercase",
                color: theme.color.textFaint,
                marginBottom: theme.spacing.sm,
              }}
            >
              Already linked
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: theme.spacing.sm,
              }}
            >
              {linkedDocs.map((doc) => {
                const types = linkedDocMap.get(doc.id) ?? [];
                return (
                  <LinkedDocRow
                    key={doc.id}
                    doc={doc}
                    types={types}
                    onAddType={(t) => addTypeToLinked(doc.id, t)}
                    onRemoveType={(t) => removeTypeFromLinked(doc.id, t)}
                    onUnlink={() => unlinkDocument(doc.id)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Also show linked docs not in current search results */}
        {existingReferences.length > 0 && linkedDocs.length === 0 && !debouncedSearch && (
          <div
            style={{
              fontSize: theme.font.size.sm,
              color: theme.color.textFaint,
              textAlign: "center",
              padding: theme.spacing.md,
            }}
          >
            No linked documents match the search
          </div>
        )}

        {/* Available documents section */}
        <div>
          <div
            style={{
              fontSize: theme.font.size.xs,
              fontWeight: 700,
              letterSpacing: theme.font.letterSpacing.wide,
              textTransform: "uppercase",
              color: theme.color.textFaint,
              marginBottom: theme.spacing.sm,
            }}
          >
            Available documents
          </div>
          {availableDocs.length > 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: theme.spacing.sm,
              }}
            >
              {availableDocs.map((doc) => {
                const staged = stagedTypes[doc.id] ?? [preselectedType];
                return (
                  <AvailableDocRow
                    key={doc.id}
                    doc={doc}
                    stagedTypes={staged}
                    onUpdateType={(i, t) => updateStagedType(doc.id, i, t)}
                    onAddSlot={() => addStagedTypeSlot(doc.id)}
                    onLink={() => linkDocument(doc.id)}
                  />
                );
              })}
            </div>
          ) : (
            <div
              style={{
                fontSize: theme.font.size.sm,
                color: theme.color.textFaint,
                textAlign: "center",
                padding: theme.spacing.md,
              }}
            >
              {loading ? "Loading..." : "No documents found"}
            </div>
          )}

          {/* Load More */}
          {hasMore && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginTop: theme.spacing.md,
              }}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLoadMore}
                loading={loading}
              >
                Load More
              </Button>
            </div>
          )}
        </div>
      </div>
    </CreateEntityOverlay>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function LinkedDocRow({
  doc,
  types,
  onAddType,
  onRemoveType,
  onUnlink,
}: {
  doc: DocumentSummary;
  types: Array<{ type: ReferenceType }>;
  onAddType: (t: ReferenceType) => void;
  onRemoveType: (t: ReferenceType) => void;
  onUnlink: () => void;
}) {
  const { theme } = useTheme();
  const [showAddType, setShowAddType] = useState(false);
  const [newType, setNewType] = useState<ReferenceType>("reference");

  const usedTypes = new Set(types.map((t) => t.type));
  const availableTypes = REFERENCE_TYPES.filter((t) => !usedTypes.has(t));

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.xs,
        padding: `${theme.spacing.sm} ${theme.spacing.md}`,
        background: theme.color.surfaceContainerLow,
        borderRadius: theme.radius.lg,
        border: `1px solid ${theme.color.borderSubtle}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: theme.spacing.sm }}>
        {doc.favorite && (
          <Icon name="star" size={14} style={{ color: theme.color.warning, flexShrink: 0 }} />
        )}
        <span
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: theme.font.size.sm,
            fontWeight: 600,
            color: theme.color.text,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {doc.title}
        </span>
        <Button
          variant="danger"
          size="sm"
          onClick={onUnlink}
          style={{ flexShrink: 0 }}
        >
          Unlink
        </Button>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
        {types.map((t) => (
          <TagChip
            key={t.type}
            name={TYPE_LABELS[t.type]}
            onRemove={() => onRemoveType(t.type)}
          />
        ))}
        {availableTypes.length > 0 && !showAddType && (
          <IconButton
            icon="add"
            size={12}
            onClick={() => {
              setNewType(availableTypes[0]);
              setShowAddType(true);
            }}
            aria-label="Add type"
            style={{ width: 22, height: 22, minWidth: 22 }}
          />
        )}
        {showAddType && (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Select
              value={newType}
              options={availableTypes.map((t) => ({ value: t, label: TYPE_LABELS[t] }))}
              onChange={(e) => setNewType(e.currentTarget.value as ReferenceType)}
              style={{ fontSize: theme.font.size.xs, padding: "2px 4px", minWidth: 90 }}
            />
            <IconButton
              icon="check"
              size={14}
              onClick={() => {
                onAddType(newType);
                setShowAddType(false);
              }}
              aria-label="Confirm type"
              style={{ width: 22, height: 22, minWidth: 22, color: theme.color.success }}
            />
            <IconButton
              icon="close"
              size={14}
              onClick={() => setShowAddType(false)}
              aria-label="Cancel"
              style={{ width: 22, height: 22, minWidth: 22 }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function AvailableDocRow({
  doc,
  stagedTypes,
  onUpdateType,
  onAddSlot,
  onLink,
}: {
  doc: DocumentSummary;
  stagedTypes: ReferenceType[];
  onUpdateType: (index: number, type: ReferenceType) => void;
  onAddSlot: () => void;
  onLink: () => void;
}) {
  const { theme } = useTheme();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.xs,
        padding: `${theme.spacing.sm} ${theme.spacing.md}`,
        background: theme.color.surfaceContainerLow,
        borderRadius: theme.radius.lg,
        border: `1px solid ${theme.color.borderSubtle}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: theme.spacing.sm }}>
        {doc.favorite && (
          <Icon name="star" size={14} style={{ color: theme.color.warning, flexShrink: 0 }} />
        )}
        <span
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: theme.font.size.sm,
            fontWeight: 500,
            color: theme.color.text,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {doc.title}
        </span>
        <Button
          variant="primary"
          size="sm"
          onClick={onLink}
          style={{ flexShrink: 0 }}
        >
          Link
        </Button>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
        {stagedTypes.map((t, i) => (
          <Select
            key={i}
            value={t}
            options={TYPE_OPTIONS}
            onChange={(e) => onUpdateType(i, e.currentTarget.value as ReferenceType)}
            style={{ fontSize: theme.font.size.xs, padding: "2px 4px", minWidth: 90 }}
          />
        ))}
        <IconButton
          icon="add"
          size={12}
          onClick={onAddSlot}
          aria-label="Add another type"
          style={{ width: 22, height: 22, minWidth: 22 }}
        />
      </div>
    </div>
  );
}
