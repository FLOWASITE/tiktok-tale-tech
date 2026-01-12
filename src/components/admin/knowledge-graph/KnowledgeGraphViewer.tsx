// ============================================
// Knowledge Graph Viewer
// Visual display of nodes and relationships
// ============================================

import { useState, useMemo } from "react";
import { useKnowledgeNodesByType, useConnectedNodes } from "@/hooks/useKnowledgeGraph";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Network,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Filter,
  ChevronRight,
  Building2,
  Scale,
  FileText,
  Lightbulb,
  Users,
  Globe,
} from "lucide-react";
import type {
  KnowledgeNode,
  KnowledgeNodeType,
  ConnectedNode,
  NODE_TYPE_COLORS,
  NODE_TYPE_LABELS,
} from "@/types/knowledgeGraph";

// ============================================
// Constants
// ============================================

const NODE_TYPE_CONFIG: Record<KnowledgeNodeType, { 
  icon: React.ElementType; 
  color: string;
  label: { vi: string; en: string };
}> = {
  industry: { icon: Building2, color: "bg-blue-500", label: { vi: "Ngành", en: "Industry" } },
  regulation: { icon: Scale, color: "bg-red-500", label: { vi: "Quy định", en: "Regulation" } },
  term: { icon: FileText, color: "bg-green-500", label: { vi: "Thuật ngữ", en: "Term" } },
  concept: { icon: Lightbulb, color: "bg-purple-500", label: { vi: "Khái niệm", en: "Concept" } },
  persona: { icon: Users, color: "bg-amber-500", label: { vi: "Persona", en: "Persona" } },
  jurisdiction: { icon: Globe, color: "bg-indigo-500", label: { vi: "Khu vực", en: "Jurisdiction" } },
};

// ============================================
// Node Card Component
// ============================================

interface NodeCardProps {
  node: KnowledgeNode;
  isSelected: boolean;
  onSelect: (node: KnowledgeNode) => void;
}

