import { semantic as t } from "@4lt7ab/ui/core";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  indicator?: React.ReactNode;
  style?: React.CSSProperties;
}

export function PageHeader({ title, subtitle, trailing, indicator, style }: PageHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        flexWrap: "wrap",
        gap: t.spaceLg,
        ...style,
      }}
    >
      <div style={{ flex: "1 1 200px", minWidth: 0 }}>
        <h2
          style={{
            margin: 0,
            fontFamily: t.fontSerif,
            fontSize: t.fontSizeXl,
            fontWeight: 800,
            letterSpacing: t.letterSpacingTight,
            color: t.colorText,
          }}
        >
          {title}
        </h2>
        {indicator && (
          <div style={{ marginTop: t.spaceXs }}>
            {indicator}
          </div>
        )}
        {subtitle && (
          <p
            style={{
              margin: `${t.spaceXs} 0 0`,
              color: t.colorTextMuted,
              fontSize: t.fontSizeSm,
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
