/**
 * Tests verifying the migration from useState-based hover tracking
 * to useInjectStyles CSS pseudo-classes.
 *
 * These tests verify:
 * 1. Migrated components import useInjectStyles from @4lt7ab/ui/core
 * 2. useState for hover tracking is removed
 * 3. CSS class names (tfp-*) are applied
 * 4. onMouseEnter/onMouseLeave hover handlers are removed
 * 5. useInjectStyles is called with appropriate CSS
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";

const ATOMS_DIR = join(import.meta.dir);
const MOLECULES_DIR = join(import.meta.dir, "..", "molecules");
const ORGANISMS_DIR = join(import.meta.dir, "..", "organisms");

function readComponent(dir: string, name: string): string {
  return readFileSync(join(dir, name), "utf-8");
}

// ---------------------------------------------------------------------------
// 1. Verify useInjectStyles import
// ---------------------------------------------------------------------------

describe("useInjectStyles imports", () => {
  const atomFiles = [
    { dir: ATOMS_DIR, file: "IconButton.tsx" },
  ];

  const moleculeFiles = [
    { dir: MOLECULES_DIR, file: "Card.tsx" },
    { dir: MOLECULES_DIR, file: "DependencyChip.tsx" },
    { dir: MOLECULES_DIR, file: "DocumentReferenceCard.tsx" },
  ];

  const organismFiles = [
    { dir: ORGANISMS_DIR, file: "TopBar.tsx" },
    { dir: ORGANISMS_DIR, file: "TaskTable.tsx" },
    { dir: ORGANISMS_DIR, file: "DocumentTable.tsx" },
  ];

  const allFiles = [...atomFiles, ...moleculeFiles, ...organismFiles];

  for (const { dir, file } of allFiles) {
    test(`${file} imports useInjectStyles from @4lt7ab/ui/core`, () => {
      const src = readComponent(dir, file);
      expect(src).toContain("useInjectStyles");
      expect(src).toContain("@4lt7ab/ui/core");
    });
  }
});

// ---------------------------------------------------------------------------
// 2. Verify useState for hover is removed from migrated components
// ---------------------------------------------------------------------------

describe("useState hover tracking removed", () => {
  const migratedComponents = [
    { dir: MOLECULES_DIR, file: "Card.tsx", statePattern: "useState(false)" },
    { dir: MOLECULES_DIR, file: "DependencyChip.tsx", statePattern: "useState(false)" },
    { dir: MOLECULES_DIR, file: "DocumentReferenceCard.tsx", statePattern: "useState(false)" },
  ];

  for (const { dir, file, statePattern } of migratedComponents) {
    test(`${file} does not use ${statePattern} for hover`, () => {
      const src = readComponent(dir, file);
      // These components should not have useState for hover tracking
      // Button had useState(false) for hovered, now removed
      // Card had useState(false) for hovered, now removed
      // etc.
      expect(src).not.toContain("setHovered");
    });
  }

  test("DocumentTable.tsx DocumentCard does not use hovered state", () => {
    const src = readComponent(ORGANISMS_DIR, "DocumentTable.tsx");
    // The DocumentCard function should not have setHovered
    // Note: FolderGroup still uses useState for 'collapsed' which is fine
    expect(src).not.toContain("setHovered");
  });
});

// ---------------------------------------------------------------------------
// 3. Verify CSS class names are applied
// ---------------------------------------------------------------------------

describe("CSS class names applied", () => {
  test("IconButton.tsx applies tfp-icon-btn class", () => {
    const src = readComponent(ATOMS_DIR, "IconButton.tsx");
    expect(src).toContain('className="tfp-icon-btn"');
  });

  test("Card.tsx applies conditional tfp-card / tfp-card-hoverable class", () => {
    const src = readComponent(MOLECULES_DIR, "Card.tsx");
    expect(src).toContain("tfp-card-hoverable");
    expect(src).toContain("tfp-card");
  });

  test("DependencyChip.tsx applies tfp-dep-chip class", () => {
    const src = readComponent(MOLECULES_DIR, "DependencyChip.tsx");
    expect(src).toContain('className="tfp-dep-chip"');
  });

  test("DocumentReferenceCard.tsx applies tfp-doc-ref class", () => {
    const src = readComponent(MOLECULES_DIR, "DocumentReferenceCard.tsx");
    expect(src).toContain("tfp-doc-ref");
    expect(src).toContain("tfp-doc-ref-detach");
  });

  test("TopBar.tsx uses tfp-topbar-nav-btn class", () => {
    const src = readComponent(ORGANISMS_DIR, "TopBar.tsx");
    expect(src).toContain("tfp-topbar-nav-btn");
    // Old non-namespaced class should be gone
    expect(src).not.toContain('"topbar-nav-btn"');
  });

  test("TaskTable.tsx applies tfp-task-row class", () => {
    const src = readComponent(ORGANISMS_DIR, "TaskTable.tsx");
    expect(src).toContain('className="tfp-task-row"');
  });

  test("DocumentTable.tsx applies tfp-doc-card class", () => {
    const src = readComponent(ORGANISMS_DIR, "DocumentTable.tsx");
    expect(src).toContain("tfp-doc-card");
    expect(src).toContain("tfp-doc-card-actions");
  });
});

// ---------------------------------------------------------------------------
// 4. Verify onMouseEnter/onMouseLeave hover handlers removed
// ---------------------------------------------------------------------------

describe("onMouseEnter/onMouseLeave handlers removed", () => {
  test("Card.tsx has no onMouseEnter/onMouseLeave", () => {
    const src = readComponent(MOLECULES_DIR, "Card.tsx");
    expect(src).not.toContain("onMouseEnter");
    expect(src).not.toContain("onMouseLeave");
  });

  test("DependencyChip.tsx has no onMouseEnter/onMouseLeave", () => {
    const src = readComponent(MOLECULES_DIR, "DependencyChip.tsx");
    expect(src).not.toContain("onMouseEnter");
    expect(src).not.toContain("onMouseLeave");
  });

  test("DocumentReferenceCard.tsx has no onMouseEnter/onMouseLeave", () => {
    const src = readComponent(MOLECULES_DIR, "DocumentReferenceCard.tsx");
    expect(src).not.toContain("onMouseEnter");
    expect(src).not.toContain("onMouseLeave");
  });

  test("DocumentTable.tsx DocumentCard has no onMouseEnter/onMouseLeave", () => {
    const src = readComponent(ORGANISMS_DIR, "DocumentTable.tsx");
    expect(src).not.toContain("onMouseEnter");
    expect(src).not.toContain("onMouseLeave");
  });
});

// ---------------------------------------------------------------------------
// 5. Verify useInjectStyles is called with correct IDs
// ---------------------------------------------------------------------------

describe("useInjectStyles called with correct IDs", () => {
  test("IconButton.tsx injects styles with 'tfp-icon-btn' ID", () => {
    const src = readComponent(ATOMS_DIR, "IconButton.tsx");
    expect(src).toContain('useInjectStyles("tfp-icon-btn"');
  });

  test("Card.tsx injects styles with 'tfp-card' ID", () => {
    const src = readComponent(MOLECULES_DIR, "Card.tsx");
    expect(src).toContain('useInjectStyles("tfp-card"');
  });

  test("DependencyChip.tsx injects styles with 'tfp-dep-chip' ID", () => {
    const src = readComponent(MOLECULES_DIR, "DependencyChip.tsx");
    expect(src).toContain('useInjectStyles("tfp-dep-chip"');
  });

  test("DocumentReferenceCard.tsx injects styles with 'tfp-doc-ref' ID", () => {
    const src = readComponent(MOLECULES_DIR, "DocumentReferenceCard.tsx");
    expect(src).toContain('useInjectStyles("tfp-doc-ref"');
  });

  test("TopBar.tsx injects styles with 'tfp-topbar' ID", () => {
    const src = readComponent(ORGANISMS_DIR, "TopBar.tsx");
    expect(src).toContain('useInjectStyles("tfp-topbar"');
  });

  test("TaskTable.tsx injects styles with 'tfp-task-row' ID", () => {
    const src = readComponent(ORGANISMS_DIR, "TaskTable.tsx");
    expect(src).toContain('useInjectStyles("tfp-task-row"');
  });

  test("DocumentTable.tsx injects styles with 'tfp-doc-card' ID", () => {
    const src = readComponent(ORGANISMS_DIR, "DocumentTable.tsx");
    expect(src).toContain('useInjectStyles("tfp-doc-card"');
  });
});

// ---------------------------------------------------------------------------
// 6. Verify focus-visible styles are included
// ---------------------------------------------------------------------------

describe("focus-visible styles included", () => {
  const componentsWithFocus = [
    { dir: ATOMS_DIR, file: "IconButton.tsx", id: "tfp-icon-btn" },
    { dir: MOLECULES_DIR, file: "Card.tsx", id: "tfp-card" },
    { dir: MOLECULES_DIR, file: "DependencyChip.tsx", id: "tfp-dep-chip" },
    { dir: MOLECULES_DIR, file: "DocumentReferenceCard.tsx", id: "tfp-doc-ref" },
    { dir: ORGANISMS_DIR, file: "TopBar.tsx", id: "tfp-topbar" },
    { dir: ORGANISMS_DIR, file: "TaskTable.tsx", id: "tfp-task-row" },
    { dir: ORGANISMS_DIR, file: "DocumentTable.tsx", id: "tfp-doc-card" },
  ];

  for (const { dir, file } of componentsWithFocus) {
    test(`${file} includes :focus-visible styles`, () => {
      const src = readComponent(dir, file);
      expect(src).toContain(":focus-visible");
      expect(src).toContain("var(--focus-ring-color)");
    });
  }
});

// ---------------------------------------------------------------------------
// 7. Verify TopBar no longer uses manual style injection
// ---------------------------------------------------------------------------

describe("TopBar manual injection removed", () => {
  test("TopBar.tsx does not use manual DOM style injection", () => {
    const src = readComponent(ORGANISMS_DIR, "TopBar.tsx");
    expect(src).not.toContain("topBarStylesInjected");
    expect(src).not.toContain("injectTopBarStyles");
    expect(src).not.toContain("document.createElement");
    expect(src).not.toContain("document.head.appendChild");
  });
});

// ---------------------------------------------------------------------------
// 8. Verify synth theme hover handled via CSS selectors
// ---------------------------------------------------------------------------

describe("Synth theme hover via CSS selectors", () => {
  test("Card.tsx uses [data-synth] selector for synth hover glow", () => {
    const src = readComponent(MOLECULES_DIR, "Card.tsx");
    expect(src).toContain("[data-synth]");
    expect(src).toContain("var(--synth-glow)");
  });

  test("DocumentTable.tsx uses [data-synth] selector for synth hover glow", () => {
    const src = readComponent(ORGANISMS_DIR, "DocumentTable.tsx");
    expect(src).toContain("[data-synth]");
    expect(src).toContain("var(--synth-glow)");
  });
});