function NodeCard({ node, isSelected, onSelect }: NodeCardProps) {
  const config = NODE_TYPE_CONFIG[node.node_type];
  const Icon = config.icon;
  const displayName = node.display_name?.vi || node.display_name?.en || node.node_key;

  return (
    <button
      onClick={() => onSelect(node)}
      className={`w-full text-left p-3 rounded-lg border transition-all hover:shadow-md ${
        isSelected
          ? "border-primary bg-primary/5 shadow-md"
          : "border-border bg-card hover:border-primary/50"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${config.color} text-white shrink-0`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{displayName}</p>
          <p className="text-xs text-muted-foreground truncate">{node.node_key}</p>
        </div>
        <ChevronRight className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${
          isSelected ? "rotate-90" : ""
        }`} />
      </div>
    </button>
  );
}

// ============================================
// Connected Nodes Panel
// ============================================

interface ConnectedNodesPanelProps {
  nodeId: string | null;
  onNodeSelect: (nodeId: string) => void;
}

function ConnectedNodesPanel({ nodeId, onNodeSelect }: ConnectedNodesPanelProps) {
  const { data: connected, isLoading } = useConnectedNodes(
    nodeId ? { nodeId, direction: "both" } : null
  );

  if (!nodeId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Chọn một node để xem kết nối
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-2 p-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!connected?.length) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Không có kết nối nào
      </div>
    );
  }

  const outgoing = connected.filter((c) => c.direction === "outgoing");
  const incoming = connected.filter((c) => c.direction === "incoming");

  return (
    <div className="space-y-4 p-2">
      {outgoing.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
            Liên kết đi ({outgoing.length})
          </h4>
          <div className="space-y-1">
            {outgoing.map((conn) => (
              <ConnectedNodeItem
                key={conn.node_id}
                connection={conn}
                onClick={() => onNodeSelect(conn.node_id)}
              />
            ))}
          </div>
        </div>
      )}
      {incoming.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
            Liên kết đến ({incoming.length})
          </h4>
          <div className="space-y-1">
            {incoming.map((conn) => (
              <ConnectedNodeItem
                key={conn.node_id}
                connection={conn}
                onClick={() => onNodeSelect(conn.node_id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ConnectedNodeItem({ 
  connection, 
  onClick 
}: { 
  connection: ConnectedNode; 
  onClick: () => void;
}) {
  const config = NODE_TYPE_CONFIG[connection.node_type];
  const Icon = config.icon;
  const displayName = connection.display_name?.vi || connection.display_name?.en || connection.node_key;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors text-left"
    >
      <div className={`p-1.5 rounded ${config.color} text-white`}>
        <Icon className="h-3 w-3" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{displayName}</p>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs px-1.5 py-0">
            {connection.edge_type.replace(/_/g, " ")}
          </Badge>
          <span className="text-xs text-muted-foreground">
            w: {connection.edge_weight.toFixed(2)}
          </span>
        </div>
      </div>
    </button>
  );
}

// ============================================
// Node Details Panel
// ============================================

interface NodeDetailsPanelProps {
  node: KnowledgeNode | null;
  onEdit?: (node: KnowledgeNode) => void;
}

function NodeDetailsPanel({ node, onEdit }: NodeDetailsPanelProps) {
  if (!node) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Chọn một node để xem chi tiết
      </div>
    );
  }

  const config = NODE_TYPE_CONFIG[node.node_type];
  const Icon = config.icon;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-start gap-3">
        <div className={`p-3 rounded-lg ${config.color} text-white`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">
            {node.display_name?.vi || node.display_name?.en || node.node_key}
          </h3>
          <p className="text-sm text-muted-foreground">{node.node_key}</p>
          <Badge variant="secondary" className="mt-1">
            {config.label.vi}
          </Badge>
        </div>
      </div>

      {node.description && (node.description.vi || node.description.en) && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-1 uppercase">Mô tả</h4>
          <p className="text-sm">{node.description.vi || node.description.en}</p>
        </div>
      )}

      {node.properties && Object.keys(node.properties).length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-1 uppercase">Thuộc tính</h4>
          <div className="bg-muted/50 rounded-md p-2 text-xs font-mono">
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(node.properties, null, 2)}
            </pre>
          </div>
        </div>
      )}

      <div className="text-xs text-muted-foreground space-y-1">
        <p>ID: {node.id}</p>
        <p>Tạo: {new Date(node.created_at).toLocaleString("vi-VN")}</p>
        <p>Cập nhật: {new Date(node.updated_at).toLocaleString("vi-VN")}</p>
      </div>

      {onEdit && (
        <Button variant="outline" size="sm" onClick={() => onEdit(node)} className="w-full">
          Chỉnh sửa
        </Button>
      )}
    </div>
  );
}

// ============================================
// Main Component
// ============================================

interface KnowledgeGraphViewerProps {
  globalPackId?: string;
  onEditNode?: (node: KnowledgeNode) => void;
}

export function KnowledgeGraphViewer({ globalPackId, onEditNode }: KnowledgeGraphViewerProps) {
  const [selectedType, setSelectedType] = useState<KnowledgeNodeType>("industry");
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: nodes, isLoading } = useKnowledgeNodesByType(selectedType);

  const filteredNodes = useMemo(() => {
    if (!nodes) return [];
    if (!searchQuery.trim()) return nodes;

    const query = searchQuery.toLowerCase();
    return nodes.filter((node) => {
      const name = node.display_name?.vi || node.display_name?.en || "";
      return (
        name.toLowerCase().includes(query) ||
        node.node_key.toLowerCase().includes(query)
      );
    });
  }, [nodes, searchQuery]);

  const handleNodeSelect = (node: KnowledgeNode) => {
    setSelectedNode(node);
  };

  const handleConnectedNodeSelect = (nodeId: string) => {
    const node = nodes?.find((n) => n.id === nodeId);
    if (node) {
      setSelectedNode(node);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 p-4 border-b">
        <div className="flex items-center gap-2">
          <Network className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Knowledge Graph</h2>
          {nodes && (
            <Badge variant="secondary">{nodes.length} nodes</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={selectedType}
            onValueChange={(v) => setSelectedType(v as KnowledgeNodeType)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(NODE_TYPE_CONFIG).map(([type, config]) => {
                const Icon = config.icon;
                return (
                  <SelectItem key={type} value={type}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {config.label.vi}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex min-h-0">
        {/* Node List */}
        <div className="w-80 border-r flex flex-col">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))
              ) : filteredNodes.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-8">
                  Không tìm thấy node nào
                </div>
              ) : (
                filteredNodes.map((node) => (
                  <NodeCard
                    key={node.id}
                    node={node}
                    isSelected={selectedNode?.id === node.id}
                    onSelect={handleNodeSelect}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Details & Connections */}
        <div className="flex-1 flex min-w-0">
          {/* Node Details */}
          <div className="w-1/2 border-r">
            <div className="h-10 border-b flex items-center px-4">
              <h3 className="text-sm font-medium text-muted-foreground">Chi tiết</h3>
            </div>
            <ScrollArea className="h-[calc(100%-40px)]">
              <NodeDetailsPanel node={selectedNode} onEdit={onEditNode} />
            </ScrollArea>
          </div>

          {/* Connections */}
          <div className="w-1/2">
            <div className="h-10 border-b flex items-center px-4">
              <h3 className="text-sm font-medium text-muted-foreground">Kết nối</h3>
            </div>
            <ScrollArea className="h-[calc(100%-40px)]">
              <ConnectedNodesPanel
                nodeId={selectedNode?.id || null}
                onNodeSelect={handleConnectedNodeSelect}
              />
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
}
