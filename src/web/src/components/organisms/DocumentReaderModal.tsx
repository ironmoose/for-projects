import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { semantic as t, useInjectStyles } from "@4lt7ab/ui/core";

const SPIN_CSS = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
const FADE_IN_UP_CSS = `@keyframes fade-in-up { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`;
import { useToastContext } from "../ToastContext";
import { useDocument } from "../../hooks/useDocument";
import { useDocuments } from "../../hooks/useDocuments";
import { refreshDocument as apiRefreshDocument } from "../../api";
import { relativeTime } from "../../utils";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { Button, Input, Textarea, Icon, IconButton, TagChip, EmptyState, Field, Select } from "@4lt7ab/ui/ui";
import { TagPicker } from "../molecules/TagPicker";
import { Prose } from "@4lt7ab/ui/content";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ModalShell } from "@4lt7ab/ui/ui";
import { useShortcutSuppression } from "../../hooks/useKeyboardShortcuts";
import type { TagName } from "../../types";

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

interface DocumentReaderModalProps {
  documentId: string;
  onClose: () => void;
}

export function DocumentReaderModal({ documentId, onClose }: DocumentReaderModalProps) {
  useInjectStyles("tfp-fade-in-up", FADE_IN_UP_CSS);
  useShortcutSuppression(true);
  const toast = useToastContext();
  const { document, notFound, loading, updateDocument } = useDocument(documentId);
  const { documents: allDocs } = useDocuments();
  const reduced = useReducedMotion();

  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editFolder, setEditFolder] = useState("");
  const [editTags, setEditTags] = useState<TagName[]>([]);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!document) return;
    const text = document.content
      ? document.content
      : document.title + "\n\n" + (document.summary ?? "");
    try {
      await navigator.clipboard.writeText(text);
      toast.showToast("Copied to clipboard", "success");
      setCopied(true);
      clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.showToast("Failed to copy", "error");
    }
  }, [document, toast]);

  const handleRefresh = useCallback(async () => {
    if (!document || !document.source_type) return;
    setRefreshing(true);
    try {
      await apiRefreshDocument(document.id);
      toast.showToast("Document refreshed", "success");
    } catch (err) {
      toast.showToast(err instanceof Error ? err.message : "Failed to refresh", "error");
    } finally {
      setRefreshing(false);
    }
  }, [document, toast]);

  useEffect(() => {
    return () => clearTimeout(copiedTimerRef.current);
  }, []);

  const knownFolders = useMemo(() => {
    const set = new Set<string>();
    for (const d of allDocs) {
      if (d.folder) set.add(d.folder);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [allDocs]);

  const enterEditMode = useCallback(() => {
    if (!document) return;
    setEditTitle(document.title);
    setEditSummary(document.summary ?? "");
    setEditContent(document.content ?? "");
    setEditFolder(document.folder ?? "");
    setEditTags([...document.tags] as TagName[]);
    setEditing(true);
  }, [document]);

  const cancelEdit = useCallback(() => {
    setEditing(false);
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    const contentValue = editTitle.trim() ? editContent.trim() || null : null;
    const summaryValue = editSummary.trim() || null;
    const ok = await updateDocument({
      title: editTitle.trim(),
      summary: summaryValue,
      content: contentValue,
      folder: editFolder.trim() || null,
      tags: editTags,
    });
    setSaving(false);
    if (ok) setEditing(false);
  }, [editTitle, editSummary, editContent, editFolder, editTags, updateDocument]);

  const saveDisabled = !editTitle.trim() || saving;

  // Custom escape: cancel edit if editing, otherwise close
  const handleEscape = useCallback(() => {
    if (editing) {
      cancelEdit();
    } else {
      onClose();
    }
  }, [editing, cancelEdit, onClose]);

  // Override ModalShell's escape with our custom handler via a separate listener
  // ModalShell will call onClose on escape, but we pass handleEscape as onClose
  // This works because ModalShell's escape handler calls onClose

  return (
    <ModalShell
      onClose={handleEscape}
      maxWidth={1000}
      titleId="doc-reader-title"
      style={{
        maxHeight: "75vh",
        gap: 0,
        padding: 0,
        minHeight: "50vh",
        overflow: "hidden",
        background: t.colorSurface,
        animation: reduced ? undefined : `fade-in-up 200ms ease-out`,
      }}
    >
      {loading ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <p
            style={{
              margin: 0,
              color: t.colorTextMuted,
              fontSize: t.fontSizeSm,
            }}
          >
            Loading...
          </p>
        </div>
      ) : notFound || !document ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <EmptyState icon="error_outline" message="Document not found" />
        </div>
      ) : (
        <>
          {/* Header */}
          <div
            style={{
              flexShrink: 0,
              padding: `${t.spaceXl} ${t.space2xl} ${t.spaceLg}`,
              borderBottom: `1px solid color-mix(in srgb, ${t.colorBorder} 50%, transparent)`,
              display: "flex",
              flexDirection: "column",
              gap: t.spaceSm,
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: t.spaceSm }}>
              {editing ? (
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Document title"
                    style={{ fontSize: t.fontSizeLg, fontWeight: 700 }}
                    aria-label="Document title"
                  />
                </div>
              ) : (
                <h2
                  id="doc-reader-title"
                  style={{
                    margin: 0,
                    flex: 1,
                    minWidth: 0,
                    fontFamily: t.fontSerif,
                    fontSize: t.fontSizeXl,
                    fontWeight: 800,
                    letterSpacing: t.letterSpacingTight,
                    color: t.colorText,
                    lineHeight: 1.3,
                  }}
                >
                  {document.title}
                </h2>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: t.spaceXs, flexShrink: 0 }}>
                {!editing && (
                  <>
                    <IconButton
                      icon={document.favorite ? "star" : "star_border"}
                      size={18}
                      onClick={() => updateDocument({ favorite: !document.favorite })}
                      aria-label={document.favorite ? "Remove from favorites" : "Add to favorites"}
                      style={{ color: document.favorite ? t.colorWarning : t.colorTextMuted }}
                    />
                    <IconButton
                      icon={copied ? "check" : "content_copy"}
                      size={18}
                      onClick={handleCopy}
                      aria-label="Copy markdown to clipboard"
                      style={{ color: copied ? t.colorSuccess : t.colorTextMuted }}
                    />
                    <IconButton icon="edit" size={18} onClick={enterEditMode} aria-label="Edit document" />
                  </>
                )}
                <IconButton icon="close" size={18} onClick={editing ? cancelEdit : onClose} aria-label={editing ? "Cancel editing" : "Close reader"} />
              </div>
            </div>

            {/* Tags section */}
            {editing ? (
              <TagPicker
                selected={editTags}
                onChange={setEditTags}
              />
            ) : (
              document.tags.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: t.spaceXs }}>
                  {document.tags.map((tag) => (
                    <TagChip key={tag} name={tag} />
                  ))}
                </div>
              )
            )}

            {/* Referenced by section */}
            {!editing && document.referenced_by && document.referenced_by.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: t.spaceXs, alignItems: "center" }}>
                <span
                  style={{
                    fontSize: t.fontSizeXs,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: t.colorTextSecondary,
                    marginRight: t.spaceXs,
                  }}
                >
                  Referenced by
                </span>
                {document.referenced_by.map((ref) => (
                  <span
                    key={`${ref.entity_type}-${ref.entity_id}-${ref.type}`}
                    style={{
                      display: "inline-block",
                      padding: "1px 6px",
                      borderRadius: t.radiusSm,
                      fontSize: t.fontSizeXs,
                      background: t.colorSurfaceRaised,
                      color: t.colorTextMuted,
                    }}
                  >
                    {ref.entity_type}: {ref.entity_title || ref.entity_id} ({ref.type})
                  </span>
                ))}
              </div>
            )}

            {/* Folder section */}
            {editing ? (
              <Field label="Folder" htmlFor="edit-folder">
                <Select
                  id="edit-folder"
                  value={editFolder}
                  onChange={(e) => setEditFolder(e.target.value)}
                  options={[{ value: "", label: "No folder" }, ...knownFolders.map((f) => ({ value: f, label: f }))]}
                />
              </Field>
            ) : (
              document.folder && (
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: t.fontSizeXs, color: t.colorTextMuted }}>
                  <Icon name="folder" size={14} />
                  {document.folder}
                </div>
              )
            )}

            {/* Source info — read mode only */}
            {!editing && document.source_type && document.source_url && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: t.spaceSm,
                  fontSize: t.fontSizeXs,
                  color: t.colorTextMuted,
                  flexWrap: "wrap",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Icon name="link" size={14} />
                  <a
                    href={document.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: t.colorActionPrimary, textDecoration: "none" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {document.source_url.length > 60
                      ? document.source_url.slice(0, 60) + "..."
                      : document.source_url}
                  </a>
                </span>
                {document.source_fetched_at && (
                  <span style={{ color: t.colorTextSecondary, fontSize: t.fontSizeXs }}>
                    Fetched {relativeTime(document.source_fetched_at)}
                  </span>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleRefresh}
                  disabled={refreshing}
                >
                  {refreshing ? <ButtonSpinner /> : "Refresh"}
                </Button>
              </div>
            )}

            {/* Summary section */}
            {editing ? (
              <Input
                value={editSummary}
                onChange={(e) => setEditSummary(e.target.value)}
                placeholder="Brief summary"
                style={{ fontSize: t.fontSizeSm }}
                aria-label="Document summary"
              />
            ) : (
              document.summary && (
                <p
                  style={{
                    margin: 0,
                    fontSize: t.fontSizeSm,
                    color: t.colorTextMuted,
                    fontStyle: "italic",
                  }}
                >
                  {document.summary}
                </p>
              )
            )}
          </div>

          {/* Body */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: `${t.spaceXl} ${t.space2xl}`,
            }}
          >
            {editing ? (
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="Document content (markdown supported)"
                rows={16}
                style={{ width: "100%", minHeight: 300, fontFamily: t.fontMono }}
                aria-label="Document content"
              />
            ) : document.content ? (
              <Prose><ReactMarkdown remarkPlugins={[remarkGfm]}>{document.content}</ReactMarkdown></Prose>
            ) : (
              <p
                style={{
                  margin: 0,
                  fontSize: t.fontSizeSm,
                  color: t.colorTextSecondary,
                  fontStyle: "italic",
                }}
              >
                No content
              </p>
            )}
          </div>

          {/* Edit mode footer */}
          {editing && (
            <div
              style={{
                flexShrink: 0,
                padding: `${t.spaceMd} ${t.space2xl}`,
                borderTop: `1px solid color-mix(in srgb, ${t.colorBorder} 50%, transparent)`,
                display: "flex",
                justifyContent: "flex-end",
                gap: t.spaceSm,
              }}
            >
              <Button variant="ghost" onClick={cancelEdit} disabled={saving}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={saving || saveDisabled}
              >
                {saving ? <ButtonSpinner /> : "Save"}
              </Button>
            </div>
          )}
        </>
      )}
    </ModalShell>
  );
}
