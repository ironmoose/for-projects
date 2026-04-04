import { useMemo } from "react";
import { useTheme } from "../theme/ThemeContext";
import { IconButton } from "../atoms/IconButton";
import { useRegisteredShortcuts } from "../../hooks/useKeyboardShortcuts";
import { ModalShell } from "./ModalShell";

interface ShortcutHelpOverlayProps {
  onClose: () => void;
}

export function ShortcutHelpOverlay({ onClose }: ShortcutHelpOverlayProps) {
  const { theme } = useTheme();
  const shortcuts = useRegisteredShortcuts();

  // Group shortcuts by scope
  const grouped = useMemo(() => {
    const map = new Map<string, { keys: string; description: string }[]>();
    const order: string[] = [];
    for (const s of shortcuts) {
      if (!map.has(s.scope)) {
        map.set(s.scope, []);
        order.push(s.scope);
      }
      map.get(s.scope)!.push({ keys: s.keys, description: s.description });
    }
    return order.map((scope) => ({ scope, entries: map.get(scope)! }));
  }, [shortcuts]);

  const kbdStyle: React.CSSProperties = {
    display: "inline-block",
    padding: `2px ${theme.spacing.xs}`,
    fontSize: theme.font.size.xs,
    fontFamily: theme.font.mono,
    fontWeight: 600,
    color: theme.color.text,
    background: theme.color.surfaceContainerHigh,
    border: `1px solid ${theme.color.border}`,
    borderRadius: theme.radius.sm,
    minWidth: 22,
    textAlign: "center" as const,
    lineHeight: 1.4,
  };

  return (
    <ModalShell
      onClose={onClose}
      maxWidth={520}
      maxHeight="80vh"
      zIndex={300}
      suppressShortcuts={false}
      style={{ gap: 0 }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: theme.spacing.lg,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontFamily: theme.font.headline,
            fontSize: theme.font.size.lg,
            fontWeight: 700,
            color: theme.color.text,
          }}
        >
          Keyboard Shortcuts
        </h2>
        <IconButton icon="close" size={18} onClick={onClose} aria-label="Close shortcuts help" />
      </div>

      {/* Scrollable body */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          scrollbarWidth: "none" as const,
        }}
      >
        {grouped.map(({ scope, entries }) => (
          <div key={scope} style={{ marginBottom: theme.spacing.lg }}>
            <h3
              style={{
                margin: 0,
                marginBottom: theme.spacing.sm,
                fontSize: theme.font.size.xs,
                fontWeight: 700,
                textTransform: "uppercase" as const,
                letterSpacing: "0.08em",
                color: theme.color.textMuted,
              }}
            >
              {scope}
            </h3>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: theme.spacing.xs,
              }}
            >
              {entries.map(({ keys, description }) => (
                <div
                  key={keys}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                    borderRadius: theme.radius.sm,
                  }}
                >
                  <span
                    style={{
                      fontSize: theme.font.size.sm,
                      color: theme.color.text,
                    }}
                  >
                    {description}
                  </span>
                  <span style={{ display: "flex", gap: 4, flexShrink: 0, marginLeft: theme.spacing.md }}>
                    {renderKeys(keys, kbdStyle)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ModalShell>
  );
}

/** Render shortcut keys as styled <kbd> elements. */
function renderKeys(keys: string, style: React.CSSProperties): React.ReactNode {
  // Two-key sequence like "g h" -> show as "g" then "h"
  const parts = keys.split(" ");
  if (parts.length > 1) {
    return parts.map((part, i) => (
      <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {i > 0 && (
          <span style={{ fontSize: 10, color: "inherit", opacity: 0.5 }}>then</span>
        )}
        <kbd style={style}>{formatKeyLabel(part)}</kbd>
      </span>
    ));
  }
  return <kbd style={style}>{formatKeyLabel(keys)}</kbd>;
}

function formatKeyLabel(key: string): string {
  if (key === "?") return "?";
  if (key === "/") return "/";
  if (key === "Escape") return "Esc";
  return key.toUpperCase();
}
