import { semantic as t } from "@4lt7ab/ui/core";
import { useTheme } from "../theme/ThemeContext";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: number | string;
  style?: React.CSSProperties;
}

export function Skeleton({ width = "100%", height = 16, borderRadius, style }: SkeletonProps) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: borderRadius ?? t.radiusMd,
        background: `linear-gradient(90deg, ${t.colorSurface} 25%, ${t.colorSurfaceRaised} 50%, ${t.colorSurface} 75%)`,
        backgroundSize: "200px 100%",
        animation: "shimmer 1.2s ease-in-out infinite",
        ...style,
      }}
    />
  );
}

interface CardSkeletonProps {
  style?: React.CSSProperties;
}

export function CardSkeleton({ style }: CardSkeletonProps) {
  const { theme } = useTheme();

  return (
    <div
      style={{
        padding: theme.spacing.lg,
        borderRadius: t.radiusLg,
        background: t.colorSurface,
        border: `1px solid ${theme.color.borderSubtle}`,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.sm,
        ...style,
      }}
    >
      <Skeleton width={60} height={20} borderRadius={t.radiusMd} />
      <Skeleton width="80%" height={18} />
      <Skeleton width="60%" height={14} />
      <div style={{ marginTop: "auto", paddingTop: theme.spacing.sm }}>
        <Skeleton width={80} height={12} />
      </div>
    </div>
  );
}

interface RowSkeletonProps {
  style?: React.CSSProperties;
}

export function RowSkeleton({ style }: RowSkeletonProps) {
  const { theme } = useTheme();

  return (
    <div
      style={{
        padding: `${theme.spacing.sm} ${theme.spacing.md}`,
        borderRadius: t.radiusLg,
        background: t.colorSurface,
        display: "flex",
        alignItems: "center",
        gap: theme.spacing.sm,
        ...style,
      }}
    >
      <Skeleton width={30} height={14} />
      <Skeleton width="60%" height={14} />
      <div style={{ marginLeft: "auto" }}>
        <Skeleton width={60} height={20} />
      </div>
    </div>
  );
}
