import { useTheme, PageHeader, ListPageLayout } from "../components";
import { themes } from "../components/theme/theme";
import type { Theme } from "../components/theme/theme";

// ---------------------------------------------------------------------------
// Theme preview card
// ---------------------------------------------------------------------------

function ThemeCard({
  theme,
  themeName,
  isActive,
  onSelect,
}: {
  theme: Theme;
  themeName: string;
  isActive: boolean;
  onSelect: () => void;
}) {
  const { theme: currentTheme } = useTheme();

  const swatches = [
    theme.color.primary,
    theme.color.success,
    theme.color.danger,
    theme.color.warning,
    theme.color.tertiary,
  ];

  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      style={{
        position: "relative",
        minHeight: 200,
        background: theme.color.surfaceContainer,
        borderRadius: currentTheme.radius.xl,
        border: isActive
          ? `2px solid ${currentTheme.color.primary}`
          : `1px solid ${theme.color.borderSubtle}`,
        boxShadow: isActive ? `0 0 16px 2px ${currentTheme.color.primary}26` : "none",
        cursor: "pointer",
        padding: currentTheme.spacing.xl,
        display: "flex",
        flexDirection: "column",
        gap: currentTheme.spacing.md,
        transition: `border-color ${currentTheme.animation.duration.fast}, box-shadow ${currentTheme.animation.duration.fast}`,
        overflow: "hidden",
      }}
    >
      {/* Left accent bar */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          background: theme.color.primary,
          borderRadius: `${currentTheme.radius.xl}px 0 0 ${currentTheme.radius.xl}px`,
        }}
      />

      {/* Theme name */}
      <h3
        style={{
          margin: 0,
          fontFamily: currentTheme.font.headline,
          fontSize: currentTheme.font.size.lg,
          fontWeight: 700,
          color: theme.color.text,
          lineHeight: 1.3,
        }}
      >
        {theme.label}
      </h3>

      {/* Color swatches */}
      <div style={{ display: "flex", gap: currentTheme.spacing.sm }}>
        {swatches.map((color, i) => (
          <div
            key={i}
            style={{
              width: 12,
              height: 12,
              borderRadius: currentTheme.radius.full,
              background: color,
              flexShrink: 0,
            }}
          />
        ))}
      </div>

      {/* Surface preview strip */}
      <div
        style={{
          display: "flex",
          gap: 2,
          borderRadius: currentTheme.radius.md,
          overflow: "hidden",
          marginTop: "auto",
        }}
      >
        {[
          theme.color.surface,
          theme.color.surfaceContainerLow,
          theme.color.surfaceContainer,
          theme.color.surfaceContainerHigh,
          theme.color.surfaceContainerHighest,
        ].map((c, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 24,
              background: c,
            }}
          />
        ))}
      </div>

      {/* Text preview */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: currentTheme.font.size.xs, color: theme.color.text }}>
          Primary text
        </span>
        <span style={{ fontSize: currentTheme.font.size.xs, color: theme.color.textMuted }}>
          Muted text
        </span>
        <span style={{ fontSize: currentTheme.font.size.xs, color: theme.color.textFaint }}>
          Faint text
        </span>
      </div>

      {/* Active badge */}
      {isActive && (
        <span
          style={{
            position: "absolute",
            top: currentTheme.spacing.md,
            right: currentTheme.spacing.md,
            fontSize: currentTheme.font.size.xxs,
            fontWeight: 600,
            color: currentTheme.color.primary,
            background: `${currentTheme.color.primary}26`,
            borderRadius: currentTheme.radius.full,
            padding: `2px ${currentTheme.spacing.sm}`,
          }}
        >
          Active
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ThemesPage
// ---------------------------------------------------------------------------

export function ThemesPage() {
  const { theme, themeName, setTheme } = useTheme();

  const themeEntries = Object.entries(themes);

  return (
    <ListPageLayout>
      <PageHeader
        title="Themes"
        subtitle="Choose a theme for your workspace. All themes are dark-mode optimized for mission control aesthetics."
        style={{ marginBottom: theme.spacing.xl }}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: theme.spacing.lg,
        }}
      >
        {themeEntries.map(([name, t]) => (
          <ThemeCard
            key={name}
            theme={t}
            themeName={name}
            isActive={themeName === name}
            onSelect={() => setTheme(name)}
          />
        ))}
      </div>
    </ListPageLayout>
  );
}
