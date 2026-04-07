import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTheme } from "../theme/ThemeContext";
import { Card } from "./Card";
import { Icon } from "../atoms/Icon";

type CardVariant = "default" | "flat" | "elevated";

interface ExpandableCardProps {
  title: string;
  children: ReactNode;
  /** Initial open state for uncontrolled mode. */
  defaultOpen?: boolean;
  /** Controlled open state. When provided, component is controlled. */
  open?: boolean;
  /** Called when the header is clicked. Receives the new desired open state. */
  onToggle?: (isOpen: boolean) => void;
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
  const [headerHovered, setHeaderHovered] = useState(false);
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isFirstRender = useRef(true);

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;

  useEffect(() => {
    if (isControlled) return;
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setInternalOpen(defaultOpen);
  }, [defaultOpen, isControlled]);

  const handleHeaderClick = () => {
    const nextOpen = !isOpen;
    if (onToggle) {
      onToggle(nextOpen);
    }
    if (!isControlled) {
      setInternalOpen(nextOpen);
    }
  };

  return (
    <Card
      variant={variant}
      padding="xs"
      style={style}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={handleHeaderClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleHeaderClick();
          }
        }}
        onMouseEnter={() => setHeaderHovered(true)}
        onMouseLeave={() => setHeaderHovered(false)}
        style={{
          borderRadius: theme.radius.lg,
          padding: `${theme.spacing.md} ${theme.spacing.md}`,
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: 44,
          boxSizing: "border-box",
          cursor: "pointer",
          background: headerHovered ? theme.color.surfaceContainerHigh : "transparent",
          transition: `background ${theme.motion.fast} ${theme.motion.easing}`,
        }}
      >
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
