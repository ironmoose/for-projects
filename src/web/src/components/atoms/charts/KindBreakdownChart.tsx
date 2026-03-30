import { useTheme } from "../../theme/ThemeContext";
import type { RunDailyStats } from "../../../types";

interface KindBreakdownChartProps {
  data: RunDailyStats[];
  width?: number;
  height?: number;
}

export function KindBreakdownChart({ data, width = 400, height = 160 }: KindBreakdownChartProps) {
  const { theme } = useTheme();

  const agentColors: Record<string, string> = {
    "tab:orchestrator": theme.color.primary,
    "tab:executor": theme.color.tertiary,
  };

  // Aggregate counts by agent
  const agentMap = new Map<string, number>();
  for (const row of data) {
    agentMap.set(row.agent, (agentMap.get(row.agent) ?? 0) + row.count);
  }

  const agents = Array.from(agentMap.entries())
    .map(([agent, count]) => ({ agent, count }))
    .sort((a, b) => a.agent.localeCompare(b.agent));

  if (agents.length === 0) return null;

  const maxCount = Math.max(...agents.map((a) => a.count), 1);

  const padding = { top: 8, right: 12, bottom: 8, left: 100 };
  const chartW = width - padding.left - padding.right;
  const barHeight = 20;
  const barGap = 10;
  const totalHeight = Math.max(height, padding.top + padding.bottom + agents.length * (barHeight + barGap));

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${totalHeight}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ display: "block" }}
    >
      {agents.map((item, i) => {
        const y = padding.top + i * (barHeight + barGap);
        const barW = Math.max(2, (item.count / maxCount) * chartW);
        const color = agentColors[item.agent] ?? theme.color.textMuted;

        return (
          <g key={item.agent}>
            {/* Label */}
            <text
              x={padding.left - 8}
              y={y + barHeight / 2 + 4}
              textAnchor="end"
              fill={theme.color.textMuted}
              fontSize={12}
              fontFamily={theme.font.body}
            >
              {item.agent}
            </text>
            {/* Bar background */}
            <rect
              x={padding.left}
              y={y}
              width={chartW}
              height={barHeight}
              rx={4}
              fill={theme.color.surfaceContainerHigh}
            />
            {/* Bar fill */}
            <rect
              x={padding.left}
              y={y}
              width={barW}
              height={barHeight}
              rx={4}
              fill={color}
              opacity={0.8}
            />
            {/* Count */}
            <text
              x={padding.left + barW + 6}
              y={y + barHeight / 2 + 4}
              fill={theme.color.textMuted}
              fontSize={11}
              fontFamily={theme.font.mono}
            >
              {item.count}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
