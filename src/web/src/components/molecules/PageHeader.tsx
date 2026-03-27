import { useTheme } from "../theme/ThemeContext";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  style?: React.CSSProperties;
}

export function PageHeader({ title, subtitle, trailing, style }: PageHeaderProps) {
  const { theme } = useTheme();

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        flexWrap: "wrap",
        gap: theme.spacing.lg,
        ...style,
      }}
    >
      <div style={{ flex: "1 1 200px", minWidth: 0 }}>
        <h2
          style={{
            margin: 0,
            fontFamily: theme.font.headline,
            fontSize: theme.font.size.xl,
            fontWeight: 800,
            letterSpacing: theme.font.letterSpacing.tight,
            color: theme.color.text,
          }}
        >
          {title}
        </h2>
        {subtitle && (
          <p
            style={{
              margin: `${theme.spacing.xs} 0 0`,
              color: theme.color.textMuted,
              fontSize: theme.font.size.sm,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {trailing}
    </div>
  );
}
