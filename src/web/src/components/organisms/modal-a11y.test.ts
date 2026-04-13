/**
 * Tests verifying ModalShell consumer accessibility after migration to @4lt7ab/ui
 * library ModalShell.
 *
 * The library ModalShell owns: role="dialog", aria-modal, focus trap, Escape handling.
 * Consumers are responsible for: titleId + matching h2 id, useShortcutSuppression.
 *
 * These tests verify:
 * 1. Consumers pass titleId and render a matching h2 with the same id
 * 2. Consumers that need shortcut suppression call useShortcutSuppression
 * 3. The barrel re-exports ModalShell from the library
 * 4. useFocusTrap hook still exists and is exported (used by library internally)
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";

const ORGANISMS_DIR = join(import.meta.dir);
const HOOKS_DIR = join(import.meta.dir, "..", "..", "hooks");
const PAGES_DIR = join(import.meta.dir, "..", "..", "pages");
const COMPONENTS_DIR = join(import.meta.dir, "..");

function readFile(dir: string, name: string): string {
  return readFileSync(join(dir, name), "utf-8");
}

// ---------------------------------------------------------------------------
// 1. Barrel re-export from library
// ---------------------------------------------------------------------------

describe("ModalShell library re-export", () => {
  test("barrel exports ModalShell from @4lt7ab/ui/ui", () => {
    const src = readFile(COMPONENTS_DIR, "index.ts");
    expect(src).toContain('export { ModalShell } from "@4lt7ab/ui/ui"');
  });

  test("local ModalShell.tsx no longer exists", () => {
    const exists = (() => {
      try {
        readFile(ORGANISMS_DIR, "ModalShell.tsx");
        return true;
      } catch {
        return false;
      }
    })();
    expect(exists).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 2. Consumer titleId + h2 integration
// ---------------------------------------------------------------------------

describe("Consumer a11y integration", () => {
  test("CreateEntityOverlay passes titleId and renders matching h2", () => {
    const src = readFile(ORGANISMS_DIR, "CreateEntityOverlay.tsx");
    expect(src).toContain('titleId="create-entity-title"');
    expect(src).toContain('id="create-entity-title"');
    expect(src).toContain("<h2");
  });

  test("ShortcutHelpOverlay passes titleId and renders matching h2", () => {
    const src = readFile(ORGANISMS_DIR, "ShortcutHelpOverlay.tsx");
    expect(src).toContain('titleId="shortcut-help-title"');
    expect(src).toContain('id="shortcut-help-title"');
  });

  test("GitHubBrowserOverlay passes titleId and renders matching h2", () => {
    const src = readFile(ORGANISMS_DIR, "GitHubBrowserOverlay.tsx");
    expect(src).toContain('titleId="github-browser-title"');
    expect(src).toContain('id="github-browser-title"');
  });

  test("DocumentReaderModal passes titleId and renders matching h2", () => {
    const src = readFile(ORGANISMS_DIR, "DocumentReaderModal.tsx");
    expect(src).toContain('titleId="doc-reader-title"');
    expect(src).toContain('id="doc-reader-title"');
  });

  test("ProjectPage task detail passes titleId and renders matching h2", () => {
    const src = readFile(PAGES_DIR, "ProjectPage.tsx");
    expect(src).toContain('titleId="task-detail-title"');
    expect(src).toContain('id="task-detail-title"');
  });
});

// ---------------------------------------------------------------------------
// 3. Shortcut suppression
// ---------------------------------------------------------------------------

describe("Consumer shortcut suppression", () => {
  test("CreateEntityOverlay calls useShortcutSuppression", () => {
    const src = readFile(ORGANISMS_DIR, "CreateEntityOverlay.tsx");
    expect(src).toContain("useShortcutSuppression(true)");
  });

  test("DocumentReaderModal calls useShortcutSuppression", () => {
    const src = readFile(ORGANISMS_DIR, "DocumentReaderModal.tsx");
    expect(src).toContain("useShortcutSuppression(true)");
  });

  test("GitHubBrowserOverlay calls useShortcutSuppression", () => {
    const src = readFile(ORGANISMS_DIR, "GitHubBrowserOverlay.tsx");
    expect(src).toContain("useShortcutSuppression(true)");
  });

  test("ShortcutHelpOverlay does NOT suppress shortcuts (intentional)", () => {
    const src = readFile(ORGANISMS_DIR, "ShortcutHelpOverlay.tsx");
    expect(src).not.toContain("useShortcutSuppression");
  });

  test("ProjectPage task detail calls useShortcutSuppression", () => {
    const src = readFile(PAGES_DIR, "ProjectPage.tsx");
    expect(src).toContain("useShortcutSuppression");
  });
});

// ---------------------------------------------------------------------------
// 4. Consumers import ModalShell from library
// ---------------------------------------------------------------------------

describe("Consumers import from library", () => {
  test("CreateEntityOverlay imports ModalShell from @4lt7ab/ui/ui", () => {
    const src = readFile(ORGANISMS_DIR, "CreateEntityOverlay.tsx");
    expect(src).toContain('from "@4lt7ab/ui/ui"');
    expect(src).toContain("ModalShell");
  });

  test("DocumentReaderModal imports ModalShell from @4lt7ab/ui/ui", () => {
    const src = readFile(ORGANISMS_DIR, "DocumentReaderModal.tsx");
    expect(src).toContain('from "@4lt7ab/ui/ui"');
    expect(src).toContain("ModalShell");
  });

  test("ShortcutHelpOverlay imports ModalShell from @4lt7ab/ui/ui", () => {
    const src = readFile(ORGANISMS_DIR, "ShortcutHelpOverlay.tsx");
    expect(src).toContain('from "@4lt7ab/ui/ui"');
    expect(src).toContain("ModalShell");
  });

  test("GitHubBrowserOverlay imports ModalShell from @4lt7ab/ui/ui", () => {
    const src = readFile(ORGANISMS_DIR, "GitHubBrowserOverlay.tsx");
    expect(src).toContain('from "@4lt7ab/ui/ui"');
    expect(src).toContain("ModalShell");
  });

  test("ProjectPage imports ModalShell from @4lt7ab/ui/ui", () => {
    const src = readFile(PAGES_DIR, "ProjectPage.tsx");
    expect(src).toContain('from "@4lt7ab/ui/ui"');
    expect(src).toContain("ModalShell");
  });
});

// ---------------------------------------------------------------------------
// 5. useFocusTrap hook still exists (used by library)
// ---------------------------------------------------------------------------

describe("useFocusTrap hook", () => {
  test("hook file exists and defines focus trap logic", () => {
    const src = readFile(HOOKS_DIR, "useFocusTrap.ts");
    expect(src).toContain("a[href]");
    expect(src).toContain("button:not([disabled])");
  });

  test("is exported from hooks index", () => {
    const index = readFile(HOOKS_DIR, "index.ts");
    expect(index).toContain('export { useFocusTrap } from "./useFocusTrap"');
  });
});
