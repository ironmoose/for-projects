import { semantic as t } from "@4lt7ab/ui/core";

interface ListPageLayoutProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function ListPageLayout({ children, style }: ListPageLayoutProps) {
  return (
    <div
      style={{
        flex: 1,
        width: "100%",
        maxWidth: 1400,
        alignSelf: "center",
        padding: `${t.space2xl} ${t.spaceXl}`,
        boxSizing: "border-box",
        overflowY: "auto",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
