import { useTheme } from "./ThemeContext";
import { ThemeSwitcher } from "./ThemeSwitcher";

export interface NavItem {
  label: string;
  path: string;
  icon?: string;
}

export function TopBar({
  trailing,
  navItems,
  activePath,
  onNavigate,
}: {
  trailing?: React.ReactNode;
  navItems?: NavItem[];
  activePath?: string;
  onNavigate?: (path: string) => void;
}) {
  const { theme } = useTheme();

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        display: "flex",
        justifyContent: "center",
        background: `${theme.color.surfaceContainer}cc`,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        boxShadow: theme.shadow.sm,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
          maxWidth: 1400,
          padding: `${theme.spacing.md} ${theme.spacing["2xl"]}`,
          boxSizing: "border-box",
          gap: 8,
        }}
      >
        {/* Nav links */}
        <nav style={{ display: "flex", alignItems: "center", gap: theme.spacing.xs }}>
          {navItems?.map((item) => {
            const isActive =
              activePath === item.path ||
              (item.path === "/" && activePath === "/") ||
              (item.path !== "/" && activePath?.startsWith(item.path));

            return (
              <button
                key={item.path}
                onClick={() => onNavigate?.(item.path)}
                style={{
                  background: isActive ? theme.color.surfaceContainerHigh : "transparent",
                  border: "none",
                  borderRadius: theme.radius.md,
                  padding: `${theme.spacing.xs} ${theme.spacing.md}`,
                  fontSize: theme.font.size.sm,
                  fontWeight: isActive ? 700 : 500,
                  fontFamily: theme.font.body,
                  color: isActive ? theme.color.text : theme.color.textMuted,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  display: "flex",
                  alignItems: "center",
                  gap: theme.spacing.xs,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.color = theme.color.text;
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.color = theme.color.textMuted;
                }}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {trailing}
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  );
}
