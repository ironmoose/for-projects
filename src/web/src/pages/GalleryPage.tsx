import { useEffect, useRef } from "react";
import { GalleryLayout } from "../gallery/GalleryLayout";
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

  if (entry) {
    return (
      <GalleryLayout>
        <GalleryComponentView
          entry={entry}
          onBack={() => onNavigate("/gallery")}
        />
      </GalleryLayout>
    );
  }

  return (
    <GalleryLayout>
      <GalleryIndex onSelect={(name) => onNavigate(`/gallery/${name}`)} />
    </GalleryLayout>
  );
}
