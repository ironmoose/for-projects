import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "../theme/ThemeContext";
import { StatusDot } from "../atoms/StatusDot";
import { Badge } from "../atoms/Badge";
import { EmptyState } from "../molecules/EmptyState";
import { Icon } from "../atoms/Icon";
import { useForceGraph } from "../../hooks/useForceGraph";
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
const MIN_HEIGHT = 400;
const MIN_SCALE = 0.2;
const MAX_SCALE = 3;
const ZOOM_SENSITIVITY = 0.002;

// ---------------------------------------------------------------------------
// Cycle detection (retained from previous implementation)
// ---------------------------------------------------------------------------

function detectCycles(
  taskIds: string[],
  edges: DependencyEdge[],
): { backEdges: Set<string>; cycleNodeIds: Set<string> } {
  const blocksEdges = edges.filter((e) => e.dependency_type === "blocks");
  const taskSet = new Set(taskIds);
  const adjacency = new Map<string, string[]>();

  for (const id of taskIds) adjacency.set(id, []);
  for (const edge of blocksEdges) {
    if (!taskSet.has(edge.source_task_id) || !taskSet.has(edge.target_task_id)) continue;
    adjacency.get(edge.source_task_id)?.push(edge.target_task_id);
  }

  const backEdges = new Set<string>();
  const cycleNodeIds = new Set<string>();
  const state = new Map<string, number>(); // 0=unvisited, 1=in-stack, 2=done
  for (const id of taskIds) state.set(id, 0);

  function dfs(startId: string): void {
    const stack: Array<[string, number]> = [[startId, 0]];
    state.set(startId, 1);

    while (stack.length > 0) {
      const top = stack[stack.length - 1];
      const nodeId = top[0];
      const children = adjacency.get(nodeId) ?? [];

      if (top[1] >= children.length) {
        state.set(nodeId, 2);
        stack.pop();
        continue;
      }

      const childId = children[top[1]];
      top[1]++;

      const childState = state.get(childId) ?? 0;
      if (childState === 1) {
        backEdges.add(`${nodeId}:${childId}`);
        cycleNodeIds.add(nodeId);
        cycleNodeIds.add(childId);
      } else if (childState === 0) {
        state.set(childId, 1);
        stack.push([childId, 0]);
      }
    }
  }

  for (const id of taskIds) {
    if (state.get(id) === 0) dfs(id);
  }

  return { backEdges, cycleNodeIds };
}

// ---------------------------------------------------------------------------
// Status color helpers
// ---------------------------------------------------------------------------

