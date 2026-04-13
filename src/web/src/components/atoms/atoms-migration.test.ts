/**
 * Tests verifying atom and molecule components use library semantic tokens
 * after migration from the hand-rolled theme system.
 *
 * These tests verify:
 * 1. Migrated components import semantic tokens from @4lt7ab/ui/core
 * 2. Token references use CSS custom property var(--...) format
 * 3. Components that no longer need useTheme() don't import it
 * 4. baseFieldStyle returns library tokens for mapped properties
 * 5. Alpha-blending helper produces valid color-mix expressions
 */
import { describe, expect, test } from "bun:test";
import { semantic as t } from "@4lt7ab/ui/core";
import { readFileSync } from "fs";
import { join } from "path";

const ATOMS_DIR = join(import.meta.dir);
const MOLECULES_DIR = join(import.meta.dir, "..", "molecules");
const ORGANISMS_DIR = join(import.meta.dir, "..", "organisms");

function readComponent(dir: string, name: string): string {
  return readFileSync(join(dir, name), "utf-8");
}

// ---------------------------------------------------------------------------
// 1. Verify semantic token import presence
// ---------------------------------------------------------------------------

describe("Library semantic token imports", () => {
  const atomsWithSemanticImport = [
    "fieldUtils.tsx",
    "Input.tsx",
    "Button.tsx",
    "Badge.tsx",
    "IconButton.tsx",
    "MetaValue.tsx",
    "SectionLabel.tsx",
    "StatusDot.tsx",
    "ActivityIndicator.tsx",
    "ReferenceTypeBadge.tsx",
  ];

  for (const file of atomsWithSemanticImport) {
    test(`${file} imports semantic tokens from @4lt7ab/ui/core`, () => {
      const src = readComponent(ATOMS_DIR, file);
      expect(src).toMatch(/import \{[^}]*semantic as t[^}]*\} from "@4lt7ab\/ui\/core"/);
    });
  }

  const moleculesWithSemanticImport = [
    "Card.tsx",
    "ExpandableCard.tsx",
    "EmptyState.tsx",
    "Pagination.tsx",
    "PageHeader.tsx",
    "PresenceCharm.tsx",
    "DocumentSearchBar.tsx",
    "Stack.tsx",
    "FolderInput.tsx",
  ];

  for (const file of moleculesWithSemanticImport) {
    test(`molecules/${file} imports semantic tokens from @4lt7ab/ui/core`, () => {
      const src = readComponent(MOLECULES_DIR, file);
      expect(src).toMatch(/import \{[^}]*semantic as t[^}]*\} from "@4lt7ab\/ui\/core"/);
    });
  }
});

// ---------------------------------------------------------------------------
// 2. Verify components that no longer need useTheme don't import it
// ---------------------------------------------------------------------------

describe("Components fully migrated off useTheme", () => {
  const fullyMigrated = [
    "IconButton.tsx",
    "MetaValue.tsx",
    "Skeleton.tsx",
    "SectionLabel.tsx",
    "ReferenceTypeBadge.tsx",
    "StatusDot.tsx",
    "ActivityIndicator.tsx",
  ];

  for (const file of fullyMigrated) {
    test(`${file} does not import useTheme`, () => {
      const src = readComponent(ATOMS_DIR, file);
      expect(src).not.toContain("useTheme");
    });
  }

  test("molecules/EmptyState.tsx does not import useTheme", () => {
    const src = readComponent(MOLECULES_DIR, "EmptyState.tsx");
    expect(src).not.toContain("useTheme");
  });

  test("molecules/PageHeader.tsx does not import useTheme", () => {
    const src = readComponent(MOLECULES_DIR, "PageHeader.tsx");
    expect(src).not.toContain("useTheme");
  });

  test("molecules/PresenceCharm.tsx does not import useTheme", () => {
    const src = readComponent(MOLECULES_DIR, "PresenceCharm.tsx");
    expect(src).not.toContain("useTheme");
  });

  test("molecules/DocumentSearchBar.tsx does not import useTheme", () => {
    const src = readComponent(MOLECULES_DIR, "DocumentSearchBar.tsx");
    expect(src).not.toContain("useTheme");
  });

  test("molecules/ExpandableCard.tsx does not import useTheme", () => {
    const src = readComponent(MOLECULES_DIR, "ExpandableCard.tsx");
    expect(src).not.toContain("useTheme");
  });

  test("molecules/Stack.tsx does not import useTheme", () => {
    const src = readComponent(MOLECULES_DIR, "Stack.tsx");
    expect(src).not.toContain("useTheme");
  });

  test("molecules/FolderInput.tsx does not import useTheme", () => {
    const src = readComponent(MOLECULES_DIR, "FolderInput.tsx");
    expect(src).not.toContain("useTheme");
  });
});

