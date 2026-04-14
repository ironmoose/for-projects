/**
 * BackgroundLoader — replaces the library's ThemeBackground with app-level control.
 *
 * Canvas themes (synthwave, pipboy, neural, pacman, black-hole) delegate to the
 * library's exported background functions. Static themes (slate, moss, warm-sand,
 * coral) get a subtle radial gradient derived from the theme's primary color.
 *
 * Guards match the library: desktop only (>768px), respects prefers-reduced-motion.
 */

import { useEffect, useRef } from "react";
import { useTheme } from "../theme/ThemeContext";
import type { BackgroundFunction } from "@4lt7ab/ui/animations";
import {
  synthwaveBackground,
  pipboyBackground,
  neuralBackground,
  pacmanBackground,
  blackHoleBackground,
} from "@4lt7ab/ui/animations";

// ---------------------------------------------------------------------------
// Canvas background registry (themes with animated backgrounds)
// ---------------------------------------------------------------------------

const canvasRegistry: Record<string, BackgroundFunction> = {
  synthwave: synthwaveBackground,
  pipboy: pipboyBackground,
  neural: neuralBackground,
  pacman: pacmanBackground,
  "black-hole": blackHoleBackground,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BackgroundLoader(): React.JSX.Element | null {
  const { themeName } = useTheme();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Tear down previous background
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    if (containerRef.current) {
      containerRef.current.remove();
      containerRef.current = null;
    }

    // Guards: desktop-only, motion-safe
    if (
      window.innerWidth <= 768 ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const canvasFn = canvasRegistry[themeName];

    if (canvasFn) {
      // --- Canvas background (animated themes) ---
      const container = document.createElement("div");
      container.setAttribute("data-theme-bg", themeName);
      container.setAttribute("aria-hidden", "true");
      container.style.cssText =
        "position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden;";
      document.body.prepend(container);
      containerRef.current = container;

      const canvas = document.createElement("canvas");
      canvas.style.cssText = "width:100%;height:100%;";
      container.appendChild(canvas);

      cleanupRef.current = canvasFn(canvas);
    } else {
      // --- Gradient background (static themes) ---
      const container = document.createElement("div");
      container.setAttribute("data-theme-bg", themeName);
      container.setAttribute("aria-hidden", "true");
      container.style.cssText = [
        "position:fixed",
        "inset:0",
        "z-index:0",
        "pointer-events:none",
        "background:radial-gradient(ellipse at 30% 20%, color-mix(in srgb, var(--color-action-primary) 8%, transparent) 0%, transparent 70%)," +
        "radial-gradient(ellipse at 80% 70%, color-mix(in srgb, var(--color-action-primary) 5%, transparent) 0%, transparent 60%)",
      ].join(";");
      document.body.prepend(container);
      containerRef.current = container;
    }

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      if (containerRef.current) {
        containerRef.current.remove();
        containerRef.current = null;
      }
    };
  }, [themeName]);

  return null;
}
