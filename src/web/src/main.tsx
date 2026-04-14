import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { ThemeProvider } from "@4lt7ab/ui/core";
import { IconFontProvider, ToastProvider } from "@4lt7ab/ui/ui";

// Migrate stale localStorage theme names from old custom themes to library equivalents
if (typeof window !== "undefined") {
  const OLD_TO_NEW: Record<string, string> = {
    synth: "synthwave",
    deepTeal: "slate",
    ember: "coral",
    nord: "neural",
  };
  const stored = localStorage.getItem("pm-theme");
  if (stored && stored in OLD_TO_NEW) {
    localStorage.setItem("pm-theme", OLD_TO_NEW[stored]);
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="slate" storageKey="pm-theme" applyPageStyles>
      <IconFontProvider fontClass="material-symbols-outlined">
        <ToastProvider>
          <App />
        </ToastProvider>
      </IconFontProvider>
    </ThemeProvider>
  </StrictMode>,
);
