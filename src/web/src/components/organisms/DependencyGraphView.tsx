import { useMemo, useState } from "react";
import { useTheme } from "../theme/ThemeContext";
import { StatusDot } from "../atoms/StatusDot";
import { Badge } from "../atoms/Badge";
import { EmptyState } from "../molecules/EmptyState";
import type { TaskSummary, TaskStatus } from "../../types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DependencyEdge {
  source_task_id: string;
  target_task_id: string;
  dependency_type: "blocks" | "relates_to";
}

export interface DependencyGraphViewProps {
  tasks: TaskSummary[];
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
// Topological level computation (Kahn's algorithm / BFS)
// ---------------------------------------------------------------------------

interface LevelResult {
  levels: Map<string, number>;
  maxLevel: number;
}

function computeLevels(
  taskIds: string[],
  edges: DependencyEdge[],
): LevelResult {
  // Only use "blocks" edges for level computation
  const blocksEdges = edges.filter((e) => e.dependency_type === "blocks");

  const taskSet = new Set(taskIds);
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const id of taskIds) {
    inDegree.set(id, 0);
    adjacency.set(id, []);
  }

  for (const edge of blocksEdges) {
    // source blocks target => source must be done before target
    // So arrow goes source -> target, target depends on source
    // In topological terms: source is at a lower level, target at higher
    if (!taskSet.has(edge.source_task_id) || !taskSet.has(edge.target_task_id)) continue;
    adjacency.get(edge.source_task_id)?.push(edge.target_task_id);
    inDegree.set(edge.target_task_id, (inDegree.get(edge.target_task_id) ?? 0) + 1);
  }

  // BFS to compute levels
  const levels = new Map<string, number>();
  const queue: string[] = [];

  for (const id of taskIds) {
    if ((inDegree.get(id) ?? 0) === 0) {
      queue.push(id);
      levels.set(id, 0);
    }
  }

  let maxLevel = 0;
  let head = 0;
  while (head < queue.length) {
    const current = queue[head++];
    const currentLevel = levels.get(current) ?? 0;
    for (const neighbor of adjacency.get(current) ?? []) {
      const newLevel = currentLevel + 1;
      // Diamond dependency: assign to deepest level
      const existing = levels.get(neighbor);
      if (existing === undefined || newLevel > existing) {
        levels.set(neighbor, newLevel);
        if (newLevel > maxLevel) maxLevel = newLevel;
      }
      const remaining = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, remaining);
      if (remaining === 0) {
        queue.push(neighbor);
      }
    }
  }

  // Tasks not reached by BFS (part of a cycle, or isolated with no blocks edges)
  // go to level 0
  for (const id of taskIds) {
    if (!levels.has(id)) {
      levels.set(id, 0);
    }
  }

  return { levels, maxLevel };
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
  isHighlighted,
  isFaded,
  onClick,
  style,
}: {
  task: TaskSummary;
  isBlocked: boolean;
  isHighlighted: boolean;
  isFaded: boolean;
  onClick: () => void;
  style: React.CSSProperties;
}) {
  const { theme } = useTheme();
  const [hovered, setHovered] = useState(false);
  const statusColor = getStatusColor(task.status, isBlocked, theme);

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
        borderLeft: isBlocked
          ? `3px solid ${theme.color.danger}`
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
      {isBlocked && (
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
  highlightedTaskId,
  theme,
  svgWidth,
  svgHeight,
}: {
  edges: DependencyEdge[];
  positions: Map<string, CardPosition>;
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
      </defs>
      {edges.map((edge, i) => {
        const sourcePos = positions.get(edge.source_task_id);
        const targetPos = positions.get(edge.target_task_id);
        if (!sourcePos || !targetPos) return null;

        const isBlocks = edge.dependency_type === "blocks";
        const isRelated =
          highlightedTaskId === edge.source_task_id ||
          highlightedTaskId === edge.target_task_id;
        const isHighlighted = highlightedTaskId !== null && isRelated;
        const isFaded = highlightedTaskId !== null && !isRelated;

        // Source bottom-center to target top-center
        const x1 = sourcePos.x + CARD_WIDTH / 2;
        const y1 = sourcePos.y + CARD_HEIGHT;
        const x2 = targetPos.x + CARD_WIDTH / 2;
        const y2 = targetPos.y;

        const strokeColor = isHighlighted
          ? theme.color.primary
          : theme.color.textFaint;

        return (
          <line
            key={`${edge.source_task_id}-${edge.target_task_id}-${i}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={strokeColor}
            strokeWidth={isHighlighted ? 2 : 1.5}
            strokeDasharray={isBlocks ? "none" : "6,4"}
            markerEnd={isBlocks ? (isHighlighted ? "url(#arrow-blocks-hl)" : "url(#arrow-blocks)") : undefined}
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

  // Compute topological levels
  const { levelGroups, maxColumns, positions, svgWidth, svgHeight } = useMemo(() => {
    const taskIds = tasks.map((t) => t.id);
    const { levels, maxLevel } = computeLevels(taskIds, edges);

    // Group tasks by level
    const groups: string[][] = [];
    for (let l = 0; l <= maxLevel; l++) {
      groups.push([]);
    }
    for (const task of tasks) {
      const level = levels.get(task.id) ?? 0;
      groups[level].push(task.id);
    }

    // Remove empty trailing levels
    while (groups.length > 0 && groups[groups.length - 1].length === 0) {
      groups.pop();
    }

    const maxCols = Math.max(1, ...groups.map((g) => g.length));
    const pos = computeCardPositions(groups);

    const width = LEVEL_LABEL_WIDTH + PADDING + maxCols * (CARD_WIDTH + CARD_GAP_X);
    const height = PADDING + groups.length * (CARD_HEIGHT + CARD_GAP_Y);

    return {
      levelGroups: groups,
      maxColumns: maxCols,
      positions: pos,
      svgWidth: width,
      svgHeight: height,
    };
  }, [tasks, edges]);

  const taskMap = useMemo(() => {
    const map = new Map<string, TaskSummary>();
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
            {levelIdx === 0 ? "Ready" : `Level ${levelIdx}`}
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
