/**
 * Compatibility ThemeProvider and useTheme hook.
 *
 * Wraps @4lt7ab/ui/core's ThemeProvider and exposes the OLD API
 * (theme object with nested tokens, themeName string, setTheme function)
 * so existing components continue to work during incremental migration.
 *
 * New components should import directly from @4lt7ab/ui/core:
 *   import { semantic as t, useTheme } from "@4lt7ab/ui/core";
 */

import { createContext, useContext, useEffect, useMemo } from "react";
import {
  ThemeProvider as LibThemeProvider,
  useTheme as useLibTheme,
} from "@4lt7ab/ui/core";
import type { Theme } from "./theme";
import { themes as legacyThemes } from "./theme";
import { appThemes, APP_DEFAULT_THEME, APP_STORAGE_KEY } from "./lib-themes";
import { buildCompatTheme } from "./compat";

// ---------------------------------------------------------------------------
// Compat context — carries the legacy Theme object
// ---------------------------------------------------------------------------

interface CompatThemeContextValue {
  theme: Theme;
  themeName: string;
  setTheme: (name: string) => void;
}

const CompatThemeContext = createContext<CompatThemeContextValue | null>(null);

// ---------------------------------------------------------------------------
// Inner bridge: reads from library context, provides compat context
// ---------------------------------------------------------------------------

function CompatBridge({ children }: { children: React.ReactNode }) {
  const lib = useLibTheme();

  const value = useMemo<CompatThemeContextValue>(() => {
    const themeName = lib.theme;
    // Look up the legacy theme for unmapped tokens (glow, motion, etc.)
    const legacy = legacyThemes[themeName];
    // Build compat theme: library CSS vars for mapped tokens, legacy values otherwise
    const theme = legacy
      ? buildCompatTheme(legacy)
      : buildCompatTheme(legacyThemes[APP_DEFAULT_THEME]!);

    return {
      theme,
      themeName,
      setTheme: lib.setTheme,
    };
  }, [lib.theme, lib.setTheme]);

  // Sync legacy side-effects: body font, data-synth attribute
  useEffect(() => {
    document.body.style.fontFamily = value.theme.font.body;
    document.body.style.margin = "0";

    const root = document.documentElement;
    if (value.theme.glow.animated) {
      root.setAttribute("data-synth", "");
    } else {
      root.removeAttribute("data-synth");
    }
  }, [value.theme]);

  return (
    <CompatThemeContext.Provider value={value}>
      {children}
    </CompatThemeContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// ThemeProvider — wraps library provider + compat bridge
// ---------------------------------------------------------------------------

interface ThemeProviderProps {
  children: React.ReactNode;
  /** Override theme selection with a specific theme name. */
  forcedTheme?: string;
  /** Skip body style effects (unused — library handles this via applyPageStyles). */
  isolated?: boolean;
}

export function ThemeProvider({ children, forcedTheme }: ThemeProviderProps) {
  return (
    <LibThemeProvider
      defaultTheme={forcedTheme ?? APP_DEFAULT_THEME}
      themes={appThemes}
      storageKey={APP_STORAGE_KEY}
      applyPageStyles={true}
    >
      <CompatBridge>{children}</CompatBridge>
    </LibThemeProvider>
  );
}

// ---------------------------------------------------------------------------
// useTheme — returns the compat context (old API)
//
// For the library's native useTheme, import from "@4lt7ab/ui/core" directly.
// ---------------------------------------------------------------------------

export function useTheme(): CompatThemeContextValue {
  const ctx = useContext(CompatThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
