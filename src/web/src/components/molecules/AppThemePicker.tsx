/**
 * App-scoped theme picker that only shows the 4 custom dark themes.
 *
 * The library's ThemePicker iterates ALL registered themes (9 built-ins +
 * custom). Since the app is dark-mode-only and the built-in themes include
 * light backgrounds (warm-sand, coral, etc.), we replace the library picker
 * with this filtered version.
 *
 * Supports two variants:
 * - `grid` — card grid for the ThemesPage
 * - `compact` — dropdown for the TopBar
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { semantic as t, useInjectStyles } from "@4lt7ab/ui/core";
import { Icon } from "@4lt7ab/ui/ui";
import { useTheme } from "../theme/ThemeContext";
import { appThemes } from "../theme/lib-themes";

export interface AppThemePickerProps {
  /** Optional descriptions for each theme, keyed by theme name. */
  descriptions?: Record<string, string>;
  /** Display variant. `'grid'` (default) renders a card grid; `'compact'` renders a dropdown. */
  variant?: "grid" | "compact";
}

// ---------------------------------------------------------------------------
// Grid variant
// ---------------------------------------------------------------------------

const GRID_STYLES_ID = "tfp-app-theme-picker";

const gridCSS = /* css */ `
  .tfp-theme-picker {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1.5rem;
  }

  .tfp-theme-card {
    appearance: none;
    -webkit-appearance: none;
    background: var(--color-surface, #12252a);
    border: 2px solid var(--color-border, #1e383f);
    border-radius: 8px;
    padding: 1.5rem;
    text-align: left;
    cursor: pointer;
    transition: border-color 0.15s ease, transform 0.15s ease;
    font-family: inherit;
    color: var(--color-text, #d4e5ea);
  }

  .tfp-theme-card:hover {
    border-color: var(--color-text-link);
    transform: translateY(-2px);
  }

  .tfp-theme-card--active {
    border-color: var(--color-text-link);
  }

  .tfp-theme-card__name {
    display: block;
    font-family: var(--font-serif);
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: 0.25rem;
  }

  .tfp-theme-card__desc {
    display: block;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
  }
`;

function GridView({ descriptions }: { descriptions: Record<string, string> }) {
  useInjectStyles(GRID_STYLES_ID, gridCSS);
  const { themeName, setTheme } = useTheme();

  return (
    <div className="tfp-theme-picker">
      {appThemes.map((def) => {
        const isActive = themeName === def.name;
        return (
          <button
            key={def.name}
            className={`tfp-theme-card${isActive ? " tfp-theme-card--active" : ""}`}
            onClick={() => setTheme(def.name)}
          >
            <span className="tfp-theme-card__name">{def.label}</span>
            {descriptions[def.name] && (
              <span className="tfp-theme-card__desc">
                {descriptions[def.name]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compact variant
// ---------------------------------------------------------------------------

const COMPACT_STYLES_ID = "tfp-app-theme-picker-compact";

const compactCSS = /* css */ `
  .tfp-tp-trigger {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.625rem;
    font-size: 0.75rem;
    font-family: var(--font-mono);
    color: var(--color-text-secondary);
    background: var(--color-surface-raised);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: border-color 0.15s ease;
  }

  .tfp-tp-trigger:hover {
    border-color: var(--color-text-link);
  }

  .tfp-tp-menu-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    text-align: left;
    padding: 0.375rem 0.5rem;
    font-size: 0.8rem;
    font-family: var(--font-sans);
    font-weight: 400;
    color: var(--color-text-secondary);
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: background 0.1s ease, color 0.1s ease;
  }

  .tfp-tp-menu-item:hover,
  .tfp-tp-menu-item--focused {
    background: var(--color-surface-raised);
    color: var(--color-text);
  }

  .tfp-tp-menu-item--active {
    font-weight: 600;
    color: var(--color-text);
    background: var(--color-surface-raised);
  }
`;

function CompactView() {
  useInjectStyles(COMPACT_STYLES_ID, compactCSS);
  const { themeName, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }

      if (!open) {
        if (
          e.key === "ArrowDown" ||
          e.key === "Enter" ||
          e.key === " "
        ) {
          e.preventDefault();
          setOpen(true);
          setFocusedIndex(0);
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setFocusedIndex((i) => (i + 1) % appThemes.length);
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedIndex(
            (i) => (i - 1 + appThemes.length) % appThemes.length,
          );
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < appThemes.length) {
            setTheme(appThemes[focusedIndex].name);
            setOpen(false);
            triggerRef.current?.focus();
          }
          break;
        case "Home":
          e.preventDefault();
          setFocusedIndex(0);
          break;
        case "End":
          e.preventDefault();
          setFocusedIndex(appThemes.length - 1);
          break;
      }
    },
    [open, focusedIndex, setTheme],
  );

  // Scroll focused item into view
  useEffect(() => {
    if (!open || focusedIndex < 0) return;
    const menu = menuRef.current;
    if (!menu) return;
    const items = menu.querySelectorAll('[role="option"]');
    items[focusedIndex]?.scrollIntoView({ block: "nearest" });
  }, [open, focusedIndex]);

  // Reset focus index when opening
  useEffect(() => {
    if (open) {
      const activeIdx = appThemes.findIndex((t) => t.name === themeName);
      setFocusedIndex(activeIdx >= 0 ? activeIdx : 0);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentTheme = appThemes.find((t) => t.name === themeName);

  return (
    <div
      ref={containerRef}
      style={{ position: "relative" }}
      onKeyDown={handleKeyDown}
    >
      <button
        ref={triggerRef}
        className="tfp-tp-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: t.colorActionPrimary,
            flexShrink: 0,
          }}
        />
        {currentTheme?.label ?? themeName}
        <Icon name={open ? "chevron-up" : "chevron-down"} size={12} />
      </button>

      {open && (
        <div
          ref={menuRef}
          role="listbox"
          aria-activedescendant={
            focusedIndex >= 0
              ? `tfp-tp-item-${appThemes[focusedIndex]?.name}`
              : undefined
          }
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: t.spaceXs,
            background: t.colorSurfacePanel,
            border: `1px solid ${t.colorBorder}`,
            borderRadius: t.radiusMd,
            padding: t.spaceXs,
            minWidth: "10rem",
            zIndex: 100,
            boxShadow: t.shadowMd,
          }}
        >
          {appThemes.map((t, idx) => {
            const isActive = themeName === t.name;
            const isFocused = focusedIndex === idx;
            const classes = [
              "tfp-tp-menu-item",
              isActive ? "tfp-tp-menu-item--active" : "",
              isFocused && !isActive ? "tfp-tp-menu-item--focused" : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <button
                key={t.name}
                id={`tfp-tp-item-${t.name}`}
                role="option"
                aria-selected={isActive}
                className={classes}
                onClick={() => {
                  setTheme(t.name);
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
                onMouseEnter={() => setFocusedIndex(idx)}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: isActive
                      ? t.colorActionPrimary
                      : t.colorTextMuted,
                    flexShrink: 0,
                  }}
                />
                {t.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function AppThemePicker({
  descriptions = {},
  variant = "grid",
}: AppThemePickerProps) {
  if (variant === "compact") {
    return (
      <div style={{ display: "inline-block" }}>
        <CompactView />
      </div>
    );
  }

  return <GridView descriptions={descriptions} />;
}
