import { useEffect } from "react";
import { useTheme } from "../theme/ThemeContext";
import { sg } from "../theme/synthGlow";
import { useDocument } from "../../hooks/useDocument";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { useShortcutSuppression } from "../../hooks/useKeyboardShortcuts";
import { Overlay } from "../atoms/Overlay";
import { IconButton } from "../atoms/IconButton";
import { TagChip } from "../molecules/TagChip";
import { EmptyState } from "../molecules/EmptyState";
import { Markdown } from "../molecules/Markdown";

interface DocumentReaderModalProps {
  documentId: string;
  onClose: () => void;
}

export function DocumentReaderModal({ documentId, onClose }: DocumentReaderModalProps) {
  const { theme, themeName } = useTheme();
  const isSynth = themeName === "synth";
  const { document, notFound, loading } = useDocument(documentId);
  const reduced = useReducedMotion();

  // Suppress keyboard shortcuts while modal is open
  useShortcutSuppression();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

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
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
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
                <IconButton icon="close" size={18} onClick={onClose} aria-label="Close reader" />
              </div>
              {document.tags.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: theme.spacing.xs }}>
                  {document.tags.map((tag) => (
                    <TagChip key={tag} name={tag} />
                  ))}
                </div>
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
              {document.content ? (
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
          </>
        )}
        </div>
      </div>
    </>
  );
}
