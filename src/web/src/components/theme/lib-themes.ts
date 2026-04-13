/**
 * Custom ThemeDefinition objects that map the app's 4 themes to the
 * @4lt7ab/ui/core ThemeProvider format.
 *
 * These definitions preserve the exact color values from the original
 * hand-rolled theme system (theme.ts) while mapping them into the
 * library's ThemeTokens structure.
 *
 * Spacing, radius, typography, and shadows use the LIBRARY's standard
 * scale (not the app's original values) since the compat layer handles
 * the mismatch for old components, and new components should use the
 * library scale.
 */
import type { ThemeDefinition } from "@4lt7ab/ui/core";

// ---------------------------------------------------------------------------
// Shared non-color tokens (library standard scale)
// ---------------------------------------------------------------------------

const sharedTokens = {
  // Spacing (library scale)
  spaceXs: "0.25rem",
  spaceSm: "0.5rem",
  spaceMd: "1rem",
  spaceLg: "1.5rem",
  spaceXl: "2rem",
  space2xl: "3rem",

  // Radii (library scale)
  radiusSm: "0.25rem",
  radiusMd: "0.375rem",
  radiusLg: "0.5rem",
  radiusFull: "9999px",

  // Typography
  fontSans: "'Inter', system-ui, -apple-system, sans-serif",
  fontSerif: "'Lora', Georgia, 'Times New Roman', serif",
  fontMono: "'JetBrains Mono', 'SF Mono', 'Fira Code', 'Fira Mono', Menlo, monospace",

  // Font sizes (library scale)
  fontSizeXs: "0.75rem",
  fontSizeSm: "0.875rem",
  fontSizeBase: "1rem",
  fontSizeLg: "1.125rem",
  fontSizeXl: "1.25rem",
  fontSize2xl: "1.5rem",
  fontSize3xl: "1.875rem",

  // Line heights
  lineHeightTight: "1.25",
  lineHeightBase: "1.5",
  lineHeightRelaxed: "1.625",

  // Font weights
  fontWeightNormal: "400",
  fontWeightMedium: "500",
  fontWeightSemibold: "600",
  fontWeightBold: "700",

  // Letter spacing (library scale)
  letterSpacingTight: "-0.025em",
  letterSpacingNormal: "0em",
  letterSpacingWide: "0.025em",
} as const;

// ---------------------------------------------------------------------------
// Deep Teal — dark teal from MD3 Stitch palette
// ---------------------------------------------------------------------------

export const deepTealTheme: ThemeDefinition = {
  name: "deepTeal",
  label: "Deep Teal",
  tokens: {
    ...sharedTokens,

    // Text
    colorText: "#d4e5ea",
    colorTextSecondary: "#5a7580",
    colorTextMuted: "#8ba8b2",
    colorTextInverse: "#003642",
    colorTextLink: "#8bd1e8",
    colorTextPlaceholder: "#5a7580",
    colorTextDisabled: "#3a5560",

    // Surfaces
    colorSurface: "#12252a",
    colorSurfacePanel: "#0f2025",
    colorSurfaceRaised: "#172e34",
    colorSurfaceOverlay: "rgba(0, 0, 0, 0.7)",
    colorSurfaceInput: "#12252a",
    colorSurfaceDisabled: "#1e383f",
    colorSurfacePage: "#0d1b1f",

    // Borders
    colorBorder: "#1e383f",
    colorBorderFocused: "#8bd1e8",
    colorBorderError: "#ffb4ab",

    // Actions
    colorActionPrimary: "#8bd1e8",
    colorActionPrimaryHover: "#a3ddf0",
    colorActionSecondary: "#12252a",
    colorActionSecondaryHover: "#172e34",
    colorActionDestructive: "#ffb4ab",
    colorActionDestructiveHover: "#ffc8c0",

    // Feedback
    colorSuccess: "#6dd58c",
    colorSuccessBg: "rgba(109, 213, 140, 0.1)",
    colorWarning: "#fcb97b",
    colorWarningBg: "rgba(252, 185, 123, 0.1)",
    colorError: "#ff8a80",
    colorErrorBg: "rgba(255, 138, 128, 0.1)",
    colorInfo: "#8bd1e8",
    colorInfoBg: "rgba(139, 209, 232, 0.1)",

    // Shadows
    shadowSm: "0 1px 3px rgba(0,0,0,0.4)",
    shadowMd: "0 4px 20px rgba(0,0,0,0.3)",
    shadowLg: "0 8px 40px rgba(0,0,0,0.4)",

    // Focus
    focusRingColor: "#8bd1e8",
    focusRingWidth: "2px",
    focusRingOffset: "2px",
  },
};

