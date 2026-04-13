import { PageHeader, ListPageLayout } from "../components";
import { semantic as t } from "@4lt7ab/ui/core";
import { AppThemePicker } from "../components/molecules/AppThemePicker";

// ---------------------------------------------------------------------------
// ThemesPage
// ---------------------------------------------------------------------------

const themeDescriptions: Record<string, string> = {
  synthwave: "Neon synthwave with animated glow effects and canvas background",
  slate: "Cool blue-grey dark theme for focused work",
  neural: "Deep dark theme with neural network canvas background",
  coral: "Warm coral and amber tones on a dark canvas",
  "warm-sand": "Warm light theme with sandy tones",
  moss: "Earthy green dark theme inspired by forest moss",
  pipboy: "Retro green-on-black terminal aesthetic with CRT background",
  pacman: "Arcade-inspired theme with animated background",
  "black-hole": "Ultra-dark theme with gravitational lensing background",
};

export function ThemesPage() {
  return (
    <ListPageLayout>
      <PageHeader
        title="Themes"
        subtitle="Choose a theme for your workspace. Each theme provides its own color palette and some include animated canvas backgrounds."
        style={{ marginBottom: t.spaceXl }}
      />

      <AppThemePicker descriptions={themeDescriptions} />
    </ListPageLayout>
  );
}
