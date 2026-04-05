import { useEffect, useState, useCallback } from "react";
import { useTheme } from "../theme/ThemeContext";
import { useDocument } from "../../hooks/useDocument";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { Button } from "../atoms/Button";
import { Input } from "../atoms/Input";
import { Textarea } from "../atoms/Textarea";
import { IconButton } from "../atoms/IconButton";
import { TagChip } from "../molecules/TagChip";
import { TagPicker } from "../molecules/TagPicker";
import { EmptyState } from "../molecules/EmptyState";
import { Markdown } from "../molecules/Markdown";
import { ModalShell } from "./ModalShell";
import type { TagName } from "../../types";

interface DocumentReaderModalProps {
  documentId: string;
  onClose: () => void;
}

export function DocumentReaderModal({ documentId, onClose }: DocumentReaderModalProps) {
  const { theme } = useTheme();
  const { document, notFound, loading, updateDocument } = useDocument(documentId);
  const reduced = useReducedMotion();

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editTags, setEditTags] = useState<TagName[]>([]);
  const [saving, setSaving] = useState(false);

  const enterEditMode = useCallback(() => {
    if (!document) return;
    setEditTitle(document.title);
    setEditSummary(document.summary ?? "");
    setEditContent(document.content ?? "");
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
      tags: editTags,
    });
    setSaving(false);
    if (ok) setEditing(false);
  }, [editTitle, editSummary, editContent, editTags, updateDocument]);

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
      maxHeight="75vh"
      style={{
        gap: 0,
        padding: 0,
        minHeight: "50vh",
        overflow: "hidden",
        background: theme.color.surface,
        animation: reduced ? undefined : `fade-in-up 200ms ${theme.animation.easing.decelerate}`,
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
              color: theme.color.textMuted,
              fontSize: theme.font.size.sm,
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
              padding: `${theme.spacing.xl} ${theme.spacing["3xl"]} ${theme.spacing.lg}`,
              borderBottom: `1px solid ${theme.color.borderSubtle}`,
              display: "flex",
              flexDirection: "column",
              gap: theme.spacing.sm,
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: theme.spacing.sm }}>
              {editing ? (
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Document title"
                    style={{ fontSize: theme.font.size.lg, fontWeight: 700 }}
                    aria-label="Document title"
                  />
                </div>
              ) : (
                <h2
                  style={{
                    margin: 0,
                    flex: 1,
                    minWidth: 0,
                    fontFamily: theme.font.headline,
                    fontSize: theme.font.size.xl,
                    fontWeight: 800,
                    letterSpacing: theme.font.letterSpacing.tight,
                    color: theme.color.text,
                    lineHeight: 1.3,
                  }}
                >
                  {document.title}
                </h2>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: theme.spacing.xs, flexShrink: 0 }}>
                {!editing && (
                  <>
                    <IconButton
                      icon={document.favorite ? "star" : "star_border"}
                      size={18}
                      onClick={() => updateDocument({ favorite: !document.favorite })}
                      aria-label={document.favorite ? "Remove from favorites" : "Add to favorites"}
                      style={{ color: document.favorite ? theme.color.warning : theme.color.textMuted }}
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
                <div style={{ display: "flex", flexWrap: "wrap", gap: theme.spacing.xs }}>
                  {document.tags.map((tag) => (
                    <TagChip key={tag} name={tag} />
                  ))}
                </div>
              )
            )}

            {/* Referenced by section */}
            {!editing && document.referenced_by && document.referenced_by.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: theme.spacing.xs, alignItems: "center" }}>
                <span
                  style={{
                    fontSize: theme.font.size.xxs,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: theme.color.textFaint,
                    marginRight: theme.spacing.xs,
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
                      borderRadius: theme.radius.sm,
                      fontSize: theme.font.size.xxs,
                      background: theme.color.surfaceContainerHigh,
                      color: theme.color.textMuted,
                    }}
                  >
                    {ref.entity_type}: {ref.entity_title || ref.entity_id} ({ref.type})
                  </span>
                ))}
              </div>
            )}

            {/* Summary section */}
            {editing ? (
              <Input
                value={editSummary}
                onChange={(e) => setEditSummary(e.target.value)}
                placeholder="Brief summary"
                style={{ fontSize: theme.font.size.sm }}
                aria-label="Document summary"
              />
            ) : (
              document.summary && (
                <p
                  style={{
                    margin: 0,
                    fontSize: theme.font.size.sm,
                    color: theme.color.textMuted,
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
              padding: `${theme.spacing.xl} ${theme.spacing["3xl"]}`,
            }}
          >
            {editing ? (
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="Document content (markdown supported)"
                rows={16}
                style={{ width: "100%", minHeight: 300, fontFamily: theme.font.mono }}
                aria-label="Document content"
              />
            ) : document.content ? (
              <Markdown>{document.content}</Markdown>
            ) : (
              <p
                style={{
                  margin: 0,
                  fontSize: theme.font.size.sm,
                  color: theme.color.textFaint,
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
                padding: `${theme.spacing.md} ${theme.spacing["3xl"]}`,
                borderTop: `1px solid ${theme.color.borderSubtle}`,
                display: "flex",
                justifyContent: "flex-end",
                gap: theme.spacing.sm,
              }}
            >
              <Button variant="ghost" onClick={cancelEdit} disabled={saving}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                loading={saving}
                disabled={saveDisabled}
              >
                Save
              </Button>
            </div>
          )}
        </>
      )}
    </ModalShell>
  );
}
