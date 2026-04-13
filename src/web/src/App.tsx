import { useEffect, useMemo, useState } from "react";
import {
  TopBar,
  ConnectionStatus,
  DisconnectionBanner,
  AnimationStyles,
  SynthBackground,
  ErrorBoundary,
} from "./components";
import { semantic as t } from "@4lt7ab/ui/core";
import { AppThemePicker } from "./components/molecules/AppThemePicker";
import type { NavItem } from "./components";
import { ShortcutHelpOverlay } from "./components/organisms/ShortcutHelpOverlay";
import { useRealtimeEvents } from "./useRealtimeEvents";
import { useHashRoute, useEventFanOut, EventSubscriptionContext } from "./hooks";
import {
  useKeyboardShortcutManager,
  useShortcut,
  KeyboardShortcutContext,
} from "./hooks/useKeyboardShortcuts";
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
  const { path, navigate } = useHashRoute();
  const { onEvent, subscribeEvents } = useEventFanOut();
  const { connected } = useRealtimeEvents(onEvent);
  const shortcutManager = useKeyboardShortcutManager();

  const projectIdMatch = path.match(/^\/projects\/([^/]+)$/);
  const projectId = projectIdMatch?.[1] ?? null;

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

  const shortcutCtx = useMemo(
    () => ({
      register: shortcutManager.register,
      getShortcuts: shortcutManager.getShortcuts,
      suppressRef: shortcutManager.suppressRef,
    }),
    [shortcutManager.register, shortcutManager.getShortcuts, shortcutManager.suppressRef],
  );

  // Gallery keyboard shortcut: Ctrl+Shift+G (preserved — handled outside shortcut system since it uses modifiers)
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
      return <DocumentsPage />;
    }
    if (path.startsWith("/gallery")) {
      return <GalleryPage componentName={galleryComponent} onNavigate={navigate} />;
    }
    if (path.startsWith("/activity")) {
      return <ActivityLogPage onNavigate={navigate} />;
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
    <KeyboardShortcutContext.Provider value={shortcutCtx}>
      <EventSubscriptionContext.Provider value={eventCtx}>
        <AnimationStyles />
        <SynthBackground />
        <a
          href="#main-content"
          style={{
            position: "absolute",
            left: -9999,
            top: "auto",
            width: 1,
            height: 1,
            overflow: "hidden",
            zIndex: 100,
          }}
          onFocus={(e) => {
            e.currentTarget.style.position = "fixed";
            e.currentTarget.style.left = "8px";
            e.currentTarget.style.top = "8px";
            e.currentTarget.style.width = "auto";
            e.currentTarget.style.height = "auto";
            e.currentTarget.style.overflow = "visible";
            e.currentTarget.style.padding = "8px 16px";
            e.currentTarget.style.background = t.colorSurface;
            e.currentTarget.style.color = t.colorText;
            e.currentTarget.style.borderRadius = t.radiusMd;
            e.currentTarget.style.border = `2px solid ${t.colorActionPrimary}`;
            e.currentTarget.style.fontFamily = t.fontSans;
            e.currentTarget.style.fontSize = t.fontSizeSm;
            e.currentTarget.style.textDecoration = "none";
            e.currentTarget.style.fontWeight = "600";
          }}
          onBlur={(e) => {
            e.currentTarget.style.position = "absolute";
            e.currentTarget.style.left = "-9999px";
            e.currentTarget.style.width = "1px";
            e.currentTarget.style.height = "1px";
            e.currentTarget.style.overflow = "hidden";
          }}
        >
          Skip to main content
        </a>
        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", fontFamily: t.fontSans }}>
          <TopBar
            trailing={<TrailingIndicators connected={connected} />}
            navItems={navItems}
            activePath={activePath}
            onNavigate={navigate}
          />
          <DisconnectionBanner connected={connected} />
          <main
            id="main-content"
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", minWidth: 0, minHeight: 0 }}
          >
            <ErrorBoundary>
              {renderView()}
            </ErrorBoundary>
          </main>
        </div>
        <GlobalShortcuts navigate={navigate} />
      </EventSubscriptionContext.Provider>
    </KeyboardShortcutContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// GlobalShortcuts — registers app-wide shortcuts inside the context.
// ---------------------------------------------------------------------------

function GlobalShortcuts({ navigate }: { navigate: (path: string) => void }) {
  const [showHelp, setShowHelp] = useState(false);

  // "?" — toggle help overlay
  useShortcut("?", "Show keyboard shortcuts", () => setShowHelp((prev) => !prev), "Global");

  // Navigation sequences
  useShortcut("g h", "Go to dashboard", () => navigate("/"), "Navigation");
  useShortcut("g d", "Go to documents", () => navigate("/documents"), "Navigation");
  useShortcut("g a", "Go to activity log", () => navigate("/activity"), "Navigation");

  return showHelp ? <ShortcutHelpOverlay onClose={() => setShowHelp(false)} /> : null;
}

/** Renders inside EventSubscriptionContext so hooks can access it. */
function TrailingIndicators({ connected }: { connected: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: t.spaceSm }}>
      <AppThemePicker variant="compact" />
      <ConnectionStatus connected={connected} />
    </div>
  );
}
