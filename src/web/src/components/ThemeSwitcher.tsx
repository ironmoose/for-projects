import { themes } from "./theme";
import { useTheme } from "./ThemeContext";

export function ThemeSwitcher() {
  const { theme, themeName, setTheme } = useTheme();

  return (
    <div style={{ display: "flex", gap: theme.spacing.sm, alignItems: "center" }}>
      {Object.values(themes).map((t) => {
        const active = themeName === t.name;
        return (
          <button
            key={t.name}
            onClick={() => setTheme(t.name)}
            title={t.label}
            style={{
              width: 28,
              height: 28,
              borderRadius: theme.radius.full,
              border: active
                ? `2px solid ${theme.color.text}`
                : `2px solid ${theme.color.border}`,
              background: t.color.surfaceContainer,
              cursor: "pointer",
              padding: 0,
              boxShadow: active ? `0 0 0 2px ${t.color.primary}` : "none",
              position: "relative",
              transition: "box-shadow 0.15s, border-color 0.15s",
            }}
            aria-label={`Switch to ${t.label} theme`}
          >
            <span
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: 12,
                height: 12,
                borderRadius: theme.radius.full,
                background: t.color.primary,
              }}
            />
          </button>
        );
      })}
    </div>
  );
}
