import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { type Theme, defaultThemeName, themes } from "../theme/theme";

const STORAGE_KEY = "pm-theme";

interface ThemeContextValue {
  theme: Theme;
  themeName: string;
  setTheme: (name: string) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function loadSavedTheme(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved in themes) return saved;
  } catch {}
  return defaultThemeName;
}

interface ThemeProviderProps {
  children: React.ReactNode;
  /** Override theme selection with a specific theme name. */
  forcedTheme?: string;
  /** Skip body style effects (useful for nested/isolated providers). */
  isolated?: boolean;
}

export function ThemeProvider({ children, forcedTheme, isolated }: ThemeProviderProps) {
  const [themeName, setThemeName] = useState(loadSavedTheme);

  const setTheme = useCallback((name: string) => {
    if (name in themes) {
      setThemeName(name);
      localStorage.setItem(STORAGE_KEY, name);
    }
  }, []);

  const effectiveName = forcedTheme && forcedTheme in themes ? forcedTheme : themeName;
  const t = themes[effectiveName]!;

  useEffect(() => {
    if (isolated) return;
    const s = document.body.style;
    s.backgroundColor = t.color.surface;
    s.color = t.color.text;
    s.fontFamily = t.font.body;
    s.margin = "0";

    // Toggle data-synth on <html> for CSS glow cycling
    const root = document.documentElement;
    if (effectiveName === "synth") {
      root.setAttribute("data-synth", "");
    } else {
      root.removeAttribute("data-synth");
    }
  }, [t, isolated, effectiveName]);

  return (
    <ThemeContext.Provider value={{ theme: t, themeName: effectiveName, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
