import type { ThemeDefinition } from "@4lt7ab/ui/core";

/** No custom themes — we use library built-ins exclusively. */
export const appThemes: ThemeDefinition[] = [];

/**
 * The 4 "featured" library themes shown prominently in the theme picker.
 * Users can still select any of the 9 built-in themes.
 */
export const FEATURED_THEMES = ["synthwave", "slate", "neural", "coral"] as const;

/** Default theme for new users. */
export const APP_DEFAULT_THEME = "slate";

/** localStorage key — matches the old key so we don't lose preferences. */
export const APP_STORAGE_KEY = "pm-theme";
