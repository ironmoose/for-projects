import { useEffect, useMemo } from "react";
import {
  ActivityIndicator,
  TopBar,
  useTheme,
  ConnectionStatus,
  DisconnectionBanner,
  AnimationStyles,
  SynthBackground,
  ErrorBoundary,
} from "./components";
import type { NavItem } from "./components";
import { useRealtimeEvents } from "./useRealtimeEvents";
import { useHashRoute, useEventFanOut, EventSubscriptionContext } from "./hooks";
import { DashboardPage } from "./pages/DashboardPage";
import { ProjectPage } from "./pages/ProjectPage";
import { GalleryPage } from "./pages/GalleryPage";
import { ThemesPage } from "./pages/ThemesPage";
import { ActivityLogPage } from "./pages/ActivityLogPage";
import { DocumentsPage } from "./pages/DocumentsPage";

const navItems: NavItem[] = [
  { label: "Projects", path: "/" },
  { label: "Documents", path: "/documents" },
  { label: "Activity", path: "/activity" },
  { label: "Gallery", path: "/gallery" },
  { label: "Themes", path: "/themes" },
];

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export function App() {
  const { theme } = useTheme();
  const { path, navigate } = useHashRoute();
  const { onEvent, subscribeEvents } = useEventFanOut();
  const { connected } = useRealtimeEvents(onEvent);

  const projectIdMatch = path.match(/^\/projects\/([^/]+)$/);
  const projectId = projectIdMatch?.[1] ?? null;

  const documentIdMatch = path.match(/^\/documents\/([^/]+)$/);
  const documentId = documentIdMatch?.[1] ?? null;

  const galleryComponentMatch = path.match(/^\/gallery\/([^/]+)$/);
  const galleryComponent = galleryComponentMatch?.[1] ?? undefined;

  const activePath = path.startsWith("/documents")
    ? "/documents"
    : path.startsWith("/gallery")
    ? "/gallery"
    : path.startsWith("/activity")
    ? "/activity"
    : path.startsWith("/themes")
    ? "/themes"
    : "/";

  const eventCtx = useMemo(() => ({ subscribeEvents, connected }), [subscribeEvents, connected]);

  // Gallery keyboard shortcut: Ctrl+Shift+G
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.shiftKey && e.key === "G") {
        e.preventDefault();
        navigate("/gallery");
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  function renderView() {
    if (path.startsWith("/documents")) {
      return (
        <DocumentsPage
          selectedDocumentId={documentId}
          onOpenDocument={(dId) => navigate(`/documents/${dId}`)}
          onBack={() => navigate("/documents")}
        />
      );
    }
    if (path.startsWith("/gallery")) {
      return <GalleryPage componentName={galleryComponent} onNavigate={navigate} />;
    }
    if (path.startsWith("/activity")) {
      return <ActivityLogPage />;
    }
    if (path.startsWith("/themes")) {
      return <ThemesPage />;
    }
    if (projectId) {
      return <ProjectPage projectId={projectId} onBack={() => navigate("/")} />;
    }
    return <DashboardPage onOpenProject={(pId) => navigate(`/projects/${pId}`)} />;
  }

  return (
    <EventSubscriptionContext.Provider value={eventCtx}>
      <AnimationStyles />
      <SynthBackground />
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", fontFamily: theme.font.body }}>
        <TopBar
          trailing={<TrailingIndicators connected={connected} />}
          navItems={navItems}
          activePath={activePath}
          onNavigate={navigate}
        />
        <DisconnectionBanner connected={connected} />
        <main
          role="main"
          style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", minWidth: 0, minHeight: 0 }}
        >
          <ErrorBoundary>
            {renderView()}
          </ErrorBoundary>
        </main>
      </div>
    </EventSubscriptionContext.Provider>
  );
}

/** Renders inside EventSubscriptionContext so hooks can access it. */
function TrailingIndicators({ connected }: { connected: boolean }) {
  const { theme } = useTheme();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: theme.spacing.sm }}>
      <ActivityIndicator count={0} />
      <ConnectionStatus connected={connected} />
    </div>
  );
}
