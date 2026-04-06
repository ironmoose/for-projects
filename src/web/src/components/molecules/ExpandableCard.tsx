import { useEffect, useRef, useState, type ReactNode } from "react";
import { type Theme } from "../theme/theme";
import { useTheme } from "../theme/ThemeContext";
import { Card } from "./Card";
import { Icon } from "../atoms/Icon";

type CardVariant = "default" | "flat" | "elevated";

interface ExpandableCardProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  variant?: CardVariant;
  style?: React.CSSProperties;
  headerAction?: ReactNode;
}

export function ExpandableCard({
  title,
  children,
  defaultOpen = false,
  variant = "default",
  style,
  headerAction,
}: ExpandableCardProps) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(defaultOpen);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setOpen(defaultOpen);
  }, [defaultOpen]);

  return (
    <Card
      variant={variant}
      padding="xs"
      hover
      style={{ cursor: "pointer", ...style }}
      onClick={() => setOpen((prev) => !prev)}
    >
      <div
        style={{
          borderRadius: theme.radius.lg,
          padding: title
            ? `${theme.spacing.md} ${theme.spacing.md}`
            : `${theme.spacing.xs} ${theme.spacing.md}`,
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: title ? 44 : 28,
          boxSizing: "border-box",
        }}
      >
        {title && (
          <span
            style={{
              fontSize: theme.font.size.sm,
              fontWeight: 700,
              fontFamily: theme.font.headline,
              letterSpacing: theme.font.letterSpacing.tight,
              color: theme.color.text,
            }}
          >
            {title}
          </span>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: theme.spacing.xs, marginLeft: "auto", flexShrink: 0 }}>
          {open && headerAction && (
            <span onClick={(e) => e.stopPropagation()}>
              {headerAction}
            </span>
          )}
          <Icon
            name="chevron_right"
            size={18}
            style={{
              color: theme.color.textMuted,
              transform: open ? "rotate(90deg)" : "rotate(0deg)",
              transition: `transform ${theme.motion.fast} ${theme.motion.easing}`,
              flexShrink: 0,
            }}
          />
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateRows: open ? "1fr" : "0fr",
          transition: `grid-template-rows ${theme.motion.normal} ${theme.motion.easing}`,
        }}
      >
        <div style={{ overflow: "hidden", minHeight: 0 }}>
          <div
            style={{
              padding: `${theme.spacing.sm} ${theme.spacing.md} ${theme.spacing.md}`,
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </Card>
  );
}
