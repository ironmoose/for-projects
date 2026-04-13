/**
 * Tests for the @4lt7ab/ui theme integration layer.
 *
 * These tests verify:
 * 1. Custom ThemeDefinition objects are structurally complete
 * 2. Compat layer produces the correct token structure
 * 3. Token mapping correctness (library vars for mapped, hex for unmapped)
 * 4. All 4 themes are defined and registered
 */
import { describe, expect, test } from "bun:test";
import { semantic } from "@4lt7ab/ui/core";
import type { ThemeDefinition, ThemeTokens } from "@4lt7ab/ui/core";
import { appThemes, deepTealTheme, emberTheme, nordTheme, synthTheme, APP_DEFAULT_THEME, APP_STORAGE_KEY } from "./lib-themes";
import { buildCompatTheme, compatThemes, legacyThemes } from "./compat";
import { themes as originalThemes } from "./theme";
import type { Theme } from "./theme";

// ---------------------------------------------------------------------------
// Helper: get all required ThemeTokens keys
// ---------------------------------------------------------------------------

const REQUIRED_TOKEN_KEYS: (keyof ThemeTokens)[] = [
  "colorText", "colorTextSecondary", "colorTextMuted", "colorTextInverse",
  "colorTextLink", "colorTextPlaceholder", "colorTextDisabled",
  "colorSurface", "colorSurfacePanel", "colorSurfaceRaised", "colorSurfaceOverlay",
  "colorSurfaceInput", "colorSurfaceDisabled", "colorSurfacePage",
  "colorBorder", "colorBorderFocused", "colorBorderError",
  "colorActionPrimary", "colorActionPrimaryHover",
  "colorActionSecondary", "colorActionSecondaryHover",
  "colorActionDestructive", "colorActionDestructiveHover",
  "colorSuccess", "colorSuccessBg", "colorWarning", "colorWarningBg",
  "colorError", "colorErrorBg", "colorInfo", "colorInfoBg",
  "spaceXs", "spaceSm", "spaceMd", "spaceLg", "spaceXl", "space2xl",
  "radiusSm", "radiusMd", "radiusLg", "radiusFull",
  "shadowSm", "shadowMd", "shadowLg",
  "fontSans", "fontSerif", "fontMono",
  "fontSizeXs", "fontSizeSm", "fontSizeBase", "fontSizeLg",
  "fontSizeXl", "fontSize2xl", "fontSize3xl",
  "lineHeightTight", "lineHeightBase", "lineHeightRelaxed",
  "fontWeightNormal", "fontWeightMedium", "fontWeightSemibold", "fontWeightBold",
  "letterSpacingTight", "letterSpacingNormal", "letterSpacingWide",
  "focusRingColor", "focusRingWidth", "focusRingOffset",
];

// ---------------------------------------------------------------------------
// 1. ThemeDefinition completeness
// ---------------------------------------------------------------------------

describe("Custom ThemeDefinitions", () => {
  const themeMap: Record<string, ThemeDefinition> = {
    deepTeal: deepTealTheme,
    ember: emberTheme,
    nord: nordTheme,
    synth: synthTheme,
  };

  for (const [name, def] of Object.entries(themeMap)) {
    describe(name, () => {
      test("has name and label", () => {
        expect(def.name).toBe(name);
        expect(def.label).toBeTruthy();
      });

      test("has all required token keys", () => {
        for (const key of REQUIRED_TOKEN_KEYS) {
          expect(def.tokens[key]).toBeDefined();
          expect(typeof def.tokens[key]).toBe("string");
          expect((def.tokens[key] as string).length).toBeGreaterThan(0);
        }
      });

      test("no token values are undefined or empty", () => {
        for (const [key, val] of Object.entries(def.tokens)) {
          expect(val).toBeDefined();
          expect(typeof val).toBe("string");
          expect((val as string).length).toBeGreaterThan(0);
        }
      });
    });
  }

  test("appThemes array contains all 4 themes", () => {
    expect(appThemes).toHaveLength(4);
    const names = appThemes.map((t) => t.name);
    expect(names).toContain("deepTeal");
    expect(names).toContain("ember");
    expect(names).toContain("nord");
    expect(names).toContain("synth");
  });

  test("APP_DEFAULT_THEME is deepTeal", () => {
    expect(APP_DEFAULT_THEME).toBe("deepTeal");
  });

  test("APP_STORAGE_KEY preserves the old key", () => {
    expect(APP_STORAGE_KEY).toBe("pm-theme");
  });
});

