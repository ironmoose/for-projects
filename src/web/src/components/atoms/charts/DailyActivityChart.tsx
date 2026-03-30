import { useTheme } from "../../theme/ThemeContext";
import type { RunDailyStats } from "../../../types";

interface DailyActivityChartProps {
  data: RunDailyStats[];
  width?: number;
  height?: number;
}

interface DayBucket {
  date: string;
  done: number;
  failed: number;
  running: number;
}

export function DailyActivityChart({ data, width = 600, height = 200 }: DailyActivityChartProps) {
  const { theme } = useTheme();

  // Aggregate by date
  const bucketMap = new Map<string, DayBucket>();
  for (const row of data) {
    let bucket = bucketMap.get(row.date);
    if (!bucket) {
      bucket = { date: row.date, done: 0, failed: 0, running: 0 };
      bucketMap.set(row.date, bucket);
    }
    if (row.status === "done") bucket.done += row.count;
    else if (row.status === "failed") bucket.failed += row.count;
    else if (row.status === "running") bucket.running += row.count;
  }

  const buckets = Array.from(bucketMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  if (buckets.length === 0) return null;

  const padding = { top: 20, right: 12, bottom: 32, left: 36 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxTotal = Math.max(...buckets.map((b) => b.done + b.failed + b.running), 1);
  const barWidth = Math.max(2, (chartW / buckets.length) * 0.7);
  const gap = (chartW / buckets.length) * 0.3;

  // Y-axis ticks
  const tickCount = 4;
  const yTicks = Array.from({ length: tickCount + 1 }, (_, i) => Math.round((maxTotal / tickCount) * i));

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ display: "block" }}
    >
      {/* Y-axis grid lines and labels */}
      {yTicks.map((tick) => {
        const y = padding.top + chartH - (tick / maxTotal) * chartH;
        return (
          <g key={tick}>
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
              fontSize={10}
              fontFamily={theme.font.mono}
            >
              {tick}
            </text>
          </g>
        );
      })}

      {/* Bars */}
      {buckets.map((bucket, i) => {
        const x = padding.left + i * (barWidth + gap) + gap / 2;
        const total = bucket.done + bucket.failed + bucket.running;
        const totalH = (total / maxTotal) * chartH;

        // Stack order: done (bottom), failed, running (top)
        const doneH = (bucket.done / maxTotal) * chartH;
        const failedH = (bucket.failed / maxTotal) * chartH;
        const runningH = (bucket.running / maxTotal) * chartH;

        const baseY = padding.top + chartH;

        return (
          <g key={bucket.date}>
            {bucket.done > 0 && (
              <rect
                x={x}
                y={baseY - doneH}
                width={barWidth}
                height={doneH}
                rx={2}
                fill={theme.color.success}
                opacity={0.85}
              />
            )}
            {bucket.failed > 0 && (
              <rect
                x={x}
                y={baseY - doneH - failedH}
                width={barWidth}
                height={failedH}
                rx={2}
                fill={theme.color.danger}
                opacity={0.85}
              />
            )}
            {bucket.running > 0 && (
              <rect
                x={x}
                y={baseY - totalH}
                width={barWidth}
                height={runningH}
                rx={2}
                fill={theme.color.running}
                opacity={0.85}
              />
            )}
            {/* Date label — show every Nth to avoid clutter */}
            {(buckets.length <= 14 || i % Math.ceil(buckets.length / 10) === 0) && (
              <text
                x={x + barWidth / 2}
                y={height - 6}
                textAnchor="middle"
                fill={theme.color.textFaint}
                fontSize={9}
                fontFamily={theme.font.mono}
              >
                {bucket.date.slice(5)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
