/**
 * Tests for the @4lt7ab/ui theme integration layer.
 *
 * These tests verify:
 * 1. Compat layer produces the correct token structure
 * 2. Token mapping correctness (library vars for mapped, hex for unmapped)
 * 3. All library themes have legacy entries
 * 4. lib-themes exports are correct
 */
import { describe, expect, test } from "bun:test";
import { semantic } from "@4lt7ab/ui/core";
import { appThemes, APP_DEFAULT_THEME, APP_STORAGE_KEY, FEATURED_THEMES } from "./lib-themes";
import { buildCompatTheme, compatThemes, legacyThemes } from "./compat";
import { themes as originalThemes } from "./theme";
import type { Theme } from "./theme";

// ---------------------------------------------------------------------------
// 1. lib-themes exports
// ---------------------------------------------------------------------------

describe("lib-themes exports", () => {
  test("appThemes is an empty array (no custom themes)", () => {
    expect(appThemes).toHaveLength(0);
  });

  test("APP_DEFAULT_THEME is slate", () => {
    expect(APP_DEFAULT_THEME).toBe("slate");
  });

  test("APP_STORAGE_KEY preserves the old key", () => {
    expect(APP_STORAGE_KEY).toBe("pm-theme");
  });

  test("FEATURED_THEMES contains 4 themes", () => {
    expect(FEATURED_THEMES).toHaveLength(4);
    expect(FEATURED_THEMES).toContain("synthwave");
    expect(FEATURED_THEMES).toContain("slate");
    expect(FEATURED_THEMES).toContain("neural");
    expect(FEATURED_THEMES).toContain("coral");
  });
});

// ---------------------------------------------------------------------------
// 2. Legacy theme entries cover all library themes
// ---------------------------------------------------------------------------

