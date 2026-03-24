import { useTheme } from "./ThemeContext";
import { ThemeSwitcher } from "./ThemeSwitcher";

export function TopBar() {
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
          justifyContent: "flex-end",
          alignItems: "center",
          width: "100%",
          maxWidth: 1400,
          padding: `${theme.spacing.md} ${theme.spacing["2xl"]}`,
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  );
}
