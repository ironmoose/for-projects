import { useInjectStyles, semantic as t } from "@4lt7ab/ui/core";
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

export function TopBar({
  trailing,
  navItems,
  activePath,
  onNavigate,
  breadcrumb,
}: TopBarProps) {
  const { theme } = useTheme();

  useInjectStyles("tfp-topbar", `
    .tfp-topbar-nav-btn {
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
    .tfp-topbar-nav-btn::after {
      content: "";
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: 2px;
      background: transparent;
      transition: background 0.15s;
    }
    .tfp-topbar-nav-btn:hover {
      color: var(--topbar-text) !important;
    }
    .tfp-topbar-nav-btn:focus-visible {
      outline: 2px solid var(--focus-ring-color);
      outline-offset: 2px;
    }
    .tfp-topbar-nav-btn[data-active="true"]::after {
      background: var(--topbar-primary);
      box-shadow: 0 0 8px var(--topbar-primary);
    }
  `);

  const cssVars = {
    "--topbar-text": t.colorText,
    "--topbar-primary": theme.glow.accentColor !== t.colorTextMuted ? theme.glow.accentColor : t.colorActionPrimary,
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
        padding: `0 ${t.spaceXl}`,
        boxSizing: "border-box",
        background: theme.glow.animated ? `color-mix(in srgb, ${t.colorSurface} 87%, transparent)` : `color-mix(in srgb, ${t.colorSurface} 80%, transparent)`,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: `1px solid ${theme.glow.animated ? theme.glow.borderMedium : `color-mix(in srgb, ${t.colorBorder} 50%, transparent)`}`,
        boxShadow: theme.glow.animated ? `0 2px 20px ${theme.glow.borderSubtle}, 0 1px 0 ${theme.glow.borderMedium}` : "none",
        ...cssVars,
      }}
    >
      {/* Left: Nav tabs */}
      <nav style={{ display: "flex", alignItems: "center", gap: t.spaceXs }}>
        {navItems?.map((item) => {
          const isActive =
            activePath === item.path ||
            (item.path === "/" && activePath === "/") ||
            (item.path !== "/" && activePath?.startsWith(item.path));

          return (
            <button
              key={item.path}
              className="tfp-topbar-nav-btn"
              data-active={isActive ? "true" : undefined}
              onClick={() => onNavigate?.(item.path)}
              style={{
                padding: `${t.spaceXs} ${t.spaceMd}`,
                fontSize: t.fontSizeSm,
                fontWeight: isActive ? 700 : 500,
                fontFamily: t.fontSans,
                color: isActive ? t.colorText : t.colorTextMuted,
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
            fontFamily: t.fontMono,
            fontSize: t.fontSizeXs,
            color: t.colorTextSecondary,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: "40%",
          }}
        >
          {breadcrumb.join(" / ")}
        </div>
      )}

      {/* Right: trailing (ConnectionStatus, theme picker, etc.) */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {trailing}
      </div>
    </header>
  );
}
