import { useMemo } from "react";
import {
  TopBar,
  useTheme,
  ConnectionStatus,
  DisconnectionBanner,
  AnimationStyles,
  ErrorBoundary,
} from "./components";
import type { NavItem } from "./components";
import { useRealtimeEvents } from "./useRealtimeEvents";
import { useHashRoute, useEventFanOut, EventSubscriptionContext } from "./hooks";
import { DashboardPage } from "./pages/DashboardPage";
import { ProjectPage } from "./pages/ProjectPage";
import { WorkbenchesPage } from "./pages/WorkbenchesPage";
import { WorkbenchPage } from "./pages/WorkbenchPage";
import { GalleryPage } from "./pages/GalleryPage";

const navItems: NavItem[] = [
  { label: "Projects", path: "/" },
  { label: "Workbenches", path: "/workbenches" },
];

export function App() {
  const { theme } = useTheme();
  const { path, navigate } = useHashRoute();
  const { onEvent, subscribeEvents } = useEventFanOut();
  const { connected } = useRealtimeEvents(onEvent);

  const projectIdMatch = path.match(/^\/projects\/([^/]+)$/);
  const projectId = projectIdMatch?.[1] ?? null;

  const workbenchIdMatch = path.match(/^\/workbenches\/([^/]+)$/);
  const workbenchId = workbenchIdMatch?.[1] ?? null;

  const galleryComponentMatch = path.match(/^\/gallery\/([^/]+)$/);
  const galleryComponent = galleryComponentMatch?.[1] ?? undefined;

  const activePath = path.startsWith("/gallery") ? "/gallery" : path.startsWith("/workbenches") ? "/workbenches" : "/";

  const eventCtx = useMemo(() => ({ subscribeEvents, connected }), [subscribeEvents, connected]);

  function renderView() {
    if (path.startsWith("/gallery")) {
      return <GalleryPage componentName={galleryComponent} onNavigate={navigate} />;
    }
    if (projectId) {
      return <ProjectPage projectId={projectId} onBack={() => navigate("/")} />;
    }
    if (workbenchId) {
      return <WorkbenchPage id={workbenchId} onBack={() => navigate("/workbenches")} />;
    }
    if (path.startsWith("/workbenches")) {
      return <WorkbenchesPage onOpenWorkbench={(wbId) => navigate(`/workbenches/${wbId}`)} />;
    }
    return <DashboardPage onOpenProject={(pId) => navigate(`/projects/${pId}`)} />;
  }

  return (
    <EventSubscriptionContext.Provider value={eventCtx}>
      <AnimationStyles />
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", fontFamily: theme.font.body }}>
        <TopBar
          trailing={<ConnectionStatus connected={connected} />}
          navItems={navItems}
          activePath={activePath}
          onNavigate={navigate}
        />
        <DisconnectionBanner connected={connected} />
        <main
          role="main"
          style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", minWidth: 0 }}
        >
          <ErrorBoundary>
            {renderView()}
          </ErrorBoundary>
        </main>
      </div>
    </EventSubscriptionContext.Provider>
  );
}
