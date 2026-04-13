import { ListPageLayout, PageHeader } from "../components";
import { semantic as t } from "@4lt7ab/ui/core";
import { GalleryIndex } from "../gallery/GalleryIndex";
import { GalleryComponentView } from "../gallery/GalleryComponentView";
import { getComponent } from "../gallery/registry";
import { registerAllComponents } from "../gallery/registerAll";

// Register once
let registered = false;
function ensureRegistered() {
  if (!registered) {
    registerAllComponents();
    registered = true;
  }
}

interface GalleryPageProps {
  componentName?: string;
  onNavigate: (path: string) => void;
}

export function GalleryPage({ componentName, onNavigate }: GalleryPageProps) {
  ensureRegistered();

  const entry = componentName ? getComponent(componentName) : undefined;

  return (
    <ListPageLayout>
      <PageHeader
        title="Component Gallery"
        subtitle="Browse all UI components with multi-theme previews. Open with Ctrl+Shift+G."
        style={{ marginBottom: t.spaceXl }}
      />

      <div
        style={{
          borderRadius: t.radiusLg,
          border: `1px solid ${`color-mix(in srgb, ${t.colorBorder} 50%, transparent)`}`,
          overflow: "hidden",
          background: t.colorSurfacePanel,
        }}
      >
        {entry ? (
          <GalleryComponentView
            entry={entry}
            onBack={() => onNavigate("/gallery")}
          />
        ) : (
          <GalleryIndex onSelect={(name) => onNavigate(`/gallery/${name}`)} />
        )}
      </div>
    </ListPageLayout>
  );
}
