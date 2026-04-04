import { useTheme } from "../theme/ThemeContext";

export interface NavItem {
  label: string;
  path: string;
  icon?: string;
}

interface TopBarProps {
  trailing?: React.ReactNode;
  navItems?: NavItem[];
  activePath?: string;
  onNavigate?: (path: string) => void;
  breadcrumb?: string[];
}

let topBarStylesInjected = false;

function injectTopBarStyles() {
  if (topBarStylesInjected || typeof document === "undefined") return;
  topBarStylesInjected = true;
  const style = document.createElement("style");
  style.textContent = `
    .topbar-nav-btn {
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.25rem;
      background: transparent;
      position: relative;
      padding-bottom: 0.375rem;
      transition: color 0.15s;
    }
    .topbar-nav-btn::after {
      content: "";
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: 2px;
      background: transparent;
      transition: background 0.15s;
    }
    .topbar-nav-btn:hover {
      color: var(--topbar-text) !important;
    }
    .topbar-nav-btn[data-active="true"]::after {
      background: var(--topbar-primary);
      box-shadow: 0 0 8px var(--topbar-primary);
    }
  `;
  document.head.appendChild(style);
}

export function TopBar({
  trailing,
  navItems,
  activePath,
  onNavigate,
  breadcrumb,
}: TopBarProps) {
  const { theme } = useTheme();

  injectTopBarStyles();

  const cssVars = {
    "--topbar-text": theme.color.text,
    "--topbar-primary": theme.glow.accentColor !== theme.color.textMuted ? theme.glow.accentColor : theme.color.primary,
  } as React.CSSProperties;

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        height: 48,
        padding: `0 ${theme.spacing.xl}`,
        boxSizing: "border-box",
        background: theme.glow.animated ? `${theme.color.surfaceContainer}dd` : `${theme.color.surfaceContainer}cc`,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: `1px solid ${theme.glow.animated ? theme.glow.borderMedium : theme.color.borderSubtle}`,
        boxShadow: theme.glow.animated ? `0 2px 20px ${theme.glow.borderSubtle}, 0 1px 0 ${theme.glow.borderMedium}` : "none",
        ...cssVars,
      }}
    >
      {/* Left: Nav tabs */}
      <nav style={{ display: "flex", alignItems: "center", gap: theme.spacing.xs }}>
        {navItems?.map((item) => {
          const isActive =
            activePath === item.path ||
            (item.path === "/" && activePath === "/") ||
            (item.path !== "/" && activePath?.startsWith(item.path));

          return (
            <button
              key={item.path}
              className="topbar-nav-btn"
              data-active={isActive ? "true" : undefined}
              onClick={() => onNavigate?.(item.path)}
              style={{
                padding: `${theme.spacing.xs} ${theme.spacing.md}`,
                fontSize: theme.font.size.sm,
                fontWeight: isActive ? 700 : 500,
                fontFamily: theme.font.body,
                color: isActive ? theme.color.text : theme.color.textMuted,
              }}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Center: Breadcrumb */}
      {breadcrumb && breadcrumb.length > 0 && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            fontFamily: theme.font.mono,
            fontSize: theme.font.size.xs,
            color: theme.color.textFaint,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: "40%",
          }}
        >
          {breadcrumb.join(" / ")}
        </div>
      )}

      {/* Right: trailing (ConnectionStatus, ActivityIndicator, etc.) */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {trailing}
      </div>
    </header>
  );
}
