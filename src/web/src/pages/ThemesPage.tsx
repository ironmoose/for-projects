import { PageHeader, ListPageLayout } from "../components";
import { semantic as t, useInjectStyles } from "@4lt7ab/ui/core";
import { ThemePicker } from "@4lt7ab/ui/ui";

// ---------------------------------------------------------------------------
// ThemesPage
// ---------------------------------------------------------------------------

const themeDescriptions: Record<string, string> = {
  deepTeal: "Teal-accented dark theme with an MD3 Stitch palette",
  ember: "Warm amber and orange tones on a dark canvas",
  nord: "Arctic-inspired dark palette from the Nord color system",
  synth: "Neon synthwave with animated glow effects",
};

export function ThemesPage() {
  // Override library ThemePicker CSS — buttons default to black text via
  // `color: inherit` / `color: ButtonText`. Force explicit theme-aware colors
  // so text is always readable on dark surfaces.
  useInjectStyles("tfp-theme-card", `
    .alttab-theme-card { color: var(--color-text); }
    .alttab-theme-card__desc { color: var(--color-text-secondary); }
  `);

  return (
    <ListPageLayout>
      <PageHeader
        title="Themes"
        subtitle="Choose a theme for your workspace. All themes are dark-mode optimized for mission control aesthetics."
        style={{ marginBottom: t.spaceXl }}
      />

      <ThemePicker descriptions={themeDescriptions} />
    </ListPageLayout>
  );
}
