import { useState } from "react";
import { useTheme } from "../theme/ThemeContext";
import { Icon } from "../atoms/Icon";

interface CollapsibleSectionProps {
  label: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function CollapsibleSection({
  label,
  defaultOpen = true,
  children,
  style,
}: CollapsibleSectionProps) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={style}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          width: "100%",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            display: "block",
            fontSize: theme.font.size.xxs,
            fontWeight: 700,
            letterSpacing: theme.font.letterSpacing.wide,
            textTransform: "uppercase",
            color: theme.color.textFaint,
          }}
        >
          {label}
        </span>
        <Icon
          name="chevron_right"
          size={14}
          style={{
            color: theme.color.textFaint,
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
            transition: `transform ${theme.motion.fast} ${theme.motion.easing}`,
          }}
        />
      </button>
      <div
        style={{
          display: "grid",
          gridTemplateRows: open ? "1fr" : "0fr",
          transition: `grid-template-rows ${theme.motion.normal} ${theme.motion.easing}`,
        }}
      >
        <div style={{ overflow: "hidden", minHeight: 0 }}>{children}</div>
      </div>
    </div>
  );
}