function getStatusColor(
  status: TaskStatus,
  isBlocked: boolean,
  theme: ReturnType<typeof useTheme>["theme"],
): string {
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
        // Center the card on its simulation point
        transform: "translate(-50%, -50%)",
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
        zIndex: isHighlighted ? 2 : 1,
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
// SVG edge rendering
// ---------------------------------------------------------------------------

function EdgeOverlay({
  edges,
  posMap,
  backEdges,
  highlightedTaskId,
  theme,
  width,
  height,
}: {
  edges: DependencyEdge[];
  posMap: Map<string, { x: number; y: number }>;
  backEdges: Set<string>;
  highlightedTaskId: string | null;
  theme: ReturnType<typeof useTheme>["theme"];
  width: number;
  height: number;
}) {
  return (
    <svg
      width={width}
      height={height}
      style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none", overflow: "visible" }}
    >
      <defs>
        {/* Dot markers at the target end of each edge */}
        <marker id="fg-dot" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
          <circle cx="4" cy="4" r="3" fill={theme.color.textMuted} />
        </marker>
        <marker id="fg-dot-hl" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
          <circle cx="4" cy="4" r="3.5" fill={theme.color.primary} />
        </marker>
        <marker id="fg-dot-cycle" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
          <circle cx="4" cy="4" r="3" fill={theme.color.danger} />
        </marker>
        <marker id="fg-dot-relates" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <circle cx="3" cy="3" r="2" fill={theme.color.textFaint} opacity={0.6} />
        </marker>
      </defs>
      {edges.map((edge, i) => {
        const src = posMap.get(edge.source_task_id);
        const tgt = posMap.get(edge.target_task_id);
        if (!src || !tgt) return null;

        const edgeKey = `${edge.source_task_id}:${edge.target_task_id}`;
        const isBack = backEdges.has(edgeKey);
        const isRelates = edge.dependency_type === "relates_to";
        const isRelated =
          highlightedTaskId === edge.source_task_id ||
          highlightedTaskId === edge.target_task_id;
        const isHL = highlightedTaskId !== null && isRelated;
        const isFaded = highlightedTaskId !== null && !isRelated;

        // Self-loop
        if (edge.source_task_id === edge.target_task_id) {
          const cx = src.x + CARD_WIDTH / 2 + 16;
          const cy = src.y;
          return (
            <g key={`${edgeKey}-${i}`} opacity={isFaded ? 0.2 : 0.7}>
              <circle cx={cx} cy={cy} r={14} fill="none"
                stroke={isHL ? theme.color.primary : theme.color.danger}
                strokeWidth={2} strokeDasharray="6,3" />
              <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="central"
                fontSize="10" fill={theme.color.danger}>↻</text>
            </g>
          );
        }

        // Shorten the line so it doesn't overlap the card
        const dx = tgt.x - src.x;
        const dy = tgt.y - src.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const pad = 32; // pull back from card center
        if (dist < pad * 2) return null; // too close to draw

        const ux = dx / dist;
        const uy = dy / dist;
        const x1 = src.x + ux * pad;
        const y1 = src.y + uy * pad;
        const x2 = tgt.x - ux * pad;
        const y2 = tgt.y - uy * pad;

        if (isBack) {
          // Back-edge: curved red dashed line
          const mx = (x1 + x2) / 2;
          const my = (y1 + y2) / 2;
          const perpX = -(y2 - y1);
          const perpY = x2 - x1;
          const arcStrength = 0.3;
          const cx1 = mx + perpX * arcStrength;
          const cy1 = my + perpY * arcStrength;
          return (
            <path key={`${edgeKey}-${i}`}
              d={`M${x1},${y1} Q${cx1},${cy1} ${x2},${y2}`}
              fill="none"
              stroke={isHL ? theme.color.primary : theme.color.danger}
              strokeWidth={isHL ? 3 : 2.5}
              strokeDasharray="6,3"
              strokeLinecap="round"
              markerEnd={isHL ? "url(#fg-dot-hl)" : "url(#fg-dot-cycle)"}
              opacity={isFaded ? 0.2 : 0.7}
            />
          );
        }

        if (isRelates) {
          return (
            <line key={`${edgeKey}-${i}`}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={isHL ? theme.color.primary : theme.color.textFaint}
              strokeWidth={isHL ? 2 : 1.5}
              strokeDasharray="6,4"
              strokeLinecap="round"
              markerEnd="url(#fg-dot-relates)"
              opacity={isFaded ? 0.15 : 0.5}
            />
          );
        }

        // Normal blocks edge
        return (
          <line key={`${edgeKey}-${i}`}
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={isHL ? theme.color.primary : theme.color.textMuted}
            strokeWidth={isHL ? 3 : 2}
            strokeLinecap="round"
            markerEnd={isHL ? "url(#fg-dot-hl)" : "url(#fg-dot)"}
            opacity={isFaded ? 0.2 : 0.8}
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const [size, setSize] = useState({ width: 800, height: MIN_HEIGHT });

  // Measure container width, use fixed min height
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      if (w > 0) setSize((prev) => ({ ...prev, width: w }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Scale height with node count
  const graphHeight = Math.max(MIN_HEIGHT, tasks.length * 60);

  const blockedSet = useMemo(() => new Set(blockedTaskIds), [blockedTaskIds]);

  const { backEdges, cycleNodeIds } = useMemo(
    () => detectCycles(tasks.map((t) => t.id), edges),
    [tasks, edges],
  );

  const { positions, drag, resetPositions } = useForceGraph(tasks, edges, size.width, graphHeight);

  // -------------------------------------------------------------------------
  // Zoom / pan state
  // -------------------------------------------------------------------------
  const [camera, setCamera] = useState({ x: 0, y: 0, scale: 1 });
  const cameraRef = useRef(camera);
  cameraRef.current = camera;

  /** Convert screen-space pointer coords to graph-space coords */
  const screenToGraph = useCallback(
    (clientX: number, clientY: number) => {
      const container = containerRef.current;
      if (!container) return { gx: 0, gy: 0 };
      const rect = container.getBoundingClientRect();
      const cam = cameraRef.current;
      const gx = (clientX - rect.left - cam.x) / cam.scale;
      const gy = (clientY - rect.top - cam.y) / cam.scale;
      return { gx, gy };
    },
    [],
  );

  // Wheel zoom — zoom toward cursor position
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();

      // Pointer position relative to container
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;

      setCamera((prev) => {
        const factor = 1 - e.deltaY * ZOOM_SENSITIVITY;
        const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale * factor));
        const ratio = newScale / prev.scale;
        return {
          scale: newScale,
          // Adjust translate so the point under the cursor stays fixed
          x: px - ratio * (px - prev.x),
          y: py - ratio * (py - prev.y),
        };
      });
    },
    [],
  );

  // -------------------------------------------------------------------------
  // Node drag + background pan
  // -------------------------------------------------------------------------
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const didDragRef = useRef(false);
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0, camX: 0, camY: 0 });
  const DRAG_THRESHOLD = 4;

  // Node drag start
  const handlePointerDown = useCallback(
    (nodeId: string, e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation(); // Don't trigger background pan
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      const { gx, gy } = screenToGraph(e.clientX, e.clientY);
      dragStartPosRef.current = { x: e.clientX, y: e.clientY };
      didDragRef.current = false;
      setDraggingId(nodeId);
      drag.onDragStart(nodeId, gx, gy);
    },
    [drag, screenToGraph],
  );

  // Background pan start
  const handleBgPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      // Only start pan if clicking the background, not a node
      if (draggingId) return;
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      dragStartPosRef.current = { x: e.clientX, y: e.clientY };
      didDragRef.current = false;
      panStartRef.current = { x: e.clientX, y: e.clientY, camX: cameraRef.current.x, camY: cameraRef.current.y };
      setIsPanning(true);
    },
    [draggingId],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const dx = e.clientX - dragStartPosRef.current.x;
      const dy = e.clientY - dragStartPosRef.current.y;
      if (!didDragRef.current && dx * dx + dy * dy > DRAG_THRESHOLD * DRAG_THRESHOLD) {
        didDragRef.current = true;
      }

      if (draggingId) {
        const { gx, gy } = screenToGraph(e.clientX, e.clientY);
        drag.onDrag(gx, gy);
      } else if (isPanning) {
        setCamera((prev) => ({
          ...prev,
          x: panStartRef.current.camX + dx,
          y: panStartRef.current.camY + dy,
        }));
      }
    },
    [draggingId, isPanning, drag, screenToGraph],
  );

  const handlePointerUp = useCallback(() => {
    if (draggingId) {
      drag.onDragEnd();
      setDraggingId(null);
    }
    if (isPanning) {
      setIsPanning(false);
    }
  }, [draggingId, isPanning, drag]);

  /** Zoom by a step factor toward the center of the container */
  const zoomByStep = useCallback((factor: number) => {
    setCamera((prev) => {
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale * factor));
      const ratio = newScale / prev.scale;
      const cx = size.width / 2;
      const cy = graphHeight / 2;
      return {
        scale: newScale,
        x: cx - ratio * (cx - prev.x),
        y: cy - ratio * (cy - prev.y),
      };
    });
  }, [size.width, graphHeight]);

  const handleZoomIn = useCallback(() => zoomByStep(1.3), [zoomByStep]);
  const handleZoomOut = useCallback(() => zoomByStep(1 / 1.3), [zoomByStep]);

  /** Fit all nodes into view with padding */
  const handleFitToView = useCallback(() => {
    if (positions.length === 0) {
      setCamera({ x: 0, y: 0, scale: 1 });
      return;
    }

    const PAD = 40; // padding around the bounding box
    const halfW = CARD_WIDTH / 2;
    const halfH = CARD_HEIGHT / 2;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of positions) {
      minX = Math.min(minX, p.x - halfW);
      minY = Math.min(minY, p.y - halfH);
      maxX = Math.max(maxX, p.x + halfW);
      maxY = Math.max(maxY, p.y + halfH);
    }

    const bboxW = maxX - minX + PAD * 2;
    const bboxH = maxY - minY + PAD * 2;

    const scaleX = size.width / bboxW;
    const scaleY = graphHeight / bboxH;
    // Don't magnify past 1x — fit should shrink to fit, not blow up small graphs
    const scale = Math.min(scaleX, scaleY, 1);

    // Center the bounding box in the viewport
    const cx = (minX - PAD) * scale;
    const cy = (minY - PAD) * scale;
    const offsetX = (size.width - bboxW * scale) / 2 - cx;
    const offsetY = (graphHeight - bboxH * scale) / 2 - cy;

    setCamera({ x: offsetX, y: offsetY, scale });
  }, [positions, size.width, graphHeight]);

  const posMap = useMemo(() => {
    const m = new Map<string, { x: number; y: number }>();
    for (const p of positions) m.set(p.id, { x: p.x, y: p.y });
    return m;
  }, [positions]);

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
      ref={containerRef}
      onPointerDown={handleBgPointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
      style={{
        position: "relative",
        width: "100%",
        height: graphHeight,
        overflow: "hidden",
        cursor: draggingId ? "grabbing" : isPanning ? "grabbing" : "default",
        touchAction: "none",
      }}
    >
      {/* Transformed layer — zoom & pan applied here */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          transformOrigin: "0 0",
          transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})`,
          willChange: "transform",
        }}
      >
        {/* SVG edge overlay */}
        <EdgeOverlay
          edges={edges}
          posMap={posMap}
          backEdges={backEdges}
          highlightedTaskId={hoveredTaskId}
          theme={theme}
          width={size.width}
          height={graphHeight}
        />

        {/* Task cards */}
        {positions.map((pos) => {
          const task = taskMap.get(pos.id);
          if (!task) return null;
          const isBlocked = blockedSet.has(pos.id);
          const isInCycle = cycleNodeIds.has(pos.id);
          const isHighlighted = connectedIds !== null && connectedIds.has(pos.id);
          const isFaded = connectedIds !== null && !connectedIds.has(pos.id);
          const isDragging = draggingId === pos.id;

          return (
            <div
              key={pos.id}
              onMouseEnter={() => !draggingId && setHoveredTaskId(pos.id)}
              onMouseLeave={() => !draggingId && setHoveredTaskId(null)}
              onPointerDown={(e) => handlePointerDown(pos.id, e)}
            >
              <TaskCard
                task={task}
                isBlocked={isBlocked}
                isInCycle={isInCycle}
                isHighlighted={isHighlighted || isDragging}
                isFaded={isFaded}
                onClick={() => {
                  if (!didDragRef.current) onTaskClick(pos.id);
                }}
                style={{
                  left: pos.x,
                  top: pos.y,
                  cursor: isDragging ? "grabbing" : "grab",
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Zoom controls */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          position: "absolute",
          bottom: theme.spacing.sm,
          right: theme.spacing.sm,
          display: "flex",
          flexDirection: "column",
          gap: 2,
          zIndex: 10,
        }}
      >
        {[
          { icon: "add", action: handleZoomIn, label: "Zoom in" },
          { icon: "remove", action: handleZoomOut, label: "Zoom out" },
          { icon: "fit_screen", action: handleFitToView, label: "Fit all nodes" },
          { icon: "lock_open", action: resetPositions, label: "Unlock all nodes" },
        ].map(({ icon, action, label }) => (
          <button
            key={icon}
            onClick={action}
            title={label}
            style={{
              width: 28,
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              border: `1px solid ${theme.color.border}`,
              borderRadius: theme.radius.sm,
              background: theme.color.surfaceContainerHigh,
              color: theme.color.textMuted,
              cursor: "pointer",
            }}
          >
            <Icon name={icon} size={16} />
          </button>
        ))}
      </div>
    </div>
  );
}
