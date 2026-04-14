import { useMemo, useState } from "react";
import {
  TopBar,
  ConnectionStatus,
  DisconnectionBanner,
  ErrorBoundary,
} from "./components";
import { BackgroundLoader } from "./components/atoms/BackgroundLoader";
import { ThemeSurface } from "@4lt7ab/ui/ui";
import { semantic as t } from "@4lt7ab/ui/core";
import { ThemePicker } from "@4lt7ab/ui/ui";
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
import { ActivityLogPage } from "./pages/ActivityLogPage";
import { DocumentsPage } from "./pages/DocumentsPage";

const navItems: NavItem[] = [
  { label: "Projects", path: "/" },
  { label: "Documents", path: "/documents" },
  { label: "Activity", path: "/activity" },
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

  const activePath = path.startsWith("/documents")
    ? "/documents"
    : path.startsWith("/activity")
    ? "/activity"
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

  function renderView() {
    if (path.startsWith("/documents")) {
      return <DocumentsPage />;
    }
    if (path.startsWith("/activity")) {
      return <ActivityLogPage onNavigate={navigate} />;
    }
    if (projectId) {
      return <ProjectPage projectId={projectId} onBack={() => navigate("/")} />;
    }
    return <DashboardPage onOpenProject={(pId) => navigate(`/projects/${pId}`)} />;
  }

  return (
    <KeyboardShortcutContext.Provider value={shortcutCtx}>
      <EventSubscriptionContext.Provider value={eventCtx}>
        <ThemeSurface global />
        <BackgroundLoader />
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
        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", fontFamily: t.fontSans, color: t.colorText }}>
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
      <ThemePicker variant="compact" />
      <ConnectionStatus connected={connected} />
    </div>
  );
}
