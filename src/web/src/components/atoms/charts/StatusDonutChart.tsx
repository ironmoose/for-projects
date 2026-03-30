import { useTheme } from "../../theme/ThemeContext";
import type { ActionLogSummaryStats } from "../../../types";

interface StatusDonutChartProps {
  summary: ActionLogSummaryStats;
  width?: number;
  height?: number;
}

export function StatusDonutChart({ summary, width = 200, height = 200 }: StatusDonutChartProps) {
  const { theme } = useTheme();

  const total = summary.done + summary.failed + summary.running;
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(cx, cy) - 20;
  const strokeWidth = r * 0.35;
  const circumference = 2 * Math.PI * r;

  if (total === 0) {
    return (
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: "block" }}
      >
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={theme.color.borderSubtle}
          strokeWidth={strokeWidth}
        />
        <text
          x={cx}
          y={cy + 4}
          textAnchor="middle"
          fill={theme.color.textMuted}
          fontSize={14}
          fontFamily={theme.font.body}
        >
          No data
        </text>
      </svg>
    );
  }

  const segments: Array<{ value: number; color: string; label: string }> = [
    { value: summary.done, color: theme.color.success, label: "Done" },
    { value: summary.failed, color: theme.color.danger, label: "Failed" },
    { value: summary.running, color: theme.color.running, label: "Running" },
  ];

  let offset = 0;

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ display: "block" }}
    >
      {/* Background ring */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={theme.color.borderSubtle}
        strokeWidth={strokeWidth}
      />
      {/* Segments */}
      {segments.map((seg) => {
        if (seg.value === 0) return null;
        const dash = (seg.value / total) * circumference;
        const gapVal = circumference - dash;
        const rotation = (offset / total) * 360 - 90;
        offset += seg.value;
        return (
          <circle
            key={seg.label}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${dash} ${gapVal}`}
            strokeLinecap="butt"
            transform={`rotate(${rotation} ${cx} ${cy})`}
            opacity={0.85}
          />
        );
      })}
      {/* Center text */}
      <text
        x={cx}
        y={cy - 4}
        textAnchor="middle"
        fill={theme.color.text}
        fontSize={22}
        fontWeight={600}
        fontFamily={theme.font.headline}
      >
        {summary.total}
      </text>
      <text
        x={cx}
        y={cy + 14}
        textAnchor="middle"
        fill={theme.color.textMuted}
        fontSize={11}
        fontFamily={theme.font.body}
      >
        total
      </text>
    </svg>
  );
}