describe("Legacy theme entries", () => {
  const expectedThemes = [
    "synthwave", "slate", "coral", "neural",
    "warm-sand", "moss", "pipboy", "pacman", "black-hole",
  ];

  for (const name of expectedThemes) {
    test(`${name} has a legacy theme entry`, () => {
      expect(originalThemes[name]).toBeDefined();
      expect(originalThemes[name]!.name).toBe(name);
    });
  }

  test("synthwave has animated glow", () => {
    expect(originalThemes.synthwave!.glow.animated).toBe(true);
  });

  test("non-synthwave themes have non-animated glow", () => {
    for (const name of expectedThemes.filter((n) => n !== "synthwave")) {
      expect(originalThemes[name]!.glow.animated).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. Compat layer structure
// ---------------------------------------------------------------------------

describe("Compat layer", () => {
  test("buildCompatTheme returns an object with all Theme keys", () => {
    const legacy = originalThemes.slate!;
    const compat = buildCompatTheme(legacy);

    // Check all top-level keys exist
    const expectedKeys: (keyof Theme)[] = [
      "name", "label", "color", "shadow", "glow", "radius",
      "spacing", "font", "motion", "animation", "layout", "breakpoint",
    ];
    for (const key of expectedKeys) {
      expect(compat[key]).toBeDefined();
    }
  });

  test("mapped color tokens use CSS var references", () => {
    const compat = buildCompatTheme(originalThemes.slate!);

    // These should be CSS var references from the library
    expect(compat.color.text).toBe(semantic.colorText);
    expect(compat.color.textMuted).toBe(semantic.colorTextMuted);
    expect(compat.color.textFaint).toBe(semantic.colorTextSecondary);
    expect(compat.color.surface).toBe(semantic.colorSurface);
    expect(compat.color.border).toBe(semantic.colorBorder);
    expect(compat.color.primary).toBe(semantic.colorActionPrimary);
    expect(compat.color.danger).toBe(semantic.colorActionDestructive);
    expect(compat.color.success).toBe(semantic.colorSuccess);
    expect(compat.color.warning).toBe(semantic.colorWarning);
    expect(compat.color.onPrimary).toBe(semantic.colorTextInverse);
    expect(compat.color.running).toBe(semantic.colorSuccess);
    expect(compat.color.failed).toBe(semantic.colorError);
  });

  test("shadow tokens use CSS var references", () => {
    const compat = buildCompatTheme(originalThemes.slate!);
    expect(compat.shadow.sm).toBe(semantic.shadowSm);
    expect(compat.shadow.md).toBe(semantic.shadowMd);
    expect(compat.shadow.lg).toBe(semantic.shadowLg);
  });

  test("unmapped color tokens preserve original hex values", () => {
    const legacy = originalThemes.slate!;
    const compat = buildCompatTheme(legacy);

    // These have no library equivalent and should keep original values
    expect(compat.color.borderSubtle).toBe(legacy.color.borderSubtle);
    expect(compat.color.primaryContainer).toBe(legacy.color.primaryContainer);
    expect(compat.color.onPrimaryContainer).toBe(legacy.color.onPrimaryContainer);
    expect(compat.color.tertiary).toBe(legacy.color.tertiary);
    expect(compat.color.activityFlash).toBe(legacy.color.activityFlash);
    expect(compat.color.glowPrimary).toBe(legacy.color.glowPrimary);
    expect(compat.color.glowSuccess).toBe(legacy.color.glowSuccess);
    expect(compat.color.glowDanger).toBe(legacy.color.glowDanger);
    expect(compat.color.activityBorder).toBe(legacy.color.activityBorder);
  });

  test("glow tokens are fully preserved from legacy", () => {
    const legacy = originalThemes.synthwave!;
    const compat = buildCompatTheme(legacy);
    expect(compat.glow).toEqual(legacy.glow);
    expect(compat.glow.animated).toBe(true);
  });

  test("spacing preserves original values (not library scale)", () => {
    const compat = buildCompatTheme(originalThemes.slate!);
    expect(compat.spacing.md).toBe("0.75rem");
    expect(compat.spacing.lg).toBe("1rem");
    expect(compat.spacing.xl).toBe("1.5rem");
    expect(compat.spacing["2xl"]).toBe("2rem");
  });

  test("radius preserves number type", () => {
    const compat = buildCompatTheme(originalThemes.slate!);
    expect(typeof compat.radius.sm).toBe("number");
    expect(typeof compat.radius.md).toBe("number");
    expect(typeof compat.radius.lg).toBe("number");
    expect(compat.radius.lg).toBe(8);
  });

  test("font preserves original values", () => {
    const compat = buildCompatTheme(originalThemes.slate!);
    expect(compat.font.headline).toContain("Manrope");
    expect(compat.font.size.xxs).toBe("0.625rem");
    expect(compat.font.size["2xl"]).toBe("2.25rem");
    expect(compat.font.lineHeight.mono).toBe(1.6);
  });

  test("motion, animation, layout, breakpoint preserved", () => {
    const legacy = originalThemes.slate!;
    const compat = buildCompatTheme(legacy);
    expect(compat.motion).toEqual(legacy.motion);
    expect(compat.animation).toEqual(legacy.animation);
    expect(compat.layout).toEqual(legacy.layout);
    expect(compat.breakpoint).toEqual(legacy.breakpoint);
  });
});

// ---------------------------------------------------------------------------
// 4. compatThemes record
// ---------------------------------------------------------------------------

describe("compatThemes record", () => {
  test("has entries for all 9 library themes", () => {
    expect(Object.keys(compatThemes)).toHaveLength(9);
    expect(compatThemes.synthwave).toBeDefined();
    expect(compatThemes.slate).toBeDefined();
    expect(compatThemes.coral).toBeDefined();
    expect(compatThemes.neural).toBeDefined();
    expect(compatThemes["warm-sand"]).toBeDefined();
    expect(compatThemes.moss).toBeDefined();
    expect(compatThemes.pipboy).toBeDefined();
    expect(compatThemes.pacman).toBeDefined();
    expect(compatThemes["black-hole"]).toBeDefined();
  });

  test("each compat theme has the correct name", () => {
    for (const [name, theme] of Object.entries(compatThemes)) {
      expect(theme.name).toBe(name);
    }
  });
});

// ---------------------------------------------------------------------------
// 5. legacyThemes re-export
// ---------------------------------------------------------------------------

describe("legacyThemes re-export", () => {
  test("matches original themes object", () => {
    expect(legacyThemes).toBe(originalThemes);
  });
});
