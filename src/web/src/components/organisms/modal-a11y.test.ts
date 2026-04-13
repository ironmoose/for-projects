/**
 * Tests verifying ModalShell accessibility: focus trap, ARIA attributes,
 * focus restoration, and aria-labelledby integration.
 *
 * These tests verify:
 * 1. ModalShell renders with role="dialog" and aria-modal="true"
 * 2. aria-labelledby is set when title prop or ariaLabelledBy prop is provided
 * 3. useFocusTrap hook is wired into the modal panel
 * 4. Focus restoration logic exists in useFocusTrap
 * 5. Escape key handler is present
 * 6. Consumers pass ariaLabelledBy or title for accessible labelling
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";

const ORGANISMS_DIR = join(import.meta.dir);
const HOOKS_DIR = join(import.meta.dir, "..", "..", "hooks");
const PAGES_DIR = join(import.meta.dir, "..", "..", "pages");
const GALLERY_DIR = join(import.meta.dir, "..", "..", "gallery");

function readFile(dir: string, name: string): string {
  return readFileSync(join(dir, name), "utf-8");
}

// ---------------------------------------------------------------------------
// 1. ModalShell ARIA attributes
// ---------------------------------------------------------------------------

describe("ModalShell ARIA attributes", () => {
  const src = readFile(ORGANISMS_DIR, "ModalShell.tsx");

  test("renders role='dialog'", () => {
    expect(src).toContain('role="dialog"');
  });

  test("renders aria-modal='true'", () => {
    expect(src).toContain('aria-modal="true"');
  });

  test("sets aria-labelledby on the dialog panel", () => {
    expect(src).toContain("aria-labelledby={resolvedLabelledBy}");
  });

  test("generates a unique title ID via useId()", () => {
    expect(src).toContain("useId()");
  });

  test("resolves ariaLabelledBy prop over auto-generated title ID", () => {
    expect(src).toContain("ariaLabelledBy ?? (title ? titleId : undefined)");
  });
});

// ---------------------------------------------------------------------------
// 2. ModalShell title prop
// ---------------------------------------------------------------------------

describe("ModalShell title prop", () => {
  const src = readFile(ORGANISMS_DIR, "ModalShell.tsx");

  test("accepts optional title prop in interface", () => {
    expect(src).toMatch(/title\?: string/);
  });

  test("renders h2 with id={titleId} when title is provided", () => {
    expect(src).toContain("id={titleId}");
  });

  test("conditionally renders title h2", () => {
    expect(src).toContain("{title && (");
  });
});

// ---------------------------------------------------------------------------
// 3. Focus trap integration
// ---------------------------------------------------------------------------

describe("ModalShell focus trap", () => {
  const src = readFile(ORGANISMS_DIR, "ModalShell.tsx");

  test("imports useFocusTrap hook", () => {
    expect(src).toContain('import { useFocusTrap } from "../../hooks/useFocusTrap"');
  });

  test("creates a ref for the panel element", () => {
    expect(src).toContain("useRef<HTMLDivElement>(null)");
  });

  test("passes panelRef to useFocusTrap", () => {
    expect(src).toContain("useFocusTrap(panelRef)");
  });

  test("attaches ref to the dialog panel div", () => {
    expect(src).toContain("ref={panelRef}");
  });
});

// ---------------------------------------------------------------------------
// 4. useFocusTrap hook implementation
// ---------------------------------------------------------------------------

describe("useFocusTrap hook", () => {
  const src = readFile(HOOKS_DIR, "useFocusTrap.ts");

  test("defines FOCUSABLE_SELECTOR with standard focusable elements", () => {
    expect(src).toContain("a[href]");
    expect(src).toContain("button:not([disabled])");
    expect(src).toContain("input:not([disabled])");
    expect(src).toContain("select:not([disabled])");
    expect(src).toContain("textarea:not([disabled])");
    expect(src).toContain("[tabindex]:not([tabindex='-1'])");
  });

  test("saves document.activeElement as trigger on mount", () => {
    expect(src).toContain("triggerRef.current = document.activeElement");
  });

  test("auto-focuses first focusable element on mount", () => {
    expect(src).toContain("focusables[0].focus()");
  });

  test("handles Tab key to cycle focus forward", () => {
    expect(src).toContain('e.key !== "Tab"');
    expect(src).toContain("document.activeElement === last");
    expect(src).toContain("first.focus()");
  });

  test("handles Shift+Tab to cycle focus backward", () => {
    expect(src).toContain("e.shiftKey");
    expect(src).toContain("document.activeElement === first");
    expect(src).toContain("last.focus()");
  });

  test("restores focus to trigger element on unmount", () => {
    expect(src).toContain("trigger.focus()");
  });

  test("is exported from hooks index", () => {
    const index = readFile(HOOKS_DIR, "index.ts");
    expect(index).toContain('export { useFocusTrap } from "./useFocusTrap"');
  });
});

// ---------------------------------------------------------------------------
// 5. Escape key handling
// ---------------------------------------------------------------------------

describe("ModalShell escape key", () => {
  const src = readFile(ORGANISMS_DIR, "ModalShell.tsx");

  test("listens for Escape keydown events", () => {
    expect(src).toContain('"Escape"');
    expect(src).toContain("keydown");
  });

  test("supports handleEscape prop to disable Escape handling", () => {
    expect(src).toContain("handleEscape = true");
    expect(src).toContain("if (!handleEscape) return");
  });
});

// ---------------------------------------------------------------------------
// 6. Consumer aria-labelledby integration
// ---------------------------------------------------------------------------

describe("Consumer a11y integration", () => {
  // ConfirmDialog test removed — component migrated to @4lt7ab/ui re-export

  test("CreateEntityOverlay passes title prop to ModalShell", () => {
    const src = readFile(ORGANISMS_DIR, "CreateEntityOverlay.tsx");
    expect(src).toContain("title={title}");
    // Should not render its own h2
    expect(src).not.toContain("<h2");
  });

  test("ShortcutHelpOverlay passes ariaLabelledBy and adds id to h2", () => {
    const src = readFile(ORGANISMS_DIR, "ShortcutHelpOverlay.tsx");
    expect(src).toContain('ariaLabelledBy="shortcut-help-title"');
    expect(src).toContain('id="shortcut-help-title"');
  });

  test("GitHubBrowserOverlay passes ariaLabelledBy and adds id to h2", () => {
    const src = readFile(ORGANISMS_DIR, "GitHubBrowserOverlay.tsx");
    expect(src).toContain('ariaLabelledBy="github-browser-title"');
    expect(src).toContain('id="github-browser-title"');
  });

  test("DocumentReaderModal passes ariaLabelledBy and adds id to h2", () => {
    const src = readFile(ORGANISMS_DIR, "DocumentReaderModal.tsx");
    expect(src).toContain('ariaLabelledBy="doc-reader-title"');
    expect(src).toContain('id="doc-reader-title"');
  });

  test("ProjectPage task detail passes ariaLabelledBy and adds id to h2", () => {
    const src = readFile(PAGES_DIR, "ProjectPage.tsx");
    expect(src).toContain('ariaLabelledBy="task-detail-title"');
    expect(src).toContain('id="task-detail-title"');
  });

  test("Gallery demo uses title prop", () => {
    const src = readFile(GALLERY_DIR, "registerAll.tsx");
    expect(src).toContain('title="Modal Title"');
  });
});
