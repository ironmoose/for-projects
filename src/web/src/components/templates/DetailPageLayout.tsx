import { semantic as t } from "@4lt7ab/ui/core";

interface DetailPageLayoutProps {
  children: React.ReactNode;
  expanded?: boolean;
  style?: React.CSSProperties;
}

export function DetailPageLayout({ children, expanded, style }: DetailPageLayoutProps) {
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
        gap: t.spaceXl,
        boxSizing: "border-box",
        transition: "max-width 0.2s ease",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
