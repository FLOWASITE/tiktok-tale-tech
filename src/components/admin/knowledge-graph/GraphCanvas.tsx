// ============================================
// Interactive Graph Visualization Canvas
// D3 force-directed graph for knowledge graph
// ============================================

import { useRef, useCallback, useMemo, useState, useEffect } from "react";
import ForceGraph2D, { ForceGraphMethods, NodeObject, LinkObject } from "react-force-graph-2d";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Download,
  Filter,
  Move3D,
} from "lucide-react";
import { useGraphVisualizationData } from "@/hooks/useGraphVisualization";
import type { KnowledgeNodeType, KnowledgeEdgeType, NODE_TYPE_COLORS } from "@/types/knowledgeGraph";
import { Skeleton } from "@/components/ui/skeleton";

// ============================================
// Types
// ============================================

interface GraphNode extends NodeObject {
  id: string;
  label: string;
  type: KnowledgeNodeType;
  color: string;
  size: number;
  properties?: Record<string, unknown>;
}

interface GraphLink extends LinkObject {
  source: string | GraphNode;
  target: string | GraphNode;
  edgeType: KnowledgeEdgeType;
  weight: number;
  color: string;
}

interface GraphCanvasProps {
  onNodeSelect?: (nodeId: string) => void;
  selectedNodeId?: string | null;
  filterNodeTypes?: KnowledgeNodeType[];
  filterEdgeTypes?: KnowledgeEdgeType[];
  height?: number;
}

// ============================================
// Color Configuration
// ============================================

const NODE_COLORS: Record<KnowledgeNodeType, string> = {
  industry: "#3B82F6",
  regulation: "#EF4444",
  term: "#10B981",
  concept: "#8B5CF6",
  persona: "#F59E0B",
  jurisdiction: "#6366F1",
};

const EDGE_COLORS: Record<KnowledgeEdgeType, string> = {
  related_to: "#94A3B8",
  parent_of: "#3B82F6",
  regulated_by: "#EF4444",
  uses_term: "#10B981",
  shares_audience: "#F59E0B",
  competes_with: "#EC4899",
  requires_compliance: "#EF4444",
  derived_from: "#8B5CF6",
  applies_to: "#6366F1",
};

// ============================================
// Main Component
// ============================================

