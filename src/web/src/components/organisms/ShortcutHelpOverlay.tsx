import { useMemo } from "react";
import { semantic as t } from "@4lt7ab/ui/core";
import { ModalShell } from "@4lt7ab/ui/ui";
import { IconButton } from "../atoms/IconButton";
import { useRegisteredShortcuts } from "../../hooks/useKeyboardShortcuts";

interface ShortcutHelpOverlayProps {
  onClose: () => void;
}

export function ShortcutHelpOverlay({ onClose }: ShortcutHelpOverlayProps) {
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
    padding: `2px ${t.spaceXs}`,
    fontSize: t.fontSizeXs,
    fontFamily: t.fontMono,
    fontWeight: 600,
    color: t.colorText,
    background: t.colorSurfaceRaised,
    border: `1px solid ${t.colorBorder}`,
    borderRadius: t.radiusSm,
    minWidth: 22,
    textAlign: "center" as const,
    lineHeight: 1.4,
  };

  return (
    <ModalShell
      onClose={onClose}
      maxWidth={520}
      zIndex={300}
      titleId="shortcut-help-title"
      style={{ maxHeight: "80vh", gap: 0 }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: t.spaceLg,
        }}
      >
        <h2
          id="shortcut-help-title"
          style={{
            margin: 0,
            fontFamily: t.fontSerif,
            fontSize: t.fontSizeLg,
            fontWeight: 700,
            color: t.colorText,
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
          <div key={scope} style={{ marginBottom: t.spaceLg }}>
            <h3
              style={{
                margin: 0,
                marginBottom: t.spaceSm,
                fontSize: t.fontSizeXs,
                fontWeight: 700,
                textTransform: "uppercase" as const,
                letterSpacing: "0.08em",
                color: t.colorTextMuted,
              }}
            >
              {scope}
            </h3>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: t.spaceXs,
              }}
            >
              {entries.map(({ keys, description }) => (
                <div
                  key={keys}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: `${t.spaceXs} ${t.spaceSm}`,
                    borderRadius: t.radiusSm,
                  }}
                >
                  <span
                    style={{
                      fontSize: t.fontSizeSm,
                      color: t.colorText,
                    }}
                  >
                    {description}
                  </span>
                  <span style={{ display: "flex", gap: 4, flexShrink: 0, marginLeft: t.spaceMd }}>
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
