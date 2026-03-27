import { useEffect, useMemo } from "react";
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
import { useHashRoute, useEventFanOut, EventSubscriptionContext, useActivityCount } from "./hooks";
import { DashboardPage } from "./pages/DashboardPage";
import { ProjectPage } from "./pages/ProjectPage";
import { WorkbenchesPage } from "./pages/WorkbenchesPage";
import { WorkbenchPage } from "./pages/WorkbenchPage";
import { GalleryPage } from "./pages/GalleryPage";
import { ThemesPage } from "./pages/ThemesPage";

const navItems: NavItem[] = [
  { label: "Projects", path: "/" },
  { label: "Workbenches", path: "/workbenches" },
  { label: "Themes", path: "/themes" },
];

// ---------------------------------------------------------------------------
// ActivityIndicator atom (inline to avoid modifying atoms directory)
// ---------------------------------------------------------------------------

function ActivityIndicator({ count }: { count: number }) {
  const { theme } = useTheme();
  const display = count > 99 ? "99+" : `${count}`;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 20,
        height: 20,
        borderRadius: theme.radius.full,
        background: count > 0 ? `${theme.color.primary}26` : theme.color.surfaceContainerHigh,
        color: count > 0 ? theme.color.primary : theme.color.textFaint,
        fontFamily: theme.font.mono,
        fontSize: theme.font.size.xxs,
        fontWeight: 600,
        flexShrink: 0,
        transition: `background ${theme.animation.duration.fast}, color ${theme.animation.duration.fast}`,
      }}
    >
      {display}
    </span>
  );
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export function App() {
  const { theme } = useTheme();
  const { path, navigate } = useHashRoute();
  const { onEvent, subscribeEvents } = useEventFanOut();
  const { connected } = useRealtimeEvents(onEvent);
  const activityCount = useActivityCount();

  const projectIdMatch = path.match(/^\/projects\/([^/]+)$/);
  const projectId = projectIdMatch?.[1] ?? null;

  const workbenchIdMatch = path.match(/^\/workbenches\/([^/]+)$/);
  const workbenchId = workbenchIdMatch?.[1] ?? null;

  const galleryComponentMatch = path.match(/^\/gallery\/([^/]+)$/);
  const galleryComponent = galleryComponentMatch?.[1] ?? undefined;

  const activePath = path.startsWith("/gallery")
    ? "/gallery"
    : path.startsWith("/themes")
    ? "/themes"
    : path.startsWith("/workbenches")
    ? "/workbenches"
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
          trailing={
            <div style={{ display: "flex", alignItems: "center", gap: theme.spacing.sm }}>
              <ActivityIndicator count={activityCount} />
              <ConnectionStatus connected={connected} />
            </div>
          }
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
