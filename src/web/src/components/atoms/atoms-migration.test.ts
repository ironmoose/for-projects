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
    "Skeleton.tsx",
    "MetaValue.tsx",
    "SectionLabel.tsx",
    "StatusDot.tsx",
    "ActivityIndicator.tsx",
    "ReferenceTypeBadge.tsx",
  ];

  for (const file of atomsWithSemanticImport) {
    test(`${file} imports semantic tokens from @4lt7ab/ui/core`, () => {
      const src = readComponent(ATOMS_DIR, file);
      expect(src).toContain('import { semantic as t } from "@4lt7ab/ui/core"');
    });
  }

  const moleculesWithSemanticImport = [
    "Card.tsx",
    "ExpandableCard.tsx",
    "EmptyState.tsx",
    "Pagination.tsx",
  ];

  for (const file of moleculesWithSemanticImport) {
    test(`molecules/${file} imports semantic tokens from @4lt7ab/ui/core`, () => {
      const src = readComponent(MOLECULES_DIR, file);
      expect(src).toContain('import { semantic as t } from "@4lt7ab/ui/core"');
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

  test("FieldWrapper label uses library tokens", () => {
    const src = readComponent(ATOMS_DIR, "fieldUtils.tsx");
    expect(src).toContain("t.fontSizeXs");
    expect(src).toContain("t.colorTextSecondary");
    expect(src).toContain("t.fontSans");
  });
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
  test("Badge.tsx uses theme.color.tertiary (unmapped)", () => {
    const src = readComponent(ATOMS_DIR, "Badge.tsx");
    expect(src).toContain("theme.color.tertiary");
  });

  test("Badge.tsx uses theme.font.size.xxs (no library equivalent)", () => {
    const src = readComponent(ATOMS_DIR, "Badge.tsx");
    expect(src).toContain("theme.font.size.xxs");
  });

  test("StatusDot.tsx uses theme.motion and theme.animation (unmapped)", () => {
    const src = readComponent(ATOMS_DIR, "StatusDot.tsx");
    expect(src).toContain("theme.motion.");
    expect(src).toContain("theme.animation.");
  });

  test("Card.tsx uses theme.glow for border/shadow effects (unmapped)", () => {
    const src = readComponent(MOLECULES_DIR, "Card.tsx");
    expect(src).toContain("theme.glow.");
  });

  test("ExpandableCard.tsx uses theme.motion for transitions (unmapped)", () => {
    const src = readComponent(MOLECULES_DIR, "ExpandableCard.tsx");
    expect(src).toContain("theme.motion.");
  });
});
