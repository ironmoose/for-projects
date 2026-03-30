import { useEffect, useMemo } from "react";
import {
  ActivityIndicator,
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
import { ActionsPage } from "./pages/ActionsPage";
import { ActionLogPage } from "./pages/ActionLogPage";
import { GalleryPage } from "./pages/GalleryPage";
import { ThemesPage } from "./pages/ThemesPage";
import { ActionsDashboardPage } from "./pages/ActionsDashboardPage";

const navItems: NavItem[] = [
  { label: "Projects", path: "/" },
  { label: "Dashboard", path: "/actions/dashboard" },
  { label: "Actions", path: "/actions" },
  { label: "Action Log", path: "/action-log" },
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

  const galleryComponentMatch = path.match(/^\/gallery\/([^/]+)$/);
  const galleryComponent = galleryComponentMatch?.[1] ?? undefined;

  const activePath = path.startsWith("/gallery")
    ? "/gallery"
    : path.startsWith("/themes")
    ? "/themes"
    : path === "/actions/dashboard"
    ? "/actions/dashboard"
    : path.startsWith("/action-log")
    ? "/action-log"
    : path.startsWith("/actions")
    ? "/actions"
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
    if (path.startsWith("/gallery")) {
      return <GalleryPage componentName={galleryComponent} onNavigate={navigate} />;
    }
    if (path.startsWith("/themes")) {
      return <ThemesPage />;
    }
    if (path === "/actions/dashboard") {
      return <ActionsDashboardPage />;
    }
    if (path.startsWith("/action-log")) {
      return <ActionLogPage />;
    }
    if (path.startsWith("/actions")) {
      return <ActionsPage />;
    }
    if (projectId) {
      return <ProjectPage projectId={projectId} onBack={() => navigate("/")} />;
    }
    return <DashboardPage onOpenProject={(pId) => navigate(`/projects/${pId}`)} />;
  }

  return (
    <EventSubscriptionContext.Provider value={eventCtx}>
      <AnimationStyles />
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", fontFamily: theme.font.body }}>
        <TopBar
          trailing={<TrailingIndicators connected={connected} />}
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
