import { useMemo, useState } from "react";
import { useTheme } from "../theme/ThemeContext";
import { StatusDot } from "../atoms/StatusDot";
import { Badge } from "../atoms/Badge";
import { EmptyState } from "../molecules/EmptyState";
import type { TaskStatus } from "../../types";
import type { GraphNode } from "../../api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DependencyEdge {
  source_task_id: string;
  target_task_id: string;
  dependency_type: "blocks" | "relates_to";
}

export interface DependencyGraphViewProps {
  tasks: GraphNode[];
  edges: DependencyEdge[];
  blockedTaskIds: string[];
  onTaskClick: (taskId: string) => void;
}

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

const CARD_WIDTH = 200;
const CARD_HEIGHT = 52;
const CARD_GAP_X = 24;
const CARD_GAP_Y = 64;
const LEVEL_LABEL_WIDTH = 100;
const PADDING = 16;

// ---------------------------------------------------------------------------
// DFS-based level computation with back-edge (cycle) detection
// ---------------------------------------------------------------------------

interface DFSLevelResult {
  levels: Map<string, number>;
  maxLevel: number;
  backEdges: Set<string>;
  cycleNodeIds: Set<string>;
}

function computeLevelsDFS(
  taskIds: string[],
  edges: DependencyEdge[],
): DFSLevelResult {
  // Only use "blocks" edges for level computation
  const blocksEdges = edges.filter((e) => e.dependency_type === "blocks");

  const taskSet = new Set(taskIds);
  const adjacency = new Map<string, string[]>();
  const incomingCount = new Map<string, number>();

  for (const id of taskIds) {
    adjacency.set(id, []);
    incomingCount.set(id, 0);
  }

  for (const edge of blocksEdges) {
    if (!taskSet.has(edge.source_task_id) || !taskSet.has(edge.target_task_id)) continue;
    adjacency.get(edge.source_task_id)?.push(edge.target_task_id);
    incomingCount.set(edge.target_task_id, (incomingCount.get(edge.target_task_id) ?? 0) + 1);
  }

  const levels = new Map<string, number>();
  const backEdges = new Set<string>();
  const cycleNodeIds = new Set<string>();

  // DFS states: 0 = unvisited, 1 = in-stack, 2 = done
  const state = new Map<string, number>();
  for (const id of taskIds) state.set(id, 0);

  // Iterative DFS using an explicit stack
  function dfs(startId: string, startLevel: number): void {
    // Stack entries: [nodeId, level, childIndex]
    const stack: Array<[string, number, number]> = [[startId, startLevel, 0]];
    state.set(startId, 1);

    const currentLevel = levels.get(startId);
    if (currentLevel === undefined || startLevel > currentLevel) {
      levels.set(startId, startLevel);
    }

    while (stack.length > 0) {
      const top = stack[stack.length - 1];
      const nodeId = top[0];
      const level = top[1];
      const children = adjacency.get(nodeId) ?? [];

      if (top[2] >= children.length) {
        // All children processed, pop
        state.set(nodeId, 2);
        stack.pop();
        continue;
      }

      const childId = children[top[2]];
      top[2]++;

      const childState = state.get(childId) ?? 0;
      if (childState === 1) {
        // Back-edge: child is in the current DFS stack (cycle)
        backEdges.add(`${nodeId}:${childId}`);
        cycleNodeIds.add(nodeId);
        cycleNodeIds.add(childId);
      } else if (childState === 0) {
        // Tree edge: visit child at next level
        const childLevel = level + 1;
        const existing = levels.get(childId);
        if (existing === undefined || childLevel > existing) {
          levels.set(childId, childLevel);
        }
        state.set(childId, 1);
        stack.push([childId, childLevel, 0]);
      } else {
        // Cross/forward edge to already-completed node
        // Update level if this path is deeper (diamond dependencies)
        const childLevel = level + 1;
        const existing = levels.get(childId);
        if (existing !== undefined && childLevel > existing) {
          // Re-propagate deeper levels through completed subtree
          levels.set(childId, childLevel);
          // Push for re-traversal to update descendants
          state.set(childId, 1);
          stack.push([childId, childLevel, 0]);
        }
      }
    }
  }

  // Start DFS from root nodes (no incoming blocks edges)
  const roots = taskIds.filter((id) => (incomingCount.get(id) ?? 0) === 0);
  for (const rootId of roots) {
    if (state.get(rootId) === 0) {
      dfs(rootId, 0);
    }
  }

  // Visit any remaining unvisited nodes (disconnected components, pure cycles)
  for (const id of taskIds) {
    if (state.get(id) === 0) {
      dfs(id, 0);
    }
  }

  // Ensure every task has a level
  for (const id of taskIds) {
    if (!levels.has(id)) {
      levels.set(id, 0);
    }
  }

  let maxLevel = 0;
  for (const level of levels.values()) {
    if (level > maxLevel) maxLevel = level;
  }

  return { levels, maxLevel, backEdges, cycleNodeIds };
}

