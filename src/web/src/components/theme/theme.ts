import { sg } from "./synthGlow";

export interface Theme {
  name: string;
  label: string;
  glow: {
    // Whether the glow CSS animation (--synth-glow cycling) is active
    animated: boolean;
    // Accent color for glow-aware headings/labels
    accentColor: string;
    // Border colors at various intensities
    borderSubtle: string;
    borderLight: string;
    borderMedium: string;
    borderStrong: string;
    // Box shadows at various sizes
    shadowSm: string;
    shadowMd: string;
    shadowLg: string;
    shadowXl: string;
    // Text shadow for glow headings
    textShadow: string;
    // Focus ring styles for inputs
    focusRing: string;
    focusRingSubtle: string;
    // Hover intensified glow (buttons, cards)
    hoverShadow: string;
    // Danger-specific glow for confirm dialogs
    dangerShadow: string;
    dangerBorder: string;
  };
  motion: {
    fast: string;
    normal: string;
    slow: string;
    easing: string;
    easingSubtle: string;
  };
  animation: {
    duration: {
      instant: string;
      fast: string;
      normal: string;
      slow: string;
      pulse: string;
      glow: string;
      stagger: string;
    };
    easing: {
      default: string;
      decelerate: string;
      accelerate: string;
      spring: string;
    };
  };
  layout: {
    topBarHeight: string;
    pipelineIndent: string;
    pipelineNodeSize: string;
    pipelineLineWidth: string;
    tableRowHeight: string;
    maxContentWidth: string;
  };
  breakpoint: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
}

const shared: Pick<Theme, "motion" | "animation" | "layout" | "breakpoint"> = {
  motion: {
    fast: "100ms",
    normal: "200ms",
    slow: "400ms",
    easing: "cubic-bezier(0.4, 0, 0.2, 1)",
    easingSubtle: "cubic-bezier(0.25, 0.1, 0.25, 1)",
  },
  animation: {
    duration: {
      instant: "50ms",
      fast: "150ms",
      normal: "300ms",
      slow: "500ms",
      pulse: "2000ms",
      glow: "1500ms",
      stagger: "50ms",
    },
    easing: {
      default: "cubic-bezier(0.4, 0, 0.2, 1)",
      decelerate: "cubic-bezier(0, 0, 0.2, 1)",
      accelerate: "cubic-bezier(0.4, 0, 1, 1)",
      spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    },
  },
  layout: {
    topBarHeight: "48px",
    pipelineIndent: "48px",
    pipelineNodeSize: "12px",
    pipelineLineWidth: "2px",
    tableRowHeight: "52px",
    maxContentWidth: "1400px",
  },
  breakpoint: {
    sm: 640,
    md: 1024,
    lg: 1440,
    xl: 1920,
  },
};

/** Glow tokens for non-glow themes: everything is transparent/none/fallback. */
function noGlow(): Theme["glow"] {
  return {
    animated: false,
    accentColor: "currentColor",
    borderSubtle: "transparent",
    borderLight: "transparent",
    borderMedium: "var(--color-border)",
    borderStrong: "var(--color-border)",
    shadowSm: "none",
    shadowMd: "none",
    shadowLg: "none",
    shadowXl: "none",
    textShadow: "none",
    focusRing: "none",
    focusRingSubtle: "none",
    hoverShadow: "none",
    dangerShadow: "none",
    dangerBorder: "rgba(255,64,128,0.27)",
  };
}

export const themes: Record<string, Theme> = {
  // Slate — maps from the old deepTeal theme (closest match)
  slate: {
    name: "slate",
    label: "Slate",
    ...shared,
    glow: noGlow(),
  },

  // Coral — maps from the old ember theme (closest match)
  coral: {
    name: "coral",
    label: "Coral",
    ...shared,
    glow: noGlow(),
  },

  // Neural — maps from the old deepTeal theme (blue accent match)
  neural: {
    name: "neural",
    label: "Neural",
    ...shared,
    glow: noGlow(),
  },

  // Synthwave — neon-soaked retrowave (glow system active)
  synthwave: {
    name: "synthwave",
    label: "Synthwave",
    ...shared,
    glow: {
      animated: true,
      accentColor: "var(--synth-glow)",
      borderSubtle: sg(10),
      borderLight: sg(16),
      borderMedium: sg(27),
      borderStrong: sg(53),
      shadowSm: `0 0 4px ${sg(6)}`,
      shadowMd: `0 0 8px ${sg(8)}`,
      shadowLg: `0 0 12px ${sg(9)}`,
      shadowXl: `0 0 30px ${sg(19)}, 0 0 60px ${sg(9)}, 0 8px 40px rgba(0,0,0,0.5)`,
      textShadow: `0 0 8px ${sg(27)}`,
      focusRing: `0 0 12px ${sg(19)}, inset 0 0 6px ${sg(5)}`,
      focusRingSubtle: `0 0 4px ${sg(6)}`,
      hoverShadow: `0 0 15px ${sg(15)}, 0 0 30px ${sg(6)}`,
      dangerShadow: `0 0 25px #ff408025, 0 0 50px #ff2d9510, 0 8px 40px rgba(0,0,0,0.5)`,
      dangerBorder: "#ff408044",
    },
  },

  // Fallbacks for other library themes — generic dark defaults
  "warm-sand": {
    name: "warm-sand",
    label: "Warm Sand",
    ...shared,
    glow: noGlow(),
  },

  moss: {
    name: "moss",
    label: "Moss",
    ...shared,
    glow: noGlow(),
  },

  pipboy: {
    name: "pipboy",
    label: "Pip-Boy",
    ...shared,
    glow: noGlow(),
  },

  pacman: {
    name: "pacman",
    label: "Pac-Man",
    ...shared,
    glow: noGlow(),
  },

  "black-hole": {
    name: "black-hole",
    label: "Black Hole",
    ...shared,
    glow: noGlow(),
  },
};

export const defaultThemeName = "slate";
