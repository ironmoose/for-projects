/**
 * Theme compatibility layer — bridges the old hand-rolled token structure
 * with the @4lt7ab/ui/core semantic token system.
 *
 * USAGE:
 *   Old components: import { useTheme } from "../theme/ThemeContext"
 *     → returns { theme, themeName, setTheme } with glow/motion/animation/layout/breakpoint
 *
 *   New components: import { semantic as t } from "@4lt7ab/ui/core"
 *     → use t.colorText, t.spaceMd, etc. directly
 *
 * The Theme interface now only contains app-specific tokens that have no
 * library equivalent: glow, motion, animation, layout, breakpoint.
 * Colors, spacing, fonts, radii, and shadows all come from the library.
 */

import type { Theme } from "./theme";
import { themes as legacyThemeDefinitions } from "./theme";

// Re-export for backwards compat in modules that import { themes } from theme
export { legacyThemeDefinitions as legacyThemes };

/**
 * Returns the theme object as-is. The Theme interface now only contains
 * app-specific tokens (glow, motion, animation, layout, breakpoint),
 * so no CSS var mapping is needed.
 *
 * Kept as a function (rather than inlined) so call sites don't need
 * to change during the migration.
 */
export function buildCompatTheme(legacy: Theme): Theme {
  return legacy;
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
