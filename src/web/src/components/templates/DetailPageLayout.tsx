import { useTheme } from "../theme/ThemeContext";

interface DetailPageLayoutProps {
  children: React.ReactNode;
  expanded?: boolean;
  style?: React.CSSProperties;
}

export function DetailPageLayout({ children, expanded, style }: DetailPageLayoutProps) {
  const { theme } = useTheme();

  return (
    <div
      style={{
        height: "100%",
        minHeight: 0,
        overflow: "hidden",
        flex: 1,
        width: "100%",
        maxWidth: expanded ? 1800 : 900,
        display: "flex",
        gap: theme.spacing.xl,
        boxSizing: "border-box",
        transition: `max-width ${theme.motion.normal} ease`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