// ---------------------------------------------------------------------------
// Arrow coordinate computation
// ---------------------------------------------------------------------------

interface CardPosition {
  x: number;
  y: number;
}

function computeCardPositions(
  levelGroups: string[][],
): Map<string, CardPosition> {
  const positions = new Map<string, CardPosition>();

  for (let level = 0; level < levelGroups.length; level++) {
    const group = levelGroups[level];
    const y = PADDING + level * (CARD_HEIGHT + CARD_GAP_Y);
    for (let i = 0; i < group.length; i++) {
      const x = LEVEL_LABEL_WIDTH + PADDING + i * (CARD_WIDTH + CARD_GAP_X);
      positions.set(group[i], { x, y });
    }
  }

  return positions;
}

// ---------------------------------------------------------------------------
// Status color helpers
// ---------------------------------------------------------------------------

function getStatusColor(status: TaskStatus, isBlocked: boolean, theme: ReturnType<typeof useTheme>["theme"]): string {
  if (isBlocked) return theme.color.danger;
  switch (status) {
    case "done": return theme.color.success;
    case "in_progress": return theme.color.tertiary;
    case "todo": return theme.color.textMuted;
    case "archived": return theme.color.textFaint;
    default: return theme.color.textMuted;
  }
}

// ---------------------------------------------------------------------------
// TaskCard sub-component
// ---------------------------------------------------------------------------