// ---------------------------------------------------------------------------
// 2. Color preservation — custom themes match original hex values
// ---------------------------------------------------------------------------

describe("Color preservation", () => {
  const themeNames = ["deepTeal", "ember", "nord", "synth"] as const;

  for (const name of themeNames) {
    test(`${name}: colorText matches original`, () => {
      const original = originalThemes[name]!;
      const custom = appThemes.find((t) => t.name === name)!;
      expect(custom.tokens.colorText).toBe(original.color.text);
    });

    test(`${name}: colorActionPrimary matches original primary`, () => {
      const original = originalThemes[name]!;
      const custom = appThemes.find((t) => t.name === name)!;
      expect(custom.tokens.colorActionPrimary).toBe(original.color.primary);
    });

    test(`${name}: colorSurfacePage matches original surface`, () => {
      const original = originalThemes[name]!;
      const custom = appThemes.find((t) => t.name === name)!;
      expect(custom.tokens.colorSurfacePage).toBe(original.color.surface);
    });

    test(`${name}: colorSuccess matches original`, () => {
      const original = originalThemes[name]!;
      const custom = appThemes.find((t) => t.name === name)!;
      expect(custom.tokens.colorSuccess).toBe(original.color.success);
    });
  }
});

// ---------------------------------------------------------------------------
// 3. Compat layer structure
// ---------------------------------------------------------------------------

describe("Compat layer", () => {
  test("buildCompatTheme returns an object with all Theme keys", () => {
    const legacy = originalThemes.deepTeal!;
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
    const compat = buildCompatTheme(originalThemes.deepTeal!);

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
    const compat = buildCompatTheme(originalThemes.deepTeal!);
    expect(compat.shadow.sm).toBe(semantic.shadowSm);
    expect(compat.shadow.md).toBe(semantic.shadowMd);
    expect(compat.shadow.lg).toBe(semantic.shadowLg);
  });

  test("unmapped color tokens preserve original hex values", () => {
    const legacy = originalThemes.deepTeal!;
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
    const legacy = originalThemes.synth!;
    const compat = buildCompatTheme(legacy);
    expect(compat.glow).toEqual(legacy.glow);
    expect(compat.glow.animated).toBe(true);
  });

  test("spacing preserves original values (not library scale)", () => {
    const compat = buildCompatTheme(originalThemes.deepTeal!);
    expect(compat.spacing.md).toBe("0.75rem");
    expect(compat.spacing.lg).toBe("1rem");
    expect(compat.spacing.xl).toBe("1.5rem");
    expect(compat.spacing["2xl"]).toBe("2rem");
  });

  test("radius preserves number type", () => {
    const compat = buildCompatTheme(originalThemes.deepTeal!);
    expect(typeof compat.radius.sm).toBe("number");
    expect(typeof compat.radius.md).toBe("number");
    expect(typeof compat.radius.lg).toBe("number");
    expect(compat.radius.lg).toBe(8);
  });

  test("font preserves original values", () => {
    const compat = buildCompatTheme(originalThemes.deepTeal!);
    expect(compat.font.headline).toContain("Manrope");
    expect(compat.font.size.xxs).toBe("0.625rem");
    expect(compat.font.size["2xl"]).toBe("2.25rem");
    expect(compat.font.lineHeight.mono).toBe(1.6);
  });

  test("motion, animation, layout, breakpoint preserved", () => {
    const legacy = originalThemes.deepTeal!;
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
  test("has all 4 themes", () => {
    expect(Object.keys(compatThemes)).toHaveLength(4);
    expect(compatThemes.deepTeal).toBeDefined();
    expect(compatThemes.ember).toBeDefined();
    expect(compatThemes.nord).toBeDefined();
    expect(compatThemes.synth).toBeDefined();
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
