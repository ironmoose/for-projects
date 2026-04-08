import { useRef, useState, useEffect, useCallback } from "react";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type Simulation,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from "d3-force";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ForceNode extends SimulationNodeDatum {
  id: string;
}

interface ForceLink extends SimulationLinkDatum<ForceNode> {
  source: string | ForceNode;
  target: string | ForceNode;
  edgeType: "blocks" | "relates_to";
}

export interface NodePosition {
  id: string;
  x: number;
  y: number;
}

export interface DragHandlers {
  onDragStart: (nodeId: string, x: number, y: number) => void;
  onDrag: (x: number, y: number) => void;
  onDragEnd: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Runs a d3-force simulation and returns live positions + drag handlers.
 *
 * Initial layout is computed synchronously (300 ticks). The simulation stays
 * alive at low alpha so dragging a node reheats it and the graph reacts.
 */
export function useForceGraph(
  nodes: { id: string }[],
  edges: { source_task_id: string; target_task_id: string; dependency_type: string }[],
  width: number,
  height: number,
): { positions: NodePosition[]; drag: DragHandlers; settled: boolean; resetPositions: () => void } {
  const simRef = useRef<Simulation<ForceNode, ForceLink> | null>(null);
  const nodesRef = useRef<ForceNode[]>([]);
  const dragNodeRef = useRef<ForceNode | null>(null);
  const [positions, setPositions] = useState<NodePosition[]>([]);
  const [settled, setSettled] = useState(false);

  const syncPositions = useCallback(() => {
    setPositions(
      nodesRef.current.map((n) => ({ id: n.id, x: n.x!, y: n.y! })),
    );
  }, []);

  useEffect(() => {
    simRef.current?.stop();

    if (nodes.length === 0) {
      nodesRef.current = [];
      setPositions([]);
      setSettled(true);
      return;
    }

    // Reset settled so the loading state shows
    setSettled(false);

    const forceNodes: ForceNode[] = nodes.map((n) => ({ id: n.id }));
    const forceLinks: ForceLink[] = edges.map((e) => ({
      source: e.source_task_id,
      target: e.target_task_id,
      edgeType: e.dependency_type as "blocks" | "relates_to",
    }));

    nodesRef.current = forceNodes;

    // Use requestAnimationFrame to let the loading spinner paint before
    // the synchronous tick computation blocks the main thread.
    let cancelled = false;
    const rafId = requestAnimationFrame(() => {
      if (cancelled) return;

      const sim = forceSimulation(forceNodes)
        .force(
          "link",
          forceLink<ForceNode, ForceLink>(forceLinks)
            .id((d) => d.id)
            .distance(140)
            .strength((link) => (link.edgeType === "blocks" ? 1 : 0.2)),
        )
        .force("charge", forceManyBody().strength(-400))
        .force("center", forceCenter(width / 2, height / 2))
        .force("collide", forceCollide(70))
        .alphaDecay(0.02);

      // Compute initial layout synchronously
      sim.stop();
      sim.tick(300);
      syncPositions();
      setSettled(true);

      // Register tick handler for interactive use (drag). The simulation will
      // idle at alpha ≈ 0 until onDragStart reheats it.
      sim.on("tick", syncPositions);

      simRef.current = sim;
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      simRef.current?.stop();
    };
  }, [nodes, edges, width, height, syncPositions]);

  // -------------------------------------------------------------------------
  // Drag handlers — pin node with fx/fy, reheat simulation
  // -------------------------------------------------------------------------

  const onDragStart = useCallback((nodeId: string, x: number, y: number) => {
    const sim = simRef.current;
    if (!sim) return;
    const node = nodesRef.current.find((n) => n.id === nodeId);
    if (!node) return;

    dragNodeRef.current = node;
    // Pin at current position first to avoid snap, then pointer takes over in onDrag
    node.fx = node.x;
    node.fy = node.y;

    // Revive the simulation — set alpha AND alphaTarget. After 300 ticks alpha
    // is essentially zero; alphaTarget alone won't restart a cold simulation.
    sim.alpha(0.3).alphaTarget(0.3).restart();
  }, []);

  const onDrag = useCallback((x: number, y: number) => {
    const node = dragNodeRef.current;
    if (!node) return;
    node.fx = x;
    node.fy = y;
  }, []);

  const onDragEnd = useCallback(() => {
    const sim = simRef.current;
    const node = dragNodeRef.current;
    if (!node) return;

    // Keep fx/fy set — the node stays where the user put it.
    dragNodeRef.current = null;

    // Cool down so other nodes settle around the new position
    sim?.alphaTarget(0);
  }, []);

  /** Unpin all nodes and reheat — lets the simulation find a fresh layout */
  const resetPositions = useCallback(() => {
    const sim = simRef.current;
    if (!sim) return;
    for (const node of nodesRef.current) {
      node.fx = null;
      node.fy = null;
    }
    sim.alpha(1).alphaTarget(0).restart();
  }, []);

  return { positions, drag: { onDragStart, onDrag, onDragEnd }, settled, resetPositions };
}
