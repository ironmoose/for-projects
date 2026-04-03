import { useEffect, useState, useCallback } from "react";
import { useTheme } from "../theme/ThemeContext";
import { sg } from "../theme/synthGlow";
import { useDocument } from "../../hooks/useDocument";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { Overlay } from "../atoms/Overlay";
import { Button } from "../atoms/Button";
import { Input } from "../atoms/Input";
import { Textarea } from "../atoms/Textarea";
import { IconButton } from "../atoms/IconButton";
import { TagChip } from "../molecules/TagChip";
import { EmptyState } from "../molecules/EmptyState";
import { Markdown } from "../molecules/Markdown";
import { TAG_CATEGORIES } from "../../types";
import type { TagName } from "../../types";

interface DocumentReaderModalProps {
  documentId: string;
  onClose: () => void;
}

export function DocumentReaderModal({ documentId, onClose }: DocumentReaderModalProps) {
  const { theme, themeName } = useTheme();
  const isSynth = themeName === "synth";
  const { document, notFound, loading, updateDocument } = useDocument(documentId);
  const reduced = useReducedMotion();

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const enterEditMode = useCallback(() => {
    if (!document) return;
    setEditTitle(document.title);
    setEditContent(document.content ?? "");
    setEditTags([...document.tags]);
    setEditing(true);
  }, [document]);

  const cancelEdit = useCallback(() => {
    setEditing(false);
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    const contentValue = editTitle.trim() ? editContent.trim() || null : null;
    const ok = await updateDocument({
      title: editTitle.trim(),
      content: contentValue,
      tags: editTags,
    });
    setSaving(false);
    if (ok) setEditing(false);
  }, [editTitle, editContent, editTags, updateDocument]);

  const toggleTag = useCallback((tag: string) => {
    setEditTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }, []);

  const saveDisabled = !editTitle.trim() || saving;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editing) {
          cancelEdit();
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, editing, cancelEdit]);

  return (
    <>
      <Overlay onClick={onClose} zIndex={200} style={{ background: "rgba(0,0,0,0.5)" }} />
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 201,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            pointerEvents: "auto",
            width: "100%",
            maxWidth: 1000,
            minHeight: "50vh",
            maxHeight: "75vh",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            background: theme.color.surface,
            borderRadius: theme.radius.lg,
            boxShadow: isSynth
              ? `0 0 30px ${sg(19)}, 0 0 60px ${sg(9)}, 0 8px 40px rgba(0,0,0,0.5)`
              : theme.shadow.lg,
            border: `1px solid ${isSynth ? sg(27) : theme.color.borderSubtle}`,
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
                    <IconButton icon="edit" size={18} onClick={enterEditMode} aria-label="Edit document" />
                  )}
                  <IconButton icon="close" size={18} onClick={editing ? cancelEdit : onClose} aria-label={editing ? "Cancel editing" : "Close reader"} />
                </div>
              </div>

              {/* Tags section */}
              {editing ? (
                <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.sm }}>
                  {Object.entries(TAG_CATEGORIES).map(([category, tags]) => (
                    <div key={category}>
                      <div
                        style={{
                          fontSize: theme.font.size.xs,
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase" as const,
                          color: theme.color.textFaint,
                          marginBottom: theme.spacing.xs,
                        }}
                      >
                        {category}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: theme.spacing.xs }}>
                        {tags.map((tag: TagName) => {
                          const selected = editTags.includes(tag);
                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => toggleTag(tag)}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                fontSize: theme.font.size.xs,
                                color: selected
                                  ? (isSynth ? "var(--synth-glow)" : theme.color.primary)
                                  : theme.color.textMuted,
                                background: selected
                                  ? theme.color.surfaceContainerHigh
                                  : "transparent",
                                borderRadius: theme.radius.full,
                                padding: "2px 8px",
                                border: `1px solid ${selected
                                  ? (isSynth ? sg(27) : theme.color.primary)
                                  : theme.color.borderSubtle}`,
                                cursor: "pointer",
                                fontFamily: theme.font.body,
                                transition: "all 0.15s",
                                ...(selected && isSynth ? { boxShadow: `0 0 6px ${sg(14)}` } : {}),
                              }}
                            >
                              {tag}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                document.tags.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: theme.spacing.xs }}>
                    {document.tags.map((tag) => (
                      <TagChip key={tag} name={tag} />
                    ))}
                  </div>
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
        </div>
      </div>
    </>
  );
}
