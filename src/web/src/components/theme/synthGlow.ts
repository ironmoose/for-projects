/**
 * Returns a CSS color-mix expression referencing the cycling --synth-glow
 * custom property at the given opacity percentage.
 *
 * Usage: sg(40) → "color-mix(in srgb, var(--synth-glow) 40%, transparent)"
 *
 * The --synth-glow property is animated on :root[data-synth] and cycles
 * through cyan → pink → green on a 15s loop. Components that use sg()
 * will shift color in unison.
 *
 * Fallback: browsers that don't support @property or color-mix will see
 * the initial-value (#00f0ff / cyan) as a static color.
 */
export function sg(pct: number): string {
  return `color-mix(in srgb, var(--synth-glow) ${pct}%, transparent)`;
}
