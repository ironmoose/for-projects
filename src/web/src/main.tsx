import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { ThemeProvider, ToastProvider, IconFontProvider } from "./components";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <IconFontProvider fontClass="material-symbols-outlined">
        <ToastProvider>
          <App />
        </ToastProvider>
      </IconFontProvider>
    </ThemeProvider>
  </StrictMode>,
);