function TaskCard({
  task,
  isBlocked,
  isInCycle,
  isHighlighted,
  isFaded,
  onClick,
  style,
}: {
  task: GraphNode;
  isBlocked: boolean;
  isInCycle: boolean;
  isHighlighted: boolean;
  isFaded: boolean;
  onClick: () => void;
  style: React.CSSProperties;
}) {
  const { theme } = useTheme();
  const [hovered, setHovered] = useState(false);
  const statusColor = getStatusColor(task.status, isBlocked, theme);

  const leftBorderColor = isInCycle
    ? theme.color.warning
    : isBlocked
      ? theme.color.danger
      : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick(); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={task.title}
      style={{
        position: "absolute",
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        background: hovered
          ? theme.color.surfaceContainerHighest
          : theme.color.surfaceContainerHigh,
        border: `1px solid ${isHighlighted ? theme.color.primary : theme.color.border}`,
        borderLeft: leftBorderColor
          ? `3px solid ${leftBorderColor}`
          : `1px solid ${isHighlighted ? theme.color.primary : theme.color.border}`,
        borderRadius: theme.radius.md,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: theme.spacing.sm,
        padding: `0 ${theme.spacing.sm}`,
        boxSizing: "border-box",
        transition: `background ${theme.motion.fast} ${theme.motion.easing}, border-color ${theme.motion.fast} ${theme.motion.easing}, opacity ${theme.motion.fast} ${theme.motion.easing}`,
        opacity: isFaded ? 0.35 : 1,
        boxShadow: isHighlighted ? `0 0 8px ${theme.color.primary}33` : "none",
        ...style,
      }}
    >
      <StatusDot color={statusColor} size={8} />
      <span
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: theme.font.size.xs,
          fontFamily: theme.font.body,
          color: theme.color.text,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          lineHeight: theme.font.lineHeight.tight,
        }}
      >
        {task.title}
      </span>
      {isInCycle && (
        <Badge variant="warning" style={{ fontSize: theme.font.size.xxs, padding: "0 4px", lineHeight: 1.3 }}>
          {"↻ cycle"}
        </Badge>
      )}
      {isBlocked && !isInCycle && (
        <Badge variant="failed" style={{ fontSize: theme.font.size.xxs, padding: "0 4px", lineHeight: 1.3 }}>
          blocked
        </Badge>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SVG Arrows
// ---------------------------------------------------------------------------

function ArrowOverlay({
  edges,
  positions,
  backEdges,
  highlightedTaskId,
  theme,
  svgWidth,
  svgHeight,
}: {
  edges: DependencyEdge[];
  positions: Map<string, CardPosition>;
  backEdges: Set<string>;
  highlightedTaskId: string | null;
  theme: ReturnType<typeof useTheme>["theme"];
  svgWidth: number;
  svgHeight: number;
}) {
  return (
    <svg
      width={svgWidth}
      height={svgHeight}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        pointerEvents: "none",
        overflow: "visible",
      }}
    >
      <defs>
        <marker
          id="arrow-blocks"
          markerWidth="8"
          markerHeight="6"
          refX="8"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L8,3 L0,6 Z" fill={theme.color.textMuted} />
        </marker>
        <marker
          id="arrow-blocks-hl"
          markerWidth="8"
          markerHeight="6"
          refX="8"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L8,3 L0,6 Z" fill={theme.color.primary} />
        </marker>
        <marker
          id="arrow-back-edge"
          markerWidth="8"
          markerHeight="6"
          refX="8"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L8,3 L0,6 Z" fill={theme.color.danger} />
        </marker>
        <marker
          id="arrow-relates"
          markerWidth="6"
          markerHeight="6"
          refX="3"
          refY="3"
          orient="auto"
        >
          <circle cx="3" cy="3" r="2" fill={theme.color.textFaint} />
        </marker>
      </defs>
      {edges.map((edge, i) => {
        const sourcePos = positions.get(edge.source_task_id);
        const targetPos = positions.get(edge.target_task_id);
        if (!sourcePos || !targetPos) return null;

        const isRelatesToEdge = edge.dependency_type === "relates_to";
        const edgeKey = `${edge.source_task_id}:${edge.target_task_id}`;
        const isBackEdge = backEdges.has(edgeKey);
        const isRelated =
          highlightedTaskId === edge.source_task_id ||
          highlightedTaskId === edge.target_task_id;
        const isHighlighted = highlightedTaskId !== null && isRelated;
        const isFaded = highlightedTaskId !== null && !isRelated;

        // Self-cycle: render a loop on the right side of the card
        if (edge.source_task_id === edge.target_task_id) {
          const cx = sourcePos.x + CARD_WIDTH + 16;
          const cy = sourcePos.y + CARD_HEIGHT / 2;
          const r = 14;
          return (
            <g key={`${edgeKey}-${i}`} opacity={isFaded ? 0.2 : 0.7}>
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={isHighlighted ? theme.color.primary : theme.color.danger}
                strokeWidth={2}
                strokeDasharray="6,3"
              />
              <text
                x={cx}
                y={cy + 1}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="10"
                fill={theme.color.danger}
              >
                {"↻"}
              </text>
            </g>
          );
        }

        // Back-edge (cycle): render as a curved red dashed path arcing to the right
        if (isBackEdge) {
          // Source bottom-center to target top-center, arcing right
          const x1 = sourcePos.x + CARD_WIDTH;
          const y1 = sourcePos.y + CARD_HEIGHT / 2;
          const x2 = targetPos.x + CARD_WIDTH;
          const y2 = targetPos.y + CARD_HEIGHT / 2;
          const dx = Math.abs(x2 - x1);
          const dy = Math.abs(y2 - y1);
          const arcOffset = Math.max(40, Math.min(dx, dy) * 0.5 + 30);
          const cx1 = Math.max(x1, x2) + arcOffset;
          const cy1 = y1;
          const cx2 = Math.max(x1, x2) + arcOffset;
          const cy2 = y2;
          const pathD = `M${x1},${y1} C${cx1},${cy1} ${cx2},${cy2} ${x2},${y2}`;
          const strokeColor = isHighlighted ? theme.color.primary : theme.color.danger;

          return (
            <path
              key={`${edgeKey}-${i}`}
              d={pathD}
              fill="none"
              stroke={strokeColor}
              strokeWidth={isHighlighted ? 2.5 : 2}
              strokeDasharray="6,3"
              markerEnd={isHighlighted ? "url(#arrow-blocks-hl)" : "url(#arrow-back-edge)"}
              opacity={isFaded ? 0.2 : 0.7}
            />
          );
        }

        // relates_to edges: gray dashed lines
        if (isRelatesToEdge) {
          const x1 = sourcePos.x + CARD_WIDTH / 2;
          const y1 = sourcePos.y + CARD_HEIGHT;
          const x2 = targetPos.x + CARD_WIDTH / 2;
          const y2 = targetPos.y;
          const strokeColor = isHighlighted ? theme.color.primary : theme.color.textFaint;

          return (
            <line
              key={`${edgeKey}-${i}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={strokeColor}
              strokeWidth={isHighlighted ? 1.5 : 1}
              strokeDasharray="6,4"
              markerEnd="url(#arrow-relates)"
              opacity={isFaded ? 0.15 : 0.5}
            />
          );
        }

        // Normal blocks edge: solid line with arrowhead
        const x1 = sourcePos.x + CARD_WIDTH / 2;
        const y1 = sourcePos.y + CARD_HEIGHT;
        const x2 = targetPos.x + CARD_WIDTH / 2;
        const y2 = targetPos.y;
        const strokeColor = isHighlighted
          ? theme.color.primary
          : theme.color.textFaint;

        return (
          <line
            key={`${edgeKey}-${i}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={strokeColor}
            strokeWidth={isHighlighted ? 2 : 1.5}
            markerEnd={isHighlighted ? "url(#arrow-blocks-hl)" : "url(#arrow-blocks)"}
            opacity={isFaded ? 0.2 : 0.7}
          />
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// DependencyGraphView — main component
// ---------------------------------------------------------------------------

export function DependencyGraphView({
  tasks,
  edges,
  blockedTaskIds,
  onTaskClick,
}: DependencyGraphViewProps) {
  const { theme } = useTheme();
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);

  const blockedSet = useMemo(() => new Set(blockedTaskIds), [blockedTaskIds]);

  // Compute DFS-based levels with back-edge detection
  const { levelGroups, positions, backEdges, cycleNodeIds, svgWidth, svgHeight } = useMemo(() => {
    const taskIds = tasks.map((t) => t.id);
    const result = computeLevelsDFS(taskIds, edges);

    // Group tasks by level
    const groups: string[][] = [];
    for (let l = 0; l <= result.maxLevel; l++) {
      groups.push([]);
    }
    for (const task of tasks) {
      const level = result.levels.get(task.id) ?? 0;
      groups[level].push(task.id);
    }

    // Remove empty trailing levels
    while (groups.length > 0 && groups[groups.length - 1].length === 0) {
      groups.pop();
    }

    // Ensure at least one level
    if (groups.length === 0) groups.push([]);

    const maxCols = Math.max(1, ...groups.map((g) => g.length));
    const pos = computeCardPositions(groups);

    const width = LEVEL_LABEL_WIDTH + PADDING + maxCols * (CARD_WIDTH + CARD_GAP_X);
    const height = PADDING + groups.length * (CARD_HEIGHT + CARD_GAP_Y);

    return {
      levelGroups: groups,
      positions: pos,
      backEdges: result.backEdges,
      cycleNodeIds: result.cycleNodeIds,
      svgWidth: width,
      svgHeight: height,
    };
  }, [tasks, edges]);

  const taskMap = useMemo(() => {
    const map = new Map<string, GraphNode>();
    for (const t of tasks) map.set(t.id, t);
    return map;
  }, [tasks]);

  // Connected task IDs for highlight on hover
  const connectedIds = useMemo(() => {
    if (!hoveredTaskId) return null;
    const ids = new Set<string>();
    ids.add(hoveredTaskId);
    for (const edge of edges) {
      if (edge.source_task_id === hoveredTaskId) ids.add(edge.target_task_id);
      if (edge.target_task_id === hoveredTaskId) ids.add(edge.source_task_id);
    }
    return ids;
  }, [hoveredTaskId, edges]);

  // Empty state
  if (edges.length === 0) {
    return (
      <EmptyState
        icon="account_tree"
        message="No dependencies defined. Add blocking or related dependencies between tasks to see the graph."
        style={{ padding: theme.spacing.xl }}
      />
    );
  }

  return (
    <div
      style={{
        position: "relative",
        overflowX: "auto",
        overflowY: "hidden",
        width: "100%",
      }}
    >
      <div
        style={{
          position: "relative",
          width: svgWidth,
          height: svgHeight,
          minWidth: "100%",
        }}
      >
        {/* SVG arrow overlay */}
        <ArrowOverlay
          edges={edges}
          positions={positions}
          backEdges={backEdges}
          highlightedTaskId={hoveredTaskId}
          theme={theme}
          svgWidth={svgWidth}
          svgHeight={svgHeight}
        />

        {/* Level labels */}
        {levelGroups.map((_, levelIdx) => (
          <div
            key={`level-label-${levelIdx}`}
            style={{
              position: "absolute",
              left: PADDING,
              top: PADDING + levelIdx * (CARD_HEIGHT + CARD_GAP_Y) + (CARD_HEIGHT - 20) / 2,
              width: LEVEL_LABEL_WIDTH - PADDING,
              fontSize: theme.font.size.xxs,
              fontFamily: theme.font.body,
              fontWeight: 700,
              color: theme.color.textMuted,
              textTransform: "uppercase",
              letterSpacing: theme.font.letterSpacing.wide,
              whiteSpace: "nowrap",
            }}
          >
            {levelIdx === 0 ? "Ready" : `Depth ${levelIdx}`}
          </div>
        ))}

        {/* Task cards */}
        {levelGroups.map((group) =>
          group.map((taskId) => {
            const task = taskMap.get(taskId);
            if (!task) return null;
            const pos = positions.get(taskId);
            if (!pos) return null;
            const isBlocked = blockedSet.has(taskId);
            const isInCycle = cycleNodeIds.has(taskId);
            const isHighlighted = connectedIds !== null && connectedIds.has(taskId);
            const isFaded = connectedIds !== null && !connectedIds.has(taskId);

            return (
              <div
                key={taskId}
                onMouseEnter={() => setHoveredTaskId(taskId)}
                onMouseLeave={() => setHoveredTaskId(null)}
              >
                <TaskCard
                  task={task}
                  isBlocked={isBlocked}
                  isInCycle={isInCycle}
                  isHighlighted={isHighlighted}
                  isFaded={isFaded}
                  onClick={() => onTaskClick(taskId)}
                  style={{ left: pos.x, top: pos.y }}
                />
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}
