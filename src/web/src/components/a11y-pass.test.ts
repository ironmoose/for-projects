/**
 * Tests verifying Phase 4b accessibility pass:
 * 1. aria-label on all IconButton instances (except gallery demo)
 * 2. aria-expanded on ExpandableCard
 * 3. Semantic HTML landmarks (<nav>, <main>)
 * 4. Focus rings on form fields via useFieldFocusStyles
 * 5. Keyboard navigation on table rows and document cards
 * 6. aria-pressed on toggle controls
 * 7. Toast aria-live region
 * 8. Skip navigation link
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";

const WEB_SRC = join(import.meta.dir, "..");
const ATOMS_DIR = join(import.meta.dir, "atoms");
const MOLECULES_DIR = join(import.meta.dir, "molecules");
const ORGANISMS_DIR = join(import.meta.dir, "organisms");
const PAGES_DIR = join(import.meta.dir, "..", "pages");

function readFile(path: string): string {
  return readFileSync(path, "utf-8");
}

// ---------------------------------------------------------------------------
// 1. aria-label on IconButton instances
// ---------------------------------------------------------------------------

describe("IconButton aria-labels", () => {
  const filesWithIconButtons = [
    { path: join(PAGES_DIR, "DashboardPage.tsx"), name: "DashboardPage" },
    { path: join(PAGES_DIR, "ProjectPage.tsx"), name: "ProjectPage" },
    { path: join(ORGANISMS_DIR, "TaskTable.tsx"), name: "TaskTable" },
    { path: join(ORGANISMS_DIR, "DocumentTable.tsx"), name: "DocumentTable" },
    { path: join(ORGANISMS_DIR, "DocumentReferencePicker.tsx"), name: "DocumentReferencePicker" },
    { path: join(ORGANISMS_DIR, "DocumentReaderModal.tsx"), name: "DocumentReaderModal" },
    { path: join(ORGANISMS_DIR, "ShortcutHelpOverlay.tsx"), name: "ShortcutHelpOverlay" },
    { path: join(MOLECULES_DIR, "DependencyChip.tsx"), name: "DependencyChip" },
    { path: join(MOLECULES_DIR, "DocumentReferenceCard.tsx"), name: "DocumentReferenceCard" },
    { path: join(MOLECULES_DIR, "DocumentSearchBar.tsx"), name: "DocumentSearchBar" },
    { path: join(ORGANISMS_DIR, "ProjectDocumentTable.tsx"), name: "ProjectDocumentTable" },
  ];

  for (const { path, name } of filesWithIconButtons) {
    test(`${name}: every <IconButton has aria-label`, () => {
      const src = readFile(path);
      // Find all <IconButton occurrences and verify each has aria-label
      const iconButtonRegex = /<IconButton[\s\S]*?\/>/g;
      const matches = src.match(iconButtonRegex) ?? [];
      expect(matches.length).toBeGreaterThan(0);
      for (const match of matches) {
        expect(match).toContain("aria-label");
      }
    });
  }
});

// ---------------------------------------------------------------------------
// 2. ExpandableCard — now provided by @4lt7ab/ui (no local file to test)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 3. Semantic HTML landmarks
// ---------------------------------------------------------------------------

describe("Semantic HTML landmarks", () => {
  const appSrc = readFile(join(WEB_SRC, "App.tsx"));
  const topBarSrc = readFile(join(ORGANISMS_DIR, "TopBar.tsx"));

  test("App.tsx contains <main> element", () => {
    expect(appSrc).toContain("<main");
  });

  test("App.tsx main has id='main-content'", () => {
    expect(appSrc).toContain('id="main-content"');
  });

  test("TopBar uses <nav> element", () => {
    expect(topBarSrc).toContain("<nav");
  });

  test("TopBar uses <header> element", () => {
    expect(topBarSrc).toContain("<header");
  });
});

// ---------------------------------------------------------------------------
// 4. Focus rings on form fields
// ---------------------------------------------------------------------------

describe("Form field focus rings", () => {
  const fieldUtilsSrc = readFile(join(ATOMS_DIR, "fieldUtils.tsx"));

  test("fieldUtils exports useFieldFocusStyles", () => {
    expect(fieldUtilsSrc).toContain("export function useFieldFocusStyles");
  });

  test("useFieldFocusStyles injects :focus-visible styles", () => {
    expect(fieldUtilsSrc).toContain(":focus-visible");
    expect(fieldUtilsSrc).toContain("--focus-ring-color");
  });

  const fieldComponents = [
    { path: join(ATOMS_DIR, "Input.tsx"), name: "Input" },
  ];

  for (const { path, name } of fieldComponents) {
    test(`${name} imports useFieldFocusStyles`, () => {
      const src = readFile(path);
      expect(src).toContain("useFieldFocusStyles");
    });

    test(`${name} calls useFieldFocusStyles()`, () => {
      const src = readFile(path);
      expect(src).toContain("useFieldFocusStyles()");
    });

    test(`${name} applies tfp-field className`, () => {
      const src = readFile(path);
      expect(src).toContain('className="tfp-field"');
    });
  }
});

// ---------------------------------------------------------------------------
// 5. Table keyboard navigation
// ---------------------------------------------------------------------------

describe("Table keyboard navigation", () => {
  test("TaskTable rows have tabIndex={0}", () => {
    const src = readFile(join(ORGANISMS_DIR, "TaskTable.tsx"));
    expect(src).toContain("tabIndex={0}");
  });

  test("TaskTable rows have onKeyDown for Enter", () => {
    const src = readFile(join(ORGANISMS_DIR, "TaskTable.tsx"));
    // Verify the task row section has keyboard handler
    expect(src).toMatch(/className="tfp-task-row"[\s\S]*?onKeyDown/);
  });

  test("DocumentTable cards have tabIndex={0}", () => {
    const src = readFile(join(ORGANISMS_DIR, "DocumentTable.tsx"));
    // The card should have tabIndex
    expect(src).toMatch(/className={cardClass}[\s\S]*?tabIndex={0}/);
  });

  test("DocumentTable cards have onKeyDown for Enter", () => {
    const src = readFile(join(ORGANISMS_DIR, "DocumentTable.tsx"));
    expect(src).toMatch(/className={cardClass}[\s\S]*?onKeyDown/);
  });
});

// ---------------------------------------------------------------------------
// 6. aria-pressed on toggle controls
// ---------------------------------------------------------------------------

describe("aria-pressed on toggles", () => {
  test("SearchToggle keyword button has aria-pressed", () => {
    const src = readFile(join(MOLECULES_DIR, "SearchToggle.tsx"));
    expect(src).toContain('aria-pressed={!semantic}');
  });

  test("SearchToggle semantic button has aria-pressed", () => {
    const src = readFile(join(MOLECULES_DIR, "SearchToggle.tsx"));
    expect(src).toContain('aria-pressed={semantic}');
  });

  test("DocumentSearchBar favorite toggle has aria-pressed", () => {
    const src = readFile(join(MOLECULES_DIR, "DocumentSearchBar.tsx"));
    expect(src).toContain("aria-pressed={favorite}");
  });

  test("TagPicker buttons have aria-pressed", () => {
    const src = readFile(join(MOLECULES_DIR, "TagPicker.tsx"));
    expect(src).toContain("aria-pressed=");
  });
});

// ---------------------------------------------------------------------------
// 7. Toast aria-live region
// ---------------------------------------------------------------------------

describe("Toast accessibility", () => {
  const src = readFile(join(import.meta.dir, "Toast.tsx"));

  test("ToastContainer has aria-live='polite'", () => {
    expect(src).toContain('aria-live="polite"');
  });

  test("ToastContainer has role='status'", () => {
    expect(src).toContain('role="status"');
  });
});

// ---------------------------------------------------------------------------
// 8. Skip navigation link
// ---------------------------------------------------------------------------

describe("Skip navigation link", () => {
  const src = readFile(join(WEB_SRC, "App.tsx"));

  test("App.tsx contains skip link targeting main-content", () => {
    expect(src).toContain('href="#main-content"');
  });

  test("Skip link has descriptive text", () => {
    expect(src).toContain("Skip to main content");
  });
});

// ---------------------------------------------------------------------------
// 9. DocumentTable FolderGroup has aria-expanded
// ---------------------------------------------------------------------------

describe("FolderGroup aria-expanded", () => {
  const src = readFile(join(ORGANISMS_DIR, "DocumentTable.tsx"));

  test("FolderGroup collapse button has aria-expanded", () => {
    expect(src).toContain("aria-expanded={!collapsed}");
  });
});