// ---------------------------------------------------------------------------
// Ember — warm dark amber/orange
// ---------------------------------------------------------------------------

export const emberTheme: ThemeDefinition = {
  name: "ember",
  label: "Ember",
  tokens: {
    ...sharedTokens,

    // Text
    colorText: "#ede0d4",
    colorTextSecondary: "#6e5e50",
    colorTextMuted: "#a89280",
    colorTextInverse: "#2d1600",
    colorTextLink: "#e87040",
    colorTextPlaceholder: "#6e5e50",
    colorTextDisabled: "#4e3e30",

    // Surfaces
    colorSurface: "#1e1816",
    colorSurfacePanel: "#1a1412",
    colorSurfaceRaised: "#261e1a",
    colorSurfaceOverlay: "rgba(0, 0, 0, 0.7)",
    colorSurfaceInput: "#1e1816",
    colorSurfaceDisabled: "#2e2520",
    colorSurfacePage: "#141010",

    // Borders
    colorBorder: "#2e2520",
    colorBorderFocused: "#e87040",
    colorBorderError: "#ffb4ab",

    // Actions
    colorActionPrimary: "#e87040",
    colorActionPrimaryHover: "#f08858",
    colorActionSecondary: "#1e1816",
    colorActionSecondaryHover: "#261e1a",
    colorActionDestructive: "#ffb4ab",
    colorActionDestructiveHover: "#ffc8c0",

    // Feedback
    colorSuccess: "#a8d5a2",
    colorSuccessBg: "rgba(168, 213, 162, 0.1)",
    colorWarning: "#f5d08a",
    colorWarningBg: "rgba(245, 208, 138, 0.1)",
    colorError: "#ff8a80",
    colorErrorBg: "rgba(255, 138, 128, 0.1)",
    colorInfo: "#e87040",
    colorInfoBg: "rgba(232, 112, 64, 0.1)",

    // Shadows
    shadowSm: "0 1px 3px rgba(0,0,0,0.5)",
    shadowMd: "0 4px 20px rgba(0,0,0,0.35)",
    shadowLg: "0 8px 40px rgba(0,0,0,0.45)",

    // Focus
    focusRingColor: "#e87040",
    focusRingWidth: "2px",
    focusRingOffset: "2px",
  },
};

// ---------------------------------------------------------------------------
// Nord — arctic dark
// ---------------------------------------------------------------------------

export const nordTheme: ThemeDefinition = {
  name: "nord",
  label: "Nord",
  tokens: {
    ...sharedTokens,

    // Text
    colorText: "#d8dee9",
    colorTextSecondary: "#5c6478",
    colorTextMuted: "#8892a4",
    colorTextInverse: "#1a3640",
    colorTextLink: "#88c0d0",
    colorTextPlaceholder: "#5c6478",
    colorTextDisabled: "#4c5468",

    // Surfaces
    colorSurface: "#2e3440",
    colorSurfacePanel: "#292e39",
    colorSurfaceRaised: "#353c4a",
    colorSurfaceOverlay: "rgba(0, 0, 0, 0.7)",
    colorSurfaceInput: "#2e3440",
    colorSurfaceDisabled: "#3d4556",
    colorSurfacePage: "#242933",

    // Borders
    colorBorder: "#3d4556",
    colorBorderFocused: "#88c0d0",
    colorBorderError: "#bf616a",

    // Actions
    colorActionPrimary: "#88c0d0",
    colorActionPrimaryHover: "#a0d0e0",
    colorActionSecondary: "#2e3440",
    colorActionSecondaryHover: "#353c4a",
    colorActionDestructive: "#bf616a",
    colorActionDestructiveHover: "#d08770",

    // Feedback
    colorSuccess: "#a3be8c",
    colorSuccessBg: "rgba(163, 190, 140, 0.1)",
    colorWarning: "#ebcb8b",
    colorWarningBg: "rgba(235, 203, 139, 0.1)",
    colorError: "#d08770",
    colorErrorBg: "rgba(208, 135, 112, 0.1)",
    colorInfo: "#88c0d0",
    colorInfoBg: "rgba(136, 192, 208, 0.1)",

    // Shadows
    shadowSm: "0 1px 3px rgba(0,0,0,0.3)",
    shadowMd: "0 4px 20px rgba(0,0,0,0.25)",
    shadowLg: "0 8px 40px rgba(0,0,0,0.35)",

    // Focus
    focusRingColor: "#88c0d0",
    focusRingWidth: "2px",
    focusRingOffset: "2px",
  },
};

