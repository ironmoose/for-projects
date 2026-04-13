/**
 * App-scoped theme picker that shows all library built-in themes.
 *
 * Supports two variants:
 * - `grid` — card grid for the ThemesPage
 * - `compact` — dropdown for the TopBar
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { semantic as t, useInjectStyles, useTheme as useLibTheme } from "@4lt7ab/ui/core";
import type { ThemeDefinition } from "@4lt7ab/ui/core";
import { Icon } from "@4lt7ab/ui/ui";
import { useTheme } from "../theme/ThemeContext";
import { FEATURED_THEMES } from "../theme/lib-themes";

export interface AppThemePickerProps {
  /** Optional descriptions for each theme, keyed by theme name. */
  descriptions?: Record<string, string>;
  /** Display variant. `'grid'` (default) renders a card grid; `'compact'` renders a dropdown. */
  variant?: "grid" | "compact";
}

/** Convert the library theme registry Map to a sorted array. Featured themes come first. */
function useThemeList(): ThemeDefinition[] {
  const lib = useLibTheme();
  return useMemo(() => {
    const all = Array.from(lib.themes.values());
    const featuredSet = new Set<string>(FEATURED_THEMES);
    const featured: ThemeDefinition[] = [];
    const rest: ThemeDefinition[] = [];
    for (const def of all) {
      if (featuredSet.has(def.name)) {
        featured.push(def);
      } else {
        rest.push(def);
      }
    }
    // Sort featured in FEATURED_THEMES order
    featured.sort(
      (a, b) =>
        FEATURED_THEMES.indexOf(a.name as typeof FEATURED_THEMES[number]) -
        FEATURED_THEMES.indexOf(b.name as typeof FEATURED_THEMES[number]),
    );
    return [...featured, ...rest];
  }, [lib.themes]);
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
  const themeList = useThemeList();

  return (
    <div className="tfp-theme-picker">
      {themeList.map((def) => {
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
  const themeList = useThemeList();
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
          setFocusedIndex((i) => (i + 1) % themeList.length);
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedIndex(
            (i) => (i - 1 + themeList.length) % themeList.length,
          );
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < themeList.length) {
            setTheme(themeList[focusedIndex].name);
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
          setFocusedIndex(themeList.length - 1);
          break;
      }
    },
    [open, focusedIndex, setTheme, themeList],
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
      const activeIdx = themeList.findIndex((td) => td.name === themeName);
      setFocusedIndex(activeIdx >= 0 ? activeIdx : 0);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentTheme = themeList.find((td) => td.name === themeName);

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
              ? `tfp-tp-item-${themeList[focusedIndex]?.name}`
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
            maxHeight: "20rem",
            overflowY: "auto",
            zIndex: 100,
            boxShadow: t.shadowMd,
          }}
        >
          {themeList.map((td, idx) => {
            const isActive = themeName === td.name;
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
                key={td.name}
                id={`tfp-tp-item-${td.name}`}
                role="option"
                aria-selected={isActive}
                className={classes}
                onClick={() => {
                  setTheme(td.name);
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
                      ? "var(--color-action-primary)"
                      : "var(--color-text-muted)",
                    flexShrink: 0,
                  }}
                />
                {td.label}
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
