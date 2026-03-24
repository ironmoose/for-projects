import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { type Theme, defaultThemeName, themes } from "./theme";

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

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeName, setThemeName] = useState(loadSavedTheme);

  const setTheme = useCallback((name: string) => {
    if (name in themes) {
      setThemeName(name);
      localStorage.setItem(STORAGE_KEY, name);
    }
  }, []);

  const t = themes[themeName]!;

  useEffect(() => {
    const s = document.body.style;
    s.backgroundColor = t.color.surface;
    s.color = t.color.text;
    s.fontFamily = t.font.body;
    s.margin = "0";
  }, [t]);

  return (
    <ThemeContext.Provider value={{ theme: t, themeName, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
