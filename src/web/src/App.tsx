import { useEffect, useMemo, useState } from "react";
import { ThemeBackground } from "@4lt7ab/ui/animations";
import {
  ThemeSurface,
  ThemePicker,
  AlertBanner,
  ShortcutHelpModal,
  TopBar,
  ErrorBoundary,
  StatusDot,
} from "@4lt7ab/ui/ui";
import type { NavItem } from "@4lt7ab/ui/ui";
import { semantic as t, useInjectStyles } from "@4lt7ab/ui/core";
import { useRealtimeEvents } from "./useRealtimeEvents";
import {
  useHashRoute,
  useEventFanOut,
  EventSubscriptionContext,
  useWindowWidth,
  SMALL_BREAKPOINT,
} from "./hooks";
import {
  useKeyboardShortcutManager,
  useShortcut,
  KeyboardShortcutContext,
} from "./hooks/useKeyboardShortcuts";
import { useReducedMotion } from "./hooks/useReducedMotion";
import { KnowledgeBasePage } from "./pages/KnowledgeBasePage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { ProjectDetailPage } from "./pages/ProjectDetailPage";
import { TasksPage } from "./pages/TasksPage";
import { AutomationsPage } from "./pages/AutomationsPage";

const navItems: NavItem[] = [
  { label: "Projects", path: "/" },
  { label: "Tasks", path: "/tasks" },
  { label: "Knowledge Base", path: "/kb" },
  { label: "Automations", path: "/automations" },
];

// Shorter labels used below SMALL_BREAKPOINT so the TopBar content fits without
// wrapping or horizontal scroll on phone-width viewports. Visible text remains
// the accessible name — no aria-label handling needed.
const compactNavItems: NavItem[] = [
  { label: "Proj", path: "/" },
  { label: "Tasks", path: "/tasks" },
  { label: "KB", path: "/kb" },
  { label: "Auto", path: "/automations" },
];

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export function App() {
  const { path, navigate } = useHashRoute();
  const { onEvent, subscribeEvents } = useEventFanOut();
  const { connected } = useRealtimeEvents(onEvent);
  const shortcutManager = useKeyboardShortcutManager();
  const windowWidth = useWindowWidth();
  const isSmallViewport = windowWidth < SMALL_BREAKPOINT;

  const activePath = path.startsWith("/kb")
    ? "/kb"
    : path.startsWith("/tasks")
    ? "/tasks"
    : path.startsWith("/automations")
    ? "/automations"
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
    if (path.startsWith("/tasks")) {
      return <TasksPage />;
    }
    if (path.startsWith("/kb")) {
      return <KnowledgeBasePage />;
    }
    if (path.startsWith("/automations")) {
      return <AutomationsPage />;
    }
    if (path.startsWith("/projects/")) {
      const projectId = path.replace("/projects/", "");
      return <ProjectDetailPage projectId={projectId} onBack={() => navigate("/")} />;
    }
    return <ProjectsPage onOpenProject={(pId) => navigate(`/projects/${pId}`)} />;
  }

  return (
    <KeyboardShortcutContext.Provider value={shortcutCtx}>
      <EventSubscriptionContext.Provider value={eventCtx}>
        <ThemeSurface global />
        <ThemeBackground />
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
            title="Tab"
            trailing={<TrailingIndicators connected={connected} compact={isSmallViewport} />}
            items={isSmallViewport ? compactNavItems : navItems}
            activePath={activePath}
            onNavigate={navigate}
          />
          <DisconnectionAlert connected={connected} />
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
// DisconnectionAlert
// ---------------------------------------------------------------------------

const DISCONNECT_THRESHOLD_MS = 10_000;

function DisconnectionAlert({ connected }: { connected: boolean }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (connected) { setShow(false); return; }
    const timer = setTimeout(() => setShow(true), DISCONNECT_THRESHOLD_MS);
    return () => clearTimeout(timer);
  }, [connected]);

  if (!show) return null;

  return (
    <AlertBanner variant="warning">
      Connection lost. Attempting to reconnect...
    </AlertBanner>
  );
}

// ---------------------------------------------------------------------------
// GlobalShortcuts
// ---------------------------------------------------------------------------

function GlobalShortcuts({ navigate }: { navigate: (path: string) => void }) {
  const [showHelp, setShowHelp] = useState(false);
  const manager = useKeyboardShortcutManager();

  useShortcut("?", "Show keyboard shortcuts", () => setShowHelp((prev) => !prev), "Global");
  useShortcut("g p", "Go to projects", () => navigate("/"), "Navigation");
  useShortcut("g t", "Go to tasks", () => navigate("/tasks"), "Navigation");
  useShortcut("g k", "Go to knowledge base", () => navigate("/kb"), "Navigation");
  useShortcut("g a", "Go to automations", () => navigate("/automations"), "Navigation");

  if (!showHelp) return null;

  const registered = manager.getShortcuts();
  const groupMap = new Map<string, { keys: string[]; description: string }[]>();
  for (const s of registered) {
    const group = s.scope ?? "General";
    if (!groupMap.has(group)) groupMap.set(group, []);
    groupMap.get(group)!.push({ keys: s.key.split(" "), description: s.description });
  }
  const shortcuts = Array.from(groupMap.entries()).map(([group, items]) => ({ group, shortcuts: items }));

  return <ShortcutHelpModal shortcuts={shortcuts} onClose={() => setShowHelp(false)} />;
}

// ---------------------------------------------------------------------------
// ConnectionStatus — inline, no external component
// ---------------------------------------------------------------------------

const CONNECTION_CSS = `
  @keyframes pulse-alive { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
`;

function ConnectionStatusDot({ connected }: { connected: boolean }) {
  useInjectStyles("tfp-connection", CONNECTION_CSS);
  const reduced = useReducedMotion();
  const isPulsing = !connected && !reduced;

  return (
    <span
      title={connected ? "Live updates active" : "Reconnecting..."}
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: t.radiusFull,
        background: connected ? t.colorSuccess : t.colorTextSecondary,
        transition: "background 0.2s ease",
        animation: isPulsing ? "pulse-alive 2s ease-in-out infinite" : undefined,
      }}
    />
  );
}

function TrailingIndicators({ connected, compact = false }: { connected: boolean; compact?: boolean }) {
  // On small viewports ThemePicker is hidden to free space for the nav.
  // ConnectionStatusDot is the load-bearing indicator and always stays visible.
  return (
    <div style={{ display: "flex", alignItems: "center", gap: t.spaceSm }}>
      {!compact && <ThemePicker variant="compact" />}
      <ConnectionStatusDot connected={connected} />
    </div>
  );
}
