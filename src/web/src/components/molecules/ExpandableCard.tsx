import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTheme } from "../theme/ThemeContext";
import { Card } from "./Card";
import { Icon } from "../atoms/Icon";

type CardVariant = "default" | "flat" | "elevated";

interface ExpandableCardProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  /** Controlled open state. When provided, internal state is ignored. */
  open?: boolean;
  /** Called when the user clicks to expand/collapse. Receives the new open state. */
  onToggle?: (open: boolean) => void;
  variant?: CardVariant;
  style?: React.CSSProperties;
  headerAction?: ReactNode;
}

export function ExpandableCard({
  title,
  children,
  defaultOpen = false,
  open: controlledOpen,
  onToggle,
  variant = "default",
  style,
  headerAction,
}: ExpandableCardProps) {
  const { theme } = useTheme();
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setInternalOpen(defaultOpen);
  }, [defaultOpen]);

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;

  const handleClick = () => {
    const next = !isOpen;
    if (!isControlled) {
      setInternalOpen(next);
    }
    onToggle?.(next);
  };

  return (
    <Card
      variant={variant}
      padding="xs"
      hover
      style={{ cursor: "pointer", ...style }}
      onClick={handleClick}
    >
      <div
        style={{
          borderRadius: theme.radius.lg,
          padding: `${theme.spacing.md} ${theme.spacing.md}`,
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: 44,
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
          {isOpen && headerAction && (
            <span onClick={(e) => e.stopPropagation()}>
              {headerAction}
            </span>
          )}
          <Icon
            name="chevron_right"
            size={18}
            style={{
              color: theme.color.textMuted,
              transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
              transition: `transform ${theme.motion.fast} ${theme.motion.easing}`,
              flexShrink: 0,
            }}
          />
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateRows: isOpen ? "1fr" : "0fr",
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
