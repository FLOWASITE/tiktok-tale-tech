// ============================================
// Interactive Graph Visualization Canvas
// D3 force-directed graph for knowledge graph
// With filtering and path highlighting
// ============================================

import { useRef, useCallback, useMemo, useState, useEffect } from "react";
import ForceGraph2D, { ForceGraphMethods, NodeObject, LinkObject } from "react-force-graph-2d";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Download,
  Filter,
  Move3D,
  X,
} from "lucide-react";
import { useGraphVisualizationData } from "@/hooks/useGraphVisualization";
import type { KnowledgeNodeType, KnowledgeEdgeType } from "@/types/knowledgeGraph";
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
  highlightNodeId?: string | null;
  filterNodeTypes?: KnowledgeNodeType[];
  filterEdgeTypes?: KnowledgeEdgeType[];
  onFilterNodeTypesChange?: (types: KnowledgeNodeType[]) => void;
  onFilterEdgeTypesChange?: (types: KnowledgeEdgeType[]) => void;
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

const NODE_TYPE_LABELS: Record<KnowledgeNodeType, string> = {
  industry: "Ngành",
  regulation: "Quy định",
  term: "Thuật ngữ",
  concept: "Khái niệm",
  persona: "Persona",
  jurisdiction: "Khu vực",
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

const EDGE_TYPE_LABELS: Record<KnowledgeEdgeType, string> = {
  related_to: "Liên quan",
  parent_of: "Cha của",
  regulated_by: "Được quy định bởi",
  uses_term: "Sử dụng thuật ngữ",
  shares_audience: "Cùng đối tượng",
  competes_with: "Cạnh tranh với",
  requires_compliance: "Cần tuân thủ",
  derived_from: "Phát sinh từ",
  applies_to: "Áp dụng cho",
};

const ALL_NODE_TYPES: KnowledgeNodeType[] = ["industry", "regulation", "term", "concept", "persona", "jurisdiction"];
const ALL_EDGE_TYPES: KnowledgeEdgeType[] = ["related_to", "parent_of", "regulated_by", "uses_term", "shares_audience", "competes_with", "requires_compliance", "derived_from", "applies_to"];

// ============================================
// Filter Popover Component
// ============================================

interface FilterPopoverProps {
  selectedNodeTypes: KnowledgeNodeType[];
  selectedEdgeTypes: KnowledgeEdgeType[];
  onNodeTypesChange: (types: KnowledgeNodeType[]) => void;
  onEdgeTypesChange: (types: KnowledgeEdgeType[]) => void;
}

function FilterPopover({ 
  selectedNodeTypes, 
  selectedEdgeTypes, 
  onNodeTypesChange, 
  onEdgeTypesChange 
}: FilterPopoverProps) {
  const toggleNodeType = (type: KnowledgeNodeType) => {
    if (selectedNodeTypes.includes(type)) {
      onNodeTypesChange(selectedNodeTypes.filter(t => t !== type));
    } else {
      onNodeTypesChange([...selectedNodeTypes, type]);
    }
  };

  const toggleEdgeType = (type: KnowledgeEdgeType) => {
    if (selectedEdgeTypes.includes(type)) {
      onEdgeTypesChange(selectedEdgeTypes.filter(t => t !== type));
    } else {
      onEdgeTypesChange([...selectedEdgeTypes, type]);
    }
  };

  const clearAll = () => {
    onNodeTypesChange([]);
    onEdgeTypesChange([]);
  };

  const hasFilters = selectedNodeTypes.length > 0 || selectedEdgeTypes.length > 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant={hasFilters ? "default" : "outline"} size="sm" className="gap-2">
          <Filter className="h-4 w-4" />
          Lọc
          {hasFilters && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5">
              {selectedNodeTypes.length + selectedEdgeTypes.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Bộ lọc đồ thị</h4>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearAll} className="h-7 text-xs">
                <X className="h-3 w-3 mr-1" />
                Xóa tất cả
              </Button>
            )}
          </div>

          {/* Node Type Filters */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Loại node</Label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_NODE_TYPES.map((type) => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={`node-${type}`}
                    checked={selectedNodeTypes.length === 0 || selectedNodeTypes.includes(type)}
                    onCheckedChange={() => toggleNodeType(type)}
                  />
                  <label
                    htmlFor={`node-${type}`}
                    className="text-sm cursor-pointer flex items-center gap-1.5"
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: NODE_COLORS[type] }}
                    />
                    {NODE_TYPE_LABELS[type]}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Edge Type Filters */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Loại edge</Label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
              {ALL_EDGE_TYPES.map((type) => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={`edge-${type}`}
                    checked={selectedEdgeTypes.length === 0 || selectedEdgeTypes.includes(type)}
                    onCheckedChange={() => toggleEdgeType(type)}
                  />
                  <label
                    htmlFor={`edge-${type}`}
                    className="text-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <div
                      className="w-2.5 h-1"
                      style={{ backgroundColor: EDGE_COLORS[type] }}
                    />
                    {EDGE_TYPE_LABELS[type]}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ============================================
// Main Component
// ============================================

export function GraphCanvas({
  onNodeSelect,
  selectedNodeId,
  highlightNodeId,
  filterNodeTypes = [],
  filterEdgeTypes = [],
  onFilterNodeTypesChange,
  onFilterEdgeTypesChange,
  height = 600,
}: GraphCanvasProps) {
  const graphRef = useRef<ForceGraphMethods>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height });
  const [linkDistance, setLinkDistance] = useState(100);
  const [chargeStrength, setChargeStrength] = useState(-300);
  const [showLabels, setShowLabels] = useState(true);
  const [localNodeTypes, setLocalNodeTypes] = useState<KnowledgeNodeType[]>(filterNodeTypes);
  const [localEdgeTypes, setLocalEdgeTypes] = useState<KnowledgeEdgeType[]>(filterEdgeTypes);

  // Sync local filters with props
  useEffect(() => {
    setLocalNodeTypes(filterNodeTypes);
  }, [filterNodeTypes]);

  useEffect(() => {
    setLocalEdgeTypes(filterEdgeTypes);
  }, [filterEdgeTypes]);

  const handleNodeTypesChange = (types: KnowledgeNodeType[]) => {
    setLocalNodeTypes(types);
    onFilterNodeTypesChange?.(types);
  };

  const handleEdgeTypesChange = (types: KnowledgeEdgeType[]) => {
    setLocalEdgeTypes(types);
    onFilterEdgeTypesChange?.(types);
  };

  const { data: graphData, isLoading } = useGraphVisualizationData({
    nodeTypes: localNodeTypes.length > 0 ? localNodeTypes : undefined,
    edgeTypes: localEdgeTypes.length > 0 ? localEdgeTypes : undefined,
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

  // Apply D3 force settings when they change
  useEffect(() => {
    if (!graphRef.current) return;
    
    const linkForce = graphRef.current.d3Force('link');
    if (linkForce && typeof linkForce.distance === 'function') {
      linkForce.distance(linkDistance);
    }
    
    const chargeForce = graphRef.current.d3Force('charge');
    if (chargeForce && typeof chargeForce.strength === 'function') {
      chargeForce.strength(chargeStrength);
    }
    
    graphRef.current.d3ReheatSimulation();
  }, [linkDistance, chargeStrength]);

  // Center on highlighted node when it changes
  useEffect(() => {
    if (!highlightNodeId || !graphRef.current) return;
    
    // Find the node and center on it
    const node = nodes.find(n => n.id === highlightNodeId);
    if (node && node.x !== undefined && node.y !== undefined) {
      graphRef.current.centerAt(node.x, node.y, 500);
      graphRef.current.zoom(2, 500);
    }
  }, [highlightNodeId]);

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
      
      graphRef.current?.centerAt(node.x, node.y, 500);
      graphRef.current?.zoom(2, 500);
    },
    [onNodeSelect]
  );

  // Custom node rendering with highlight support
  const nodeCanvasObject = useCallback(
    (node: NodeObject, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const graphNode = node as GraphNode;
      const { x = 0, y = 0, color, size, label } = graphNode;
      const isSelected = selectedNodeId === graphNode.id;
      const isHighlighted = highlightNodeId === graphNode.id;

      // Draw highlight ring (pulsing effect for navigated node)
      if (isHighlighted) {
        ctx.beginPath();
        ctx.arc(x, y, size + 8, 0, 2 * Math.PI);
        ctx.fillStyle = "rgba(59, 130, 246, 0.2)";
        ctx.fill();
        ctx.strokeStyle = "#3B82F6";
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Draw selection ring
      if (isSelected && !isHighlighted) {
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
        
        const truncatedLabel = label.length > 15 ? label.slice(0, 15) + "..." : label;
        ctx.fillText(truncatedLabel, x, y + size + 4);
      }
    },
    [selectedNodeId, highlightNodeId, showLabels]
  );

  // Custom link rendering
  const linkCanvasObject = useCallback(
    (link: LinkObject, ctx: CanvasRenderingContext2D) => {
      const graphLink = link as GraphLink;
      const source = link.source as GraphNode;
      const target = link.target as GraphNode;

      if (!source.x || !source.y || !target.x || !target.y) return;

      // Check if this link connects to highlighted/selected node
      const isHighlightedPath = 
        highlightNodeId && (
          (typeof graphLink.source === 'object' && graphLink.source.id === highlightNodeId) ||
          (typeof graphLink.target === 'object' && graphLink.target.id === highlightNodeId)
        );

      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);
      ctx.strokeStyle = isHighlightedPath ? "#3B82F6" : graphLink.color;
      ctx.lineWidth = isHighlightedPath ? 3 : Math.max(0.5, graphLink.weight * 2);
      ctx.globalAlpha = isHighlightedPath ? 1 : 0.6;
      ctx.stroke();
      ctx.globalAlpha = 1;
    },
    [highlightNodeId]
  );

  // Control handlers
  const handleZoomIn = () => graphRef.current?.zoom(graphRef.current.zoom() * 1.5, 300);
  const handleZoomOut = () => graphRef.current?.zoom(graphRef.current.zoom() / 1.5, 300);
  const handleResetView = () => graphRef.current?.zoomToFit(500, 50);
  const handleCenterGraph = () => graphRef.current?.centerAt(0, 0, 500);

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
            <FilterPopover
              selectedNodeTypes={localNodeTypes}
              selectedEdgeTypes={localEdgeTypes}
              onNodeTypesChange={handleNodeTypesChange}
              onEdgeTypesChange={handleEdgeTypesChange}
            />
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
              <span className="text-xs text-muted-foreground">{NODE_TYPE_LABELS[type as KnowledgeNodeType]}</span>
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
