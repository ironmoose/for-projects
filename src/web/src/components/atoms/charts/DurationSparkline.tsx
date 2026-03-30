import { useTheme } from "../../theme/ThemeContext";
import type { ActionLogDailyStats } from "../../../types";

interface DurationSparklineProps {
  data: ActionLogDailyStats[];
  width?: number;
  height?: number;
}

interface DayDuration {
  date: string;
  avg: number;
}

export function DurationSparkline({ data, width = 400, height = 120 }: DurationSparklineProps) {
  const { theme } = useTheme();

  // Aggregate avg duration by date (weighted average)
  const dayMap = new Map<string, { totalMs: number; totalCount: number }>();
  for (const row of data) {
    if (row.avg_duration_ms == null) continue;
    const entry = dayMap.get(row.date) ?? { totalMs: 0, totalCount: 0 };
    entry.totalMs += row.avg_duration_ms * row.count;
    entry.totalCount += row.count;
    dayMap.set(row.date, entry);
  }

  const points: DayDuration[] = [];
  for (const [date, entry] of dayMap) {
    if (entry.totalCount > 0) {
      points.push({ date, avg: entry.totalMs / entry.totalCount });
    }
  }
  points.sort((a, b) => a.date.localeCompare(b.date));

  if (points.length === 0) return null;

  const padding = { top: 16, right: 12, bottom: 28, left: 48 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxVal = Math.max(...points.map((p) => p.avg), 1);

  function toX(i: number): number {
    return padding.left + (points.length === 1 ? chartW / 2 : (i / (points.length - 1)) * chartW);
  }

  function toY(val: number): number {
    return padding.top + chartH - (val / maxVal) * chartH;
  }

  const polylinePoints = points.map((p, i) => `${toX(i)},${toY(p.avg)}`).join(" ");

  // Y-axis ticks
  const tickCount = 3;
  const yTicks = Array.from({ length: tickCount + 1 }, (_, i) => (maxVal / tickCount) * i);

  function formatMs(ms: number): string {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ display: "block" }}
    >
      {/* Grid lines */}
      {yTicks.map((tick, i) => {
        const y = toY(tick);
        return (
          <g key={i}>
            <line
              x1={padding.left}
              y1={y}
              x2={width - padding.right}
              y2={y}
              stroke={theme.color.borderSubtle}
              strokeWidth={1}
            />
            <text
              x={padding.left - 6}
              y={y + 4}
              textAnchor="end"
              fill={theme.color.textFaint}
              fontSize={9}
              fontFamily={theme.font.mono}
            >
              {formatMs(tick)}
            </text>
          </g>
        );
      })}

      {/* Line */}
      <polyline
        points={polylinePoints}
        fill="none"
        stroke={theme.color.primary}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Dots */}
      {points.map((p, i) => (
        <circle
          key={p.date}
          cx={toX(i)}
          cy={toY(p.avg)}
          r={3}
          fill={theme.color.primary}
        />
      ))}

      {/* X-axis date labels */}
      {points.map((p, i) => {
        if (points.length <= 14 || i % Math.ceil(points.length / 8) === 0) {
          return (
            <text
              key={p.date}
              x={toX(i)}
              y={height - 6}
              textAnchor="middle"
              fill={theme.color.textFaint}
              fontSize={9}
              fontFamily={theme.font.mono}
            >
              {p.date.slice(5)}
            </text>
          );
        }
        return null;
      })}
    </svg>
  );
}
