import { useTheme } from "../theme/ThemeContext";

interface ListPageLayoutProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function ListPageLayout({ children, style }: ListPageLayoutProps) {
  const { theme } = useTheme();

  return (
    <div
      style={{
        flex: 1,
        width: "100%",
        maxWidth: 1400,
        padding: `${theme.spacing["2xl"]} ${theme.spacing.xl}`,
        boxSizing: "border-box",
        overflowY: "auto",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
