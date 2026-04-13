/**
 * Tests verifying ThemePicker migration from custom ThemeSwitcher to @4lt7ab/ui.
 *
 * Verifies:
 * 1. ThemeSwitcher.tsx re-exports ThemePicker from the library
 * 2. ThemesPage uses ThemePicker grid variant from library
 * 3. App.tsx uses ThemePicker compact variant in TopBar trailing
 * 4. Old custom ThemeSwitcher implementation is removed
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";

const MOLECULES_DIR = join(import.meta.dir);
const PAGES_DIR = join(import.meta.dir, "..", "..", "pages");
const APP_DIR = join(import.meta.dir, "..", "..");

function readFile(dir: string, name: string): string {
  return readFileSync(join(dir, name), "utf-8");
}

// ---------------------------------------------------------------------------
// 1. ThemeSwitcher re-exports library ThemePicker
// ---------------------------------------------------------------------------

describe("ThemeSwitcher re-export", () => {
  const src = readFile(MOLECULES_DIR, "ThemeSwitcher.tsx");

  test("re-exports ThemePicker from @4lt7ab/ui/ui", () => {
    expect(src).toContain('from "@4lt7ab/ui/ui"');
    expect(src).toContain("ThemePicker");
  });

  test("does not contain old custom implementation", () => {
    // Old implementation had inline styles with border-radius swatches
    expect(src).not.toContain("borderRadius");
    expect(src).not.toContain("onClick");
    expect(src).not.toContain("themes).map");
  });

  test("exports ThemeSwitcher name for barrel compatibility", () => {
    expect(src).toContain("as ThemeSwitcher");
  });
});

// ---------------------------------------------------------------------------
// 2. ThemesPage uses library ThemePicker
// ---------------------------------------------------------------------------

describe("ThemesPage library integration", () => {
  const src = readFile(PAGES_DIR, "ThemesPage.tsx");

  test("imports ThemePicker from @4lt7ab/ui/ui", () => {
    expect(src).toContain('import { ThemePicker } from "@4lt7ab/ui/ui"');
  });

  test("renders ThemePicker with descriptions", () => {
    expect(src).toContain("<ThemePicker");
    expect(src).toContain("descriptions={themeDescriptions}");
  });

  test("does not contain old ThemeCard implementation", () => {
    expect(src).not.toContain("function ThemeCard");
    expect(src).not.toContain("swatches");
  });

  test("provides descriptions for all four themes", () => {
    expect(src).toContain("deepTeal:");
    expect(src).toContain("ember:");
    expect(src).toContain("nord:");
    expect(src).toContain("synth:");
  });
});

// ---------------------------------------------------------------------------
// 3. App.tsx uses compact ThemePicker in TopBar
// ---------------------------------------------------------------------------

describe("TopBar compact ThemePicker", () => {
  const src = readFile(APP_DIR, "App.tsx");

  test("imports ThemePicker from @4lt7ab/ui/ui", () => {
    expect(src).toContain('import { ThemePicker } from "@4lt7ab/ui/ui"');
  });

  test("renders compact variant in TrailingIndicators", () => {
    expect(src).toContain('ThemePicker variant="compact"');
  });
});
