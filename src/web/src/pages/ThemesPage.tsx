import { PageHeader, ListPageLayout } from "../components";
import { semantic as t } from "@4lt7ab/ui/core";
import { AppThemePicker } from "../components/molecules/AppThemePicker";

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
  return (
    <ListPageLayout>
      <PageHeader
        title="Themes"
        subtitle="Choose a theme for your workspace. All themes are dark-mode optimized for mission control aesthetics."
        style={{ marginBottom: t.spaceXl }}
      />

      <AppThemePicker descriptions={themeDescriptions} />
    </ListPageLayout>
  );
}
