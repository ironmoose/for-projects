import { useRef } from "react";
import {
  useTheme,
  ListPageLayout,
  PageHeader,
} from "../components";
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
  const { theme } = useTheme();

  const entry = componentName ? getComponent(componentName) : undefined;

  return (
    <ListPageLayout>
      <PageHeader
        title="Component Gallery"
        subtitle="Browse all UI components with multi-theme previews. Open with Ctrl+Shift+G."
        style={{ marginBottom: theme.spacing.xl }}
      />

      <div
        style={{
          borderRadius: theme.radius.lg,
          border: `1px solid ${theme.color.borderSubtle}`,
          overflow: "hidden",
          background: theme.color.surfaceContainerLow,
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