// ---------------------------------------------------------------------------
// 3. Verify no old theme.color.X direct references in migrated components
//    (except for unmapped tokens: borderSubtle, tertiary, primaryContainer, etc.)
// ---------------------------------------------------------------------------

describe("Old theme.color.* references removed for mapped tokens", () => {
  const mappedTokenPatterns = [
    "theme.color.text,",       // should be t.colorText
    "theme.color.textMuted,",  // should be t.colorTextMuted
    "theme.color.surface,",    // should be t.colorSurface
    "theme.color.primary,",    // should be t.colorActionPrimary (except in glow contexts)
    "theme.color.onPrimary",   // should be t.colorTextInverse
  ];

  const fullyMigratedAtoms = [
    "IconButton.tsx",
    "MetaValue.tsx",
  ];

  for (const file of fullyMigratedAtoms) {
    test(`${file} has no mapped theme.color.* references`, () => {
      const src = readComponent(ATOMS_DIR, file);
      for (const pattern of mappedTokenPatterns) {
        expect(src).not.toContain(pattern);
      }
    });
  }
});

// ---------------------------------------------------------------------------
// 4. Verify semantic token values are CSS var references
// ---------------------------------------------------------------------------

describe("Library semantic tokens are var(--...) references", () => {
  const tokenChecks: [string, string][] = [
    ["colorText", t.colorText],
    ["colorTextMuted", t.colorTextMuted],
    ["colorTextSecondary", t.colorTextSecondary],
    ["colorSurface", t.colorSurface],
    ["colorSurfaceRaised", t.colorSurfaceRaised],
    ["colorSurfacePanel", t.colorSurfacePanel],
    ["colorBorder", t.colorBorder],
    ["colorActionPrimary", t.colorActionPrimary],
    ["colorActionDestructive", t.colorActionDestructive],
    ["colorSuccess", t.colorSuccess],
    ["colorWarning", t.colorWarning],
    ["colorTextInverse", t.colorTextInverse],
    ["radiusSm", t.radiusSm],
    ["radiusMd", t.radiusMd],
    ["radiusLg", t.radiusLg],
    ["radiusFull", t.radiusFull],
    ["shadowSm", t.shadowSm],
    ["shadowMd", t.shadowMd],
    ["shadowLg", t.shadowLg],
    ["fontSans", t.fontSans],
    ["fontMono", t.fontMono],
    ["fontSizeXs", t.fontSizeXs],
    ["fontSizeSm", t.fontSizeSm],
  ];

  for (const [name, value] of tokenChecks) {
    test(`${name} is a CSS var reference`, () => {
      expect(value).toMatch(/^var\(--/);
    });
  }
});

// ---------------------------------------------------------------------------
// 5. Verify baseFieldStyle uses library tokens
// ---------------------------------------------------------------------------

describe("baseFieldStyle uses library tokens", () => {
  test("source uses t.radiusLg, t.fontSans, t.fontSizeSm, t.colorSurfaceRaised, t.colorText", () => {
    const src = readComponent(ATOMS_DIR, "fieldUtils.tsx");
    expect(src).toContain("t.radiusLg");
    expect(src).toContain("t.fontSans");
    expect(src).toContain("t.fontSizeSm");
    expect(src).toContain("t.colorSurfaceRaised");
    expect(src).toContain("t.colorText");
  });

  test("baseFieldStyle takes no theme parameter", () => {
    const src = readComponent(ATOMS_DIR, "fieldUtils.tsx");
    expect(src).toMatch(/export function baseFieldStyle\(\)/);
    expect(src).not.toContain("baseFieldStyle(theme");
  });

  test("fieldUtils.tsx does not import from ../theme/theme", () => {
    const src = readComponent(ATOMS_DIR, "fieldUtils.tsx");
    expect(src).not.toContain('from "../theme/theme"');
  });

  test("fieldUtils.tsx uses color-mix for borderSubtle replacement", () => {
    const src = readComponent(ATOMS_DIR, "fieldUtils.tsx");
    expect(src).toContain("color-mix(in srgb,");
    expect(src).toContain("t.colorBorder");
  });

  test("FieldWrapper label uses library tokens", () => {
    const src = readComponent(ATOMS_DIR, "fieldUtils.tsx");
    expect(src).toContain("t.fontSizeXs");
    expect(src).toContain("t.colorTextSecondary");
    expect(src).toContain("t.fontSans");
  });
});

// ---------------------------------------------------------------------------
// 5b. Form atoms have no theme.color.* references
// ---------------------------------------------------------------------------

describe("Form atoms fully off theme.color.*", () => {
  const formAtoms = ["Button.tsx", "Input.tsx", "Select.tsx", "Textarea.tsx", "fieldUtils.tsx"];

  for (const file of formAtoms) {
    test(`${file} has no theme.color.* references`, () => {
      const src = readComponent(ATOMS_DIR, file);
      expect(src).not.toMatch(/theme\.color\./);
    });
  }
});

// ---------------------------------------------------------------------------
// 6. Verify alpha helper pattern in Badge and ActivityIndicator
// ---------------------------------------------------------------------------

describe("color-mix alpha helper", () => {
  test("Badge.tsx uses color-mix for alpha-blended colors", () => {
    const src = readComponent(ATOMS_DIR, "Badge.tsx");
    expect(src).toContain("color-mix(in srgb,");
    expect(src).toContain("function alpha(");
  });

  test("ActivityIndicator.tsx uses color-mix for alpha-blended colors", () => {
    const src = readComponent(ATOMS_DIR, "ActivityIndicator.tsx");
    expect(src).toContain("color-mix(in srgb,");
    expect(src).toContain("function alpha(");
  });

  test("Card.tsx uses color-mix for live variant", () => {
    const src = readComponent(MOLECULES_DIR, "Card.tsx");
    expect(src).toContain("color-mix(in srgb,");
    expect(src).toContain("function alpha(");
  });
});

// ---------------------------------------------------------------------------
// 7. Verify unmapped tokens still use compat useTheme
// ---------------------------------------------------------------------------

describe("Unmapped tokens still use compat useTheme", () => {
  test("Badge.tsx only uses theme.glow from compat (fully migrated otherwise)", () => {
    const src = readComponent(ATOMS_DIR, "Badge.tsx");
    expect(src).not.toContain("theme.color.");
    expect(src).not.toContain("theme.font.");
    expect(src).not.toContain("theme.spacing.");
    expect(src).not.toContain("theme.radius.");
    expect(src).toContain("theme.glow.");
  });

  test("StatusDot.tsx no longer uses theme.motion or theme.animation", () => {
    const src = readComponent(ATOMS_DIR, "StatusDot.tsx");
    expect(src).not.toContain("theme.motion.");
    expect(src).not.toContain("theme.animation.");
  });

  test("Card.tsx uses theme.glow for border/shadow effects (unmapped)", () => {
    const src = readComponent(MOLECULES_DIR, "Card.tsx");
    expect(src).toContain("theme.glow.");
  });

  test("Card.tsx has no theme.radius.* or theme.spacing.* references", () => {
    const src = readComponent(MOLECULES_DIR, "Card.tsx");
    expect(src).not.toMatch(/theme\.radius\./);
    expect(src).not.toMatch(/theme\.spacing\./);
  });

  test("ExpandableCard.tsx no longer uses theme.motion (hardcoded transitions)", () => {
    const src = readComponent(MOLECULES_DIR, "ExpandableCard.tsx");
    expect(src).not.toContain("theme.motion.");
  });
});

// ---------------------------------------------------------------------------
// 8. Synth theme decoupling — isSynth branches replaced by glow tokens
// ---------------------------------------------------------------------------

describe("Synth theme decoupled from component logic (Phase 4a)", () => {
  const decoupledComponents = [
    { dir: ATOMS_DIR, file: "Input.tsx" },
    { dir: ATOMS_DIR, file: "Select.tsx" },
    { dir: ATOMS_DIR, file: "Textarea.tsx" },
    { dir: ORGANISMS_DIR, file: "TaskTable.tsx" },
    { dir: ORGANISMS_DIR, file: "ModalShell.tsx" },
    { dir: MOLECULES_DIR, file: "SearchToggle.tsx" },
    { dir: MOLECULES_DIR, file: "tableUtils.ts" },
  ];

  for (const { dir, file } of decoupledComponents) {
    test(`${file} does not check isSynth or themeName === 'synth'`, () => {
      const src = readComponent(dir, file);
      expect(src).not.toContain("isSynth");
      expect(src).not.toContain("themeName === \"synth\"");
      expect(src).not.toContain("themeName === 'synth'");
    });
  }

  for (const { dir, file } of decoupledComponents) {
    test(`${file} does not import sg() from synthGlow`, () => {
      const src = readComponent(dir, file);
      expect(src).not.toContain("synthGlow");
    });
  }

  test("tableUtils functions take only theme parameter (no isSynth)", () => {
    const src = readComponent(MOLECULES_DIR, "tableUtils.ts");
    expect(src).toContain("function tableWrapperStyle(theme: Theme)");
    expect(src).toContain("function tableHeaderStyle(theme: Theme)");
    expect(src).not.toContain("isSynth: boolean");
  });

  test("Input.tsx uses theme.glow tokens for focus styles", () => {
    const src = readComponent(ATOMS_DIR, "Input.tsx");
    expect(src).toContain("theme.glow.borderStrong");
    expect(src).toContain("theme.glow.focusRing");
  });

  test("ModalShell.tsx uses theme.glow tokens for shadow/border", () => {
    const src = readComponent(ORGANISMS_DIR, "ModalShell.tsx");
    expect(src).toContain("theme.glow.shadowXl");
    expect(src).toContain("theme.glow.borderMedium");
    expect(src).toContain("theme.glow.dangerShadow");
    expect(src).toContain("theme.glow.dangerBorder");
  });

  test("TaskTable.tsx uses theme.glow tokens for dropdown/headers", () => {
    const src = readComponent(ORGANISMS_DIR, "TaskTable.tsx");
    expect(src).toContain("theme.glow.animated");
    expect(src).toContain("theme.glow.borderMedium");
    expect(src).toContain("theme.glow.accentColor");
  });

  test("lib-themes.ts documents the synth handling architecture", () => {
    const src = readFileSync(join(ATOMS_DIR, "..", "theme", "lib-themes.ts"), "utf-8");
    expect(src).toContain("Synth Theme Handling");
    expect(src).toContain("Glow token system");
    expect(src).toContain("data-synth attribute");
  });
});

// ---------------------------------------------------------------------------
// 9. Gallery sync — component variants must match gallery entries
// ---------------------------------------------------------------------------

describe("Gallery stays in sync with components", () => {
  const GALLERY_DIR = join(ATOMS_DIR, "..", "..", "gallery");

  test("Badge gallery variants match component BadgeVariant type", () => {
    const badgeSrc = readComponent(ATOMS_DIR, "Badge.tsx");
    // Extract variant strings from the type union
    const variantMatches = badgeSrc.match(/type BadgeVariant\s*=\s*([\s\S]*?);/);
    expect(variantMatches).not.toBeNull();
    const componentVariants = variantMatches![1]
      .match(/"([^"]+)"/g)!
      .map((s) => s.replace(/"/g, ""))
      .sort();

    const gallerySrc = readFileSync(join(GALLERY_DIR, "registerAll.tsx"), "utf-8");
    // Extract the Badge registration block's options array
    const badgeBlock = gallerySrc.match(
      /registerComponent\(\{[^}]*name:\s*"Badge"[\s\S]*?codeTemplate:[^}]*\}\);/
    );
    expect(badgeBlock).not.toBeNull();
    const optionsMatch = badgeBlock![0].match(/options:\s*\[([\s\S]*?)\]/);
    expect(optionsMatch).not.toBeNull();
    const galleryVariants = optionsMatch![1]
      .match(/"([^"]+)"/g)!
      .map((s) => s.replace(/"/g, ""))
      .sort();

    expect(galleryVariants).toEqual(componentVariants);
  });
});
