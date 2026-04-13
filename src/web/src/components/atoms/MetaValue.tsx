import { semantic as t } from "@4lt7ab/ui/core";

interface MetaValueProps {
  label: string;
  value: string;
  style?: React.CSSProperties;
}

export function MetaValue({ label, value, style }: MetaValueProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        ...style,
      }}
    >
      <span style={{ fontSize: t.fontSizeXs, color: t.colorTextSecondary }}>{label}</span>
      <span
        style={{
          fontSize: t.fontSizeXs,
          color: t.colorTextMuted,
          fontFamily: t.fontMono,
          textAlign: "right",
        }}
      >
        {value}
      </span>
    </div>
  );
}