// ---------------------------------------------------------------------------
// Synth — neon retrowave (temporary mapping; full synth handling is a
// separate task that will integrate with @4lt7ab/ui/animations)
// ---------------------------------------------------------------------------

export const synthTheme: ThemeDefinition = {
  name: "synth",
  label: "Synth",
  tokens: {
    ...sharedTokens,

    // Text
    colorText: "#e0d6f6",
    colorTextSecondary: "#655b82",
    colorTextMuted: "#9b8ec2",
    colorTextInverse: "#001f22",
    colorTextLink: "#00f0ff",
    colorTextPlaceholder: "#655b82",
    colorTextDisabled: "#453b62",

    // Surfaces
    colorSurface: "#110f28",
    colorSurfacePanel: "#0e0c22",
    colorSurfaceRaised: "#181535",
    colorSurfaceOverlay: "rgba(0, 0, 0, 0.8)",
    colorSurfaceInput: "#110f28",
    colorSurfaceDisabled: "#1f1b42",
    colorSurfacePage: "#0a0a1a",

    // Borders
    colorBorder: "#1f1b42",
    colorBorderFocused: "#00f0ff",
    colorBorderError: "#ff4080",

    // Actions
    colorActionPrimary: "#00f0ff",
    colorActionPrimaryHover: "#33f5ff",
    colorActionSecondary: "#110f28",
    colorActionSecondaryHover: "#181535",
    colorActionDestructive: "#ff4080",
    colorActionDestructiveHover: "#ff6699",

    // Feedback
    colorSuccess: "#39ff14",
    colorSuccessBg: "rgba(57, 255, 20, 0.08)",
    colorWarning: "#ffe44d",
    colorWarningBg: "rgba(255, 228, 77, 0.08)",
    colorError: "#ff4080",
    colorErrorBg: "rgba(255, 64, 128, 0.08)",
    colorInfo: "#00f0ff",
    colorInfoBg: "rgba(0, 240, 255, 0.08)",

    // Shadows (neon glow)
    shadowSm: "0 0 8px rgba(0, 240, 255, 0.25), 0 1px 4px rgba(0, 0, 0, 0.4)",
    shadowMd: "0 0 20px rgba(0, 240, 255, 0.20), 0 0 40px rgba(255, 45, 149, 0.10), 0 4px 20px rgba(0, 0, 0, 0.4)",
    shadowLg: "0 0 30px rgba(0, 240, 255, 0.25), 0 0 60px rgba(255, 45, 149, 0.15), 0 8px 40px rgba(0, 0, 0, 0.5)",

    // Focus
    focusRingColor: "#00f0ff",
    focusRingWidth: "2px",
    focusRingOffset: "2px",
  },
};

/**
 * All app-specific custom themes, to be passed to the library ThemeProvider.
 */
export const appThemes: ThemeDefinition[] = [
  deepTealTheme,
  emberTheme,
  nordTheme,
  synthTheme,
];

/**
 * Default theme name for the app.
 */
export const APP_DEFAULT_THEME = "deepTeal";

/**
 * localStorage key — matches the old key so existing preferences are preserved.
 * Note: the library defaults to 'ui-theme'. We use our existing key to avoid
 * resetting users' theme preferences on upgrade.
 */
export const APP_STORAGE_KEY = "pm-theme";
