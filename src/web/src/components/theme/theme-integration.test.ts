/**
 * Tests for the @4lt7ab/ui theme integration layer.
 *
 * These tests verify:
 * 1. lib-themes exports are correct
 * 2. All library themes have legacy entries with glow tokens
 * 3. Compat layer produces the correct (slimmed) token structure
 * 4. compatThemes record covers all themes
 * 5. legacyThemes re-export matches original
 */
import { describe, expect, test } from "bun:test";
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
// 3. Compat layer structure (slimmed — no color/shadow/radius/spacing/font)
// ---------------------------------------------------------------------------

describe("Compat layer", () => {
  test("buildCompatTheme returns an object with all Theme keys", () => {
    const legacy = originalThemes.slate!;
    const compat = buildCompatTheme(legacy);

    const expectedKeys: (keyof Theme)[] = [
      "name", "label", "glow", "motion", "animation", "layout", "breakpoint",
    ];
    for (const key of expectedKeys) {
      expect(compat[key]).toBeDefined();
    }
  });

  test("Theme interface no longer has color, shadow, radius, spacing, or font", () => {
    const legacy = originalThemes.slate!;
    const compat = buildCompatTheme(legacy);
    // These keys should not exist on the slimmed Theme
    expect((compat as Record<string, unknown>).color).toBeUndefined();
    expect((compat as Record<string, unknown>).shadow).toBeUndefined();
    expect((compat as Record<string, unknown>).radius).toBeUndefined();
    expect((compat as Record<string, unknown>).spacing).toBeUndefined();
    expect((compat as Record<string, unknown>).font).toBeUndefined();
  });

  test("glow tokens are fully preserved from legacy", () => {
    const legacy = originalThemes.synthwave!;
    const compat = buildCompatTheme(legacy);
    expect(compat.glow).toEqual(legacy.glow);
    expect(compat.glow.animated).toBe(true);
  });

  test("non-glow themes use generic fallback glow values", () => {
    const compat = buildCompatTheme(originalThemes.slate!);
    expect(compat.glow.animated).toBe(false);
    expect(compat.glow.accentColor).toBe("currentColor");
    expect(compat.glow.borderSubtle).toBe("transparent");
    expect(compat.glow.borderMedium).toBe("var(--color-border)");
    expect(compat.glow.shadowSm).toBe("none");
    expect(compat.glow.focusRing).toBe("none");
  });

  test("motion, animation, layout, breakpoint preserved", () => {
    const legacy = originalThemes.slate!;
    const compat = buildCompatTheme(legacy);
    expect(compat.motion).toEqual(legacy.motion);
    expect(compat.animation).toEqual(legacy.animation);
    expect(compat.layout).toEqual(legacy.layout);
    expect(compat.breakpoint).toEqual(legacy.breakpoint);
  });

  test("buildCompatTheme returns the same object (passthrough)", () => {
    const legacy = originalThemes.slate!;
    const compat = buildCompatTheme(legacy);
    expect(compat).toBe(legacy);
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