export function GraphCanvas({
  onNodeSelect,
  selectedNodeId,
  filterNodeTypes,
  filterEdgeTypes,
  height = 600,
}: GraphCanvasProps) {
  const graphRef = useRef<ForceGraphMethods>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height });
  const [linkDistance, setLinkDistance] = useState(100);
  const [chargeStrength, setChargeStrength] = useState(-300);
  const [showLabels, setShowLabels] = useState(true);

  const { data: graphData, isLoading } = useGraphVisualizationData({
    nodeTypes: filterNodeTypes,
    edgeTypes: filterEdgeTypes,
    limit: 500,
  });

  // Resize observer for responsive canvas
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height,
        });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [height]);

  // Transform data for force graph
  const { nodes, links } = useMemo(() => {
    if (!graphData) return { nodes: [], links: [] };

    const nodes: GraphNode[] = graphData.nodes.map((node) => ({
      id: node.id,
      label: node.label,
      type: node.type,
      color: NODE_COLORS[node.type] || "#94A3B8",
      size: node.type === "industry" ? 12 : 8,
      properties: node.properties,
    }));

    const nodeIds = new Set(nodes.map((n) => n.id));
    const links: GraphLink[] = graphData.edges
      .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
      .map((edge) => ({
        source: edge.source,
        target: edge.target,
        edgeType: edge.label,
        weight: edge.weight,
        color: EDGE_COLORS[edge.label] || "#94A3B8",
      }));

    return { nodes, links };
  }, [graphData]);

  // Node click handler
  const handleNodeClick = useCallback(
    (node: NodeObject) => {
      const graphNode = node as GraphNode;
      onNodeSelect?.(graphNode.id);
      
      // Center on node
      graphRef.current?.centerAt(node.x, node.y, 500);
      graphRef.current?.zoom(2, 500);
    },
    [onNodeSelect]
  );

  // Custom node rendering
  const nodeCanvasObject = useCallback(
    (node: NodeObject, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const graphNode = node as GraphNode;
      const { x = 0, y = 0, color, size, label } = graphNode;
      const isSelected = selectedNodeId === graphNode.id;

      // Draw selection ring
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(x, y, size + 4, 0, 2 * Math.PI);
        ctx.fillStyle = "rgba(59, 130, 246, 0.3)";
        ctx.fill();
        ctx.strokeStyle = "#3B82F6";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Draw node
      ctx.beginPath();
      ctx.arc(x, y, size, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Draw label
      if (showLabels && globalScale > 0.5) {
        const fontSize = Math.min(12 / globalScale, 14);
        ctx.font = `${fontSize}px Inter, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillStyle = "hsl(var(--foreground))";
        
        const maxWidth = 80;
        const truncatedLabel = label.length > 15 ? label.slice(0, 15) + "..." : label;
        ctx.fillText(truncatedLabel, x, y + size + 4);
      }
    },
    [selectedNodeId, showLabels]
  );

  // Custom link rendering
  const linkCanvasObject = useCallback(
    (link: LinkObject, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const graphLink = link as GraphLink;
      const source = link.source as GraphNode;
      const target = link.target as GraphNode;

      if (!source.x || !source.y || !target.x || !target.y) return;

      // Draw link
      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);
      ctx.strokeStyle = graphLink.color;
      ctx.lineWidth = Math.max(0.5, graphLink.weight * 2);
      ctx.globalAlpha = 0.6;
      ctx.stroke();
      ctx.globalAlpha = 1;
    },
    []
  );

  // Control handlers
  const handleZoomIn = () => graphRef.current?.zoom(graphRef.current.zoom() * 1.5, 300);
  const handleZoomOut = () => graphRef.current?.zoom(graphRef.current.zoom() / 1.5, 300);
  const handleResetView = () => {
    graphRef.current?.zoomToFit(500, 50);
  };
  const handleCenterGraph = () => {
    graphRef.current?.centerAt(0, 0, 500);
  };

  // Export as PNG
  const handleExport = () => {
    const canvas = containerRef.current?.querySelector("canvas");
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = "knowledge-graph.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Move3D className="h-5 w-5" />
            Graph Visualization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full" style={{ height }} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Move3D className="h-5 w-5" />
            Graph Visualization
            <Badge variant="secondary">
              {nodes.length} nodes, {links.length} edges
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleResetView}>
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleCenterGraph}>
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleExport}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 mt-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Link Distance:</span>
            <Slider
              value={[linkDistance]}
              onValueChange={([v]) => setLinkDistance(v)}
              min={30}
              max={200}
              step={10}
              className="w-24"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Repulsion:</span>
            <Slider
              value={[Math.abs(chargeStrength)]}
              onValueChange={([v]) => setChargeStrength(-v)}
              min={50}
              max={500}
              step={50}
              className="w-24"
            />
          </div>
          <Button
            variant={showLabels ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setShowLabels(!showLabels)}
          >
            Labels
          </Button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 mt-3">
          {Object.entries(NODE_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-muted-foreground capitalize">{type}</span>
            </div>
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div
          ref={containerRef}
          className="w-full border-t bg-muted/20"
          style={{ height }}
        >
          {nodes.length > 0 ? (
            <ForceGraph2D
              ref={graphRef}
              width={dimensions.width}
              height={dimensions.height}
              graphData={{ nodes, links }}
              nodeId="id"
              nodeCanvasObject={nodeCanvasObject}
              linkCanvasObject={linkCanvasObject}
              onNodeClick={handleNodeClick}
              nodePointerAreaPaint={(node, color, ctx) => {
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(node.x!, node.y!, (node as GraphNode).size + 5, 0, 2 * Math.PI);
                ctx.fill();
              }}
              d3AlphaDecay={0.02}
              d3VelocityDecay={0.3}
              linkDirectionalParticles={0}
              warmupTicks={100}
              cooldownTicks={100}
              onEngineStop={() => graphRef.current?.zoomToFit(500, 50)}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No graph data available. Generate embeddings and extract entities first.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
