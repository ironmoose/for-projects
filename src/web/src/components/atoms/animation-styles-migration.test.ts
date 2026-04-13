/**
 * Tests verifying the AnimationStyles migration from inline <style> element
 * to useInjectStyles from @4lt7ab/ui/core.
 *
 * Verifies:
 * 1. useInjectStyles is imported and called with 'tfp-animations' ID
 * 2. Component returns null (no JSX)
 * 3. All keyframe names are present in the injected CSS
 * 4. prefers-reduced-motion media query is present
 * 5. Synth glow cycling is present
 * 6. No inline <style> element rendering
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";

const SRC = readFileSync(join(import.meta.dir, "AnimationStyles.tsx"), "utf-8");

// ---------------------------------------------------------------------------
// 1. useInjectStyles import and call
// ---------------------------------------------------------------------------

describe("useInjectStyles integration", () => {
  test("imports useInjectStyles from @4lt7ab/ui/core", () => {
    expect(SRC).toContain("useInjectStyles");
    expect(SRC).toContain("@4lt7ab/ui/core");
  });

  test("calls useInjectStyles with 'tfp-animations' ID", () => {
    expect(SRC).toContain('useInjectStyles("tfp-animations"');
  });
});

// ---------------------------------------------------------------------------
// 2. Component returns null
// ---------------------------------------------------------------------------

describe("component renders nothing", () => {
  test("returns null instead of a <style> element", () => {
    expect(SRC).toContain("return null");
  });

  test("does not render a <style> JSX element", () => {
    // The comment mentions <style> but the component should not render one
    expect(SRC).not.toMatch(/<style>\s*\{/);
    expect(SRC).not.toContain("</style>");
  });
});

// ---------------------------------------------------------------------------
// 3. All keyframe definitions present
// ---------------------------------------------------------------------------

describe("all keyframe definitions present", () => {
  const expectedKeyframes = [
    "highlight-flash",
    "slide-in-left",
    "scale-bump",
    "pulse-alive",
    "ripple-out",
    "toast-in",
    "shimmer",
    "glow-pulse",
    "border-pulse",
    "status-transition",
    "fade-in-up",
    "slide-up",
    "shake",
    "spin",
    "synth-grid-scroll",
    "synth-scanline",
    "synth-sun-breathe",
    "synth-star-twinkle",
    "synth-glow-cycle",
  ];

  for (const name of expectedKeyframes) {
    test(`@keyframes ${name} is defined`, () => {
      expect(SRC).toContain(`@keyframes ${name}`);
    });
  }
});

// ---------------------------------------------------------------------------
// 4. prefers-reduced-motion media query
// ---------------------------------------------------------------------------

describe("accessibility", () => {
  test("includes prefers-reduced-motion media query", () => {
    expect(SRC).toContain("prefers-reduced-motion: reduce");
  });

  test("reduces animation-duration to near-zero", () => {
    expect(SRC).toContain("animation-duration: 0.01ms !important");
  });

  test("reduces transition-duration to near-zero", () => {
    expect(SRC).toContain("transition-duration: 0.01ms !important");
  });
});

// ---------------------------------------------------------------------------
// 5. Synth glow cycling
// ---------------------------------------------------------------------------

describe("synth glow cycling", () => {
  test("defines @property --synth-glow", () => {
    expect(SRC).toContain("@property --synth-glow");
  });

  test("applies synth-glow-cycle to :root[data-synth]", () => {
    expect(SRC).toContain(":root[data-synth]");
    expect(SRC).toContain("synth-glow-cycle 15s");
  });
});

// ---------------------------------------------------------------------------
// 6. CSS is stored as a module-level constant (not inline JSX)
// ---------------------------------------------------------------------------

describe("CSS extraction pattern", () => {
  test("CSS is defined as a constant outside the component", () => {
    expect(SRC).toContain("const ANIMATION_CSS");
  });
});
