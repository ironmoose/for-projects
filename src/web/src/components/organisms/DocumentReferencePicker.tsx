import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { semantic as t, useInjectStyles } from "@4lt7ab/ui/core";
import { CreateEntityOverlay } from "./CreateEntityOverlay";
import { Badge, Icon, IconButton, Button, Input, Select, TagChip } from "@4lt7ab/ui/ui";
import { fetchDocuments } from "../../api";
import type { DocumentSummary } from "../../types";
import { REFERENCE_TYPES, type ReferenceType, type DocumentReferenceDetail } from "../../types";

const SPIN_CSS = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;

function ButtonSpinner() {
  useInjectStyles("tfp-spin", SPIN_CSS);
  return (
    <span
      style={{
        display: "inline-block",
        width: 14,
        height: 14,
        border: "2px solid currentColor",
        borderTopColor: "transparent",
        borderRadius: "50%",
        animation: "spin 0.6s linear infinite",
      }}
    />
  );
}

interface DocumentReferencePickerProps {
  entityType: "project" | "task";
  entityId: string;
  existingReferences: DocumentReferenceDetail[];
  preselectedType?: ReferenceType;
  /** When true, hides the type dropdown and auto-assigns preselectedType (default 'reference') */
  hideTypeSelection?: boolean;
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

const TYPE_OPTIONS = REFERENCE_TYPES.map((rt) => ({
  value: rt,
  label: TYPE_LABELS[rt],
}));

const PAGE_SIZE = 50;

export function DocumentReferencePicker({
  entityType,
  entityId,
  existingReferences,
  preselectedType = "reference",
  hideTypeSelection = false,
  onSave,
  onClose,
}: DocumentReferencePickerProps) {
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
    const refs = types.map((rt) => ({ type: rt }));
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
          gap: t.spaceLg,
        }}
      >
        {/* Already linked section */}
        {linkedDocs.length > 0 && (
          <div>
            <div
              style={{
                fontSize: t.fontSizeXs,
                fontWeight: 700,
                letterSpacing: t.letterSpacingWide,
                textTransform: "uppercase",
                color: t.colorTextSecondary,
                marginBottom: t.spaceSm,
              }}
            >
              Already linked
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: t.spaceSm,
              }}
            >
              {linkedDocs.map((doc) => {
                const types = linkedDocMap.get(doc.id) ?? [];
                return (
                  <LinkedDocRow
                    key={doc.id}
                    doc={doc}
                    types={types}
                    hideTypeSelection={hideTypeSelection}
                    onAddType={(rt) => addTypeToLinked(doc.id, rt)}
                    onRemoveType={(rt) => removeTypeFromLinked(doc.id, rt)}
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
              fontSize: t.fontSizeSm,
              color: t.colorTextSecondary,
              textAlign: "center",
              padding: t.spaceMd,
            }}
          >
            No linked documents match the search
          </div>
        )}

        {/* Available documents section */}
        <div>
          <div
            style={{
              fontSize: t.fontSizeXs,
              fontWeight: 700,
              letterSpacing: t.letterSpacingWide,
              textTransform: "uppercase",
              color: t.colorTextSecondary,
              marginBottom: t.spaceSm,
            }}
          >
            Available documents
          </div>
          {availableDocs.length > 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: t.spaceSm,
              }}
            >
              {availableDocs.map((doc) => {
                const staged = stagedTypes[doc.id] ?? [preselectedType];
                return (
                  <AvailableDocRow
                    key={doc.id}
                    doc={doc}
                    stagedTypes={staged}
                    hideTypeSelection={hideTypeSelection}
                    onUpdateType={(i, rt) => updateStagedType(doc.id, i, rt)}
                    onAddSlot={() => addStagedTypeSlot(doc.id)}
                    onLink={() => linkDocument(doc.id)}
                  />
                );
              })}
            </div>
          ) : (
            <div
              style={{
                fontSize: t.fontSizeSm,
                color: t.colorTextSecondary,
                textAlign: "center",
                padding: t.spaceMd,
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
                marginTop: t.spaceMd,
              }}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLoadMore}
                disabled={loading}
              >
                {loading ? <ButtonSpinner /> : "Load More"}
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
  hideTypeSelection = false,
  onAddType,
  onRemoveType,
  onUnlink,
}: {
  doc: DocumentSummary;
  types: Array<{ type: ReferenceType }>;
  hideTypeSelection?: boolean;
  onAddType: (t: ReferenceType) => void;
  onRemoveType: (t: ReferenceType) => void;
  onUnlink: () => void;
}) {
  const [showAddType, setShowAddType] = useState(false);
  const [newType, setNewType] = useState<ReferenceType>("reference");

  const usedTypes = new Set(types.map((rt) => rt.type));
  const availableTypes = REFERENCE_TYPES.filter((rt) => !usedTypes.has(rt));

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: t.spaceXs,
        padding: `${t.spaceSm} ${t.spaceMd}`,
        background: t.colorSurfacePanel,
        borderRadius: t.radiusLg,
        border: `1px solid color-mix(in srgb, ${t.colorBorder} 50%, transparent)`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: t.spaceSm }}>
        {doc.favorite && (
          <Icon name="star" size={14} style={{ color: t.colorWarning, flexShrink: 0 }} />
        )}
        <span
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: t.fontSizeSm,
            fontWeight: 600,
            color: t.colorText,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {doc.title}
        </span>
        <Button
          variant="destructive"
          size="sm"
          onClick={onUnlink}
          style={{ flexShrink: 0 }}
        >
          Unlink
        </Button>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
        {types.map((rt) => (
          <TagChip
            key={rt.type}
            name={TYPE_LABELS[rt.type]}
            onRemove={hideTypeSelection ? undefined : () => onRemoveType(rt.type)}
          />
        ))}
        {!hideTypeSelection && availableTypes.length > 0 && !showAddType && (
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
        {!hideTypeSelection && showAddType && (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Select
              value={newType}
              options={availableTypes.map((rt) => ({ value: rt, label: TYPE_LABELS[rt] }))}
              onChange={(e) => setNewType(e.currentTarget.value as ReferenceType)}
              style={{ fontSize: t.fontSizeXs, padding: "2px 4px", minWidth: 90 }}
            />
            <IconButton
              icon="check"
              size={14}
              onClick={() => {
                onAddType(newType);
                setShowAddType(false);
              }}
              aria-label="Confirm type"
              style={{ width: 22, height: 22, minWidth: 22, color: t.colorSuccess }}
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
  hideTypeSelection = false,
  onUpdateType,
  onAddSlot,
  onLink,
}: {
  doc: DocumentSummary;
  stagedTypes: ReferenceType[];
  hideTypeSelection?: boolean;
  onUpdateType: (index: number, type: ReferenceType) => void;
  onAddSlot: () => void;
  onLink: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: t.spaceXs,
        padding: `${t.spaceSm} ${t.spaceMd}`,
        background: t.colorSurfacePanel,
        borderRadius: t.radiusLg,
        border: `1px solid color-mix(in srgb, ${t.colorBorder} 50%, transparent)`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: t.spaceSm }}>
        {doc.favorite && (
          <Icon name="star" size={14} style={{ color: t.colorWarning, flexShrink: 0 }} />
        )}
        <span
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: t.fontSizeSm,
            fontWeight: 500,
            color: t.colorText,
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
      {!hideTypeSelection && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
          {stagedTypes.map((st, i) => (
            <Select
              key={i}
              value={st}
              options={TYPE_OPTIONS}
              onChange={(e) => onUpdateType(i, e.currentTarget.value as ReferenceType)}
              style={{ fontSize: t.fontSizeXs, padding: "2px 4px", minWidth: 90 }}
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
      )}
    </div>
  );
}
