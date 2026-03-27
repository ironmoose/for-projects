export interface Theme {
  name: string;
  label: string;
  color: {
    // Text hierarchy
    text: string;
    textMuted: string;
    textFaint: string;
    // Surface layers (MD3-style tonal depth)
    surface: string;
    surfaceContainer: string;
    surfaceContainerLow: string;
    surfaceContainerHigh: string;
    surfaceContainerHighest: string;
    // Borders
    border: string;
    borderSubtle: string;
    // Primary
    primary: string;
    primaryContainer: string;
    onPrimary: string;
    onPrimaryContainer: string;
    // Tertiary accent
    tertiary: string;
    // Danger / error
    danger: string;
    // Semantic
    success: string;
    // Warning
    warning: string;
    // Activity flash (primary at ~9% opacity)
    activityFlash: string;
    // Status-specific
    running: string;
    failed: string;
    // Glow/event colors
    glowPrimary: string;
    glowSuccess: string;
    glowDanger: string;
    // Activity border
    activityBorder: string;
  };
  shadow: {
    sm: string;
    md: string;
    lg: string;
  };
  radius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    full: number;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    "2xl": string;
    "3xl": string;
  };
  font: {
    headline: string;
    body: string;
    mono: string;
    size: {
      xxs: string;
      xs: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
      "2xl": string;
    };
    lineHeight: {
      tight: number;
      normal: number;
      relaxed: number;
      mono: number;
    };
    letterSpacing: {
      tight: string;
      normal: string;
      wide: string;
    };
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

const shared: Pick<Theme, "radius" | "spacing" | "font" | "motion" | "animation" | "layout" | "breakpoint"> = {
  radius: { sm: 2, md: 4, lg: 8, xl: 12, full: 9999 },
  spacing: {
    xs: "0.25rem",
    sm: "0.5rem",
    md: "0.75rem",
    lg: "1rem",
    xl: "1.5rem",
    "2xl": "2rem",
    "3xl": "2.5rem",
  },
  font: {
    headline: "'Manrope', system-ui, sans-serif",
    body: "'Inter', system-ui, sans-serif",
    mono: "'JetBrains Mono', 'SF Mono', 'Fira Code', 'Fira Mono', Menlo, monospace",
    size: {
      xxs: "0.625rem",
      xs: "0.75rem",
      sm: "0.8125rem",
      md: "0.875rem",
      lg: "1rem",
      xl: "1.25rem",
      "2xl": "2.25rem",
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.75,
      mono: 1.6,
    },
    letterSpacing: {
      tight: "-0.02em",
      normal: "0",
      wide: "0.08em",
    },
  },
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

export const themes: Record<string, Theme> = {
  // Dark teal — derived from the Stitch MD3 palette, inverted to dark
  deepTeal: {
    name: "deepTeal",
    label: "Deep Teal",
    ...shared,
    color: {
      text: "#d4e5ea",
      textMuted: "#8ba8b2",
      textFaint: "#5a7580",
      surface: "#0d1b1f",
      surfaceContainer: "#12252a",
      surfaceContainerLow: "#0f2025",
      surfaceContainerHigh: "#172e34",
      surfaceContainerHighest: "#1e383f",
      border: "#1e383f",
      borderSubtle: "#162d33",
      primary: "#8bd1e8",
      primaryContainer: "#005f73",
      onPrimary: "#003642",
      onPrimaryContainer: "#b2ebff",
      tertiary: "#fcb97b",
      danger: "#ffb4ab",
      success: "#6dd58c",
      warning: "#fcb97b",
      activityFlash: "rgba(139, 209, 232, 0.09)",
      running: "#8bd1e8",
      failed: "#ff8a80",
      glowPrimary: "rgba(139, 209, 232, 0.30)",
      glowSuccess: "rgba(109, 213, 140, 0.30)",
      glowDanger: "rgba(255, 138, 128, 0.30)",
      activityBorder: "rgba(139, 209, 232, 0.40)",
    },
    shadow: {
      sm: "0 1px 3px rgba(0,0,0,0.4)",
      md: "0 4px 20px rgba(0,0,0,0.3)",
      lg: "0 8px 40px rgba(0,0,0,0.4)",
    },
  },

  // Warm ember — dark amber/orange
  ember: {
    name: "ember",
    label: "Ember",
    ...shared,
    color: {
      text: "#ede0d4",
      textMuted: "#a89280",
      textFaint: "#6e5e50",
      surface: "#141010",
      surfaceContainer: "#1e1816",
      surfaceContainerLow: "#1a1412",
      surfaceContainerHigh: "#261e1a",
      surfaceContainerHighest: "#2e2520",
      border: "#2e2520",
      borderSubtle: "#241c18",
      primary: "#e87040",
      primaryContainer: "#6e3518",
      onPrimary: "#2d1600",
      onPrimaryContainer: "#ffdcc0",
      tertiary: "#d4bfff",
      danger: "#ffb4ab",
      success: "#a8d5a2",
      warning: "#f5d08a",
      activityFlash: "rgba(232, 112, 64, 0.09)",
      running: "#e87040",
      failed: "#ff8a80",
      glowPrimary: "rgba(232, 112, 64, 0.30)",
      glowSuccess: "rgba(168, 213, 162, 0.30)",
      glowDanger: "rgba(255, 138, 128, 0.30)",
      activityBorder: "rgba(232, 112, 64, 0.40)",
    },
    shadow: {
      sm: "0 1px 3px rgba(0,0,0,0.5)",
      md: "0 4px 20px rgba(0,0,0,0.35)",
      lg: "0 8px 40px rgba(0,0,0,0.45)",
    },
  },

  // Cool nord — arctic dark
  nord: {
    name: "nord",
    label: "Nord",
    ...shared,
    color: {
      text: "#d8dee9",
      textMuted: "#8892a4",
      textFaint: "#5c6478",
      surface: "#242933",
      surfaceContainer: "#2e3440",
      surfaceContainerLow: "#292e39",
      surfaceContainerHigh: "#353c4a",
      surfaceContainerHighest: "#3d4556",
      border: "#3d4556",
      borderSubtle: "#353c4a",
      primary: "#88c0d0",
      primaryContainer: "#2e5a66",
      onPrimary: "#1a3640",
      onPrimaryContainer: "#b8e8f5",
      tertiary: "#ebcb8b",
      danger: "#bf616a",
      success: "#a3be8c",
      warning: "#ebcb8b",
      activityFlash: "rgba(136, 192, 208, 0.09)",
      running: "#88c0d0",
      failed: "#d08770",
      glowPrimary: "rgba(136, 192, 208, 0.30)",
      glowSuccess: "rgba(163, 190, 140, 0.30)",
      glowDanger: "rgba(208, 135, 112, 0.30)",
      activityBorder: "rgba(136, 192, 208, 0.40)",
    },
    shadow: {
      sm: "0 1px 3px rgba(0,0,0,0.3)",
      md: "0 4px 20px rgba(0,0,0,0.25)",
      lg: "0 8px 40px rgba(0,0,0,0.35)",
    },
  },
};

export const defaultThemeName = "deepTeal";
