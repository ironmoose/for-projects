/**
 * Theme compatibility layer — bridges the old hand-rolled token structure
 * with the @4lt7ab/ui/core semantic token system.
 *
 * USAGE:
 *   Old components: import { useTheme } from "../theme/ThemeContext"
 *     → returns { theme, themeName, setTheme } with the legacy token structure
 *
 *   New components: import { semantic as t } from "@4lt7ab/ui/core"
 *     → use t.colorText, t.spaceMd, etc. directly
 *
 * This module provides:
 *   1. `useCompatTheme()` — hook returning the old Theme shape populated with
 *      library CSS var references where tokens map 1:1, and preserved local
 *      values where they don't.
 *   2. `legacyThemes` — the old themes record for components that iterate
 *      over themes (ThemesPage, PreviewPanel).
 *
 * KEY DESIGN DECISIONS:
 *   - Spacing: old values are PRESERVED (0.75rem for md, etc.) because 84
 *     components depend on the current visual density. Migrating spacing
 *     is a separate task.
 *   - Font sizes: old values preserved for sm (0.8125rem), 2xl (2.25rem),
 *     xxs (0.625rem) which have no library equivalent or different values.
 *   - Radius: old values were NUMBERS (px); compat returns numbers to avoid
 *     breaking `borderRadius: theme.radius.lg` (which expects a number).
 *   - Glow, motion, animation, layout, breakpoint: fully local, no library
 *     equivalent.
 */

import { semantic as t } from "@4lt7ab/ui/core";
import type { Theme } from "./theme";
import { themes as legacyThemeDefinitions } from "./theme";

// Re-export for backwards compat in modules that import { themes } from theme
export { legacyThemeDefinitions as legacyThemes };

// ---------------------------------------------------------------------------
// Build a compat theme from a legacy theme definition.
//
// Colors that have a direct library semantic token equivalent get the CSS var
// reference. Colors with no equivalent keep the original hex value. This
// means the compat theme works when the library ThemeProvider is wrapping the
// app (CSS vars are defined), and falls back gracefully for tokens that are
// app-specific.
// ---------------------------------------------------------------------------

/**
 * Creates a compat theme that uses library CSS var references for mapped
 * tokens and preserves original values for unmapped tokens.
 *
 * The returned object has the same shape as the old Theme interface, so
 * existing components work without changes.
 */
export function buildCompatTheme(legacy: Theme): Theme {
  return {
    name: legacy.name,
    label: legacy.label,

    color: {
      // Mapped to library tokens (CSS var references)
      text: t.colorText,
      textMuted: t.colorTextMuted,
      textFaint: t.colorTextSecondary,
      surface: t.colorSurface,
      surfaceContainerLow: t.colorSurfacePanel,
      surfaceContainer: t.colorSurface,
      surfaceContainerHigh: t.colorSurfaceRaised,
      surfaceContainerHighest: t.colorSurfaceRaised,
      border: t.colorBorder,
      primary: t.colorActionPrimary,
      onPrimary: t.colorTextInverse,
      danger: t.colorActionDestructive,
      success: t.colorSuccess,
      warning: t.colorWarning,
      running: t.colorSuccess,
      failed: t.colorError,

      // Unmapped — preserve original values
      borderSubtle: legacy.color.borderSubtle,
      primaryContainer: legacy.color.primaryContainer,
      onPrimaryContainer: legacy.color.onPrimaryContainer,
      tertiary: legacy.color.tertiary,
      activityFlash: legacy.color.activityFlash,
      glowPrimary: legacy.color.glowPrimary,
      glowSuccess: legacy.color.glowSuccess,
      glowDanger: legacy.color.glowDanger,
      activityBorder: legacy.color.activityBorder,
    },

    shadow: {
      sm: t.shadowSm,
      md: t.shadowMd,
      lg: t.shadowLg,
    },

    // Glow is entirely app-specific — no library equivalent
    glow: legacy.glow,

    // Radius stays as numbers (old components use numeric px values)
    radius: legacy.radius,

    // Spacing: preserve OLD values to avoid visual density shift
    // Old: xs=0.25, sm=0.5, md=0.75, lg=1, xl=1.5, 2xl=2, 3xl=2.5
    // Lib: xs=0.25, sm=0.5, md=1,    lg=1.5, xl=2, 2xl=3
    spacing: legacy.spacing,

    // Font: preserve old values for sizes that don't match library
    font: legacy.font,

    // Motion, animation, layout, breakpoint: fully local
    motion: legacy.motion,
    animation: legacy.animation,
    layout: legacy.layout,
    breakpoint: legacy.breakpoint,
  };
}

/**
 * Pre-built compat themes keyed by name, for components that iterate.
 */
export const compatThemes: Record<string, Theme> = Object.fromEntries(
  Object.entries(legacyThemeDefinitions).map(([name, legacy]) => [
    name,
    buildCompatTheme(legacy),
  ]),
);
