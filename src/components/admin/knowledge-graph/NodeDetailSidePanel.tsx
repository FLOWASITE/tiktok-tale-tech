import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { 
  X, 
  Pencil, 
  Move3D, 
  Link2,
  Building2,
  Scale,
  FileText,
  Lightbulb,
  Users,
  Globe,
  ExternalLink,
} from "lucide-react";
import { useKnowledgeNode, useConnectedNodes } from "@/hooks/useKnowledgeGraph";
import type { KnowledgeNode, KnowledgeNodeType, ConnectedNode } from "@/types/knowledgeGraph";

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

interface NodeDetailSidePanelProps {
  nodeId: string | null;
  onClose: () => void;
  onEdit?: (node: KnowledgeNode) => void;
  onViewInGraph?: (nodeId: string) => void;
  onNavigateToNode?: (nodeId: string) => void;
}

export function NodeDetailSidePanel({ 
  nodeId, 
  onClose, 
  onEdit,
  onViewInGraph,
  onNavigateToNode,
}: NodeDetailSidePanelProps) {
  const { data: node, isLoading: nodeLoading } = useKnowledgeNode(nodeId);
  const { data: connected, isLoading: connectedLoading } = useConnectedNodes(
    nodeId ? { nodeId, direction: "both" } : null
  );

  if (!nodeId) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-6">
        <Move3D className="h-10 w-10 mb-3 opacity-50" />
        <p className="text-sm text-center">
          Chọn một node từ danh sách, đồ thị hoặc kết quả tìm kiếm để xem chi tiết
        </p>
      </div>
    );
  }

  if (nodeLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <div><Skeleton className="h-12 w-12 rounded-lg" /></div>
          <div className="flex-1 space-y-2">
            <div><Skeleton className="h-5 w-3/4" /></div>
            <div><Skeleton className="h-4 w-1/2" /></div>
          </div>
        </div>
        <div><Skeleton className="h-20 w-full" /></div>
        <div><Skeleton className="h-32 w-full" /></div>
      </div>
    );
  }

  if (!node) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-6">
        <p className="text-sm">Node không tồn tại</p>
      </div>
    );
  }

  const config = NODE_TYPE_CONFIG[node.node_type];
  const Icon = config.icon;
  const displayName = node.display_name?.vi || node.display_name?.en || node.node_key;
  
  const outgoing = connected?.filter((c) => c.direction === "outgoing") || [];
  const incoming = connected?.filter((c) => c.direction === "incoming") || [];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <span className="text-sm font-medium">Chi tiết Node</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Node Header */}
          <div className="flex items-start gap-3">
            <div className={`p-3 rounded-lg ${config.color} text-white shrink-0`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{displayName}</h3>
              <p className="text-xs text-muted-foreground truncate">{node.node_key}</p>
              <Badge variant="secondary" className="mt-1.5 text-xs">
                {config.label.vi}
              </Badge>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            {onEdit && (
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 gap-1.5"
                onClick={() => onEdit(node)}
              >
                <Pencil className="h-3.5 w-3.5" />
                Chỉnh sửa
              </Button>
            )}
            {onViewInGraph && (
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 gap-1.5"
                onClick={() => onViewInGraph(node.id)}
              >
                <Move3D className="h-3.5 w-3.5" />
                Xem đồ thị
              </Button>
            )}
          </div>

          <Separator />

          {/* Description */}
          {node.description && (node.description.vi || node.description.en) && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                Mô tả
              </h4>
              <p className="text-sm leading-relaxed">
                {node.description.vi || node.description.en}
              </p>
            </div>
          )}

          {/* Source URL */}
          {node.properties?.source_url && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                Nguồn
              </h4>
              <a 
                href={node.properties.source_url as string}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline inline-flex items-center gap-1"
              >
                Xem văn bản gốc
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          <Separator />

          {/* Connections */}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide flex items-center gap-1.5">
              <Link2 className="h-3.5 w-3.5" />
              Kết nối ({(outgoing.length + incoming.length)})
            </h4>
            
            {connectedLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (outgoing.length + incoming.length) === 0 ? (
              <p className="text-sm text-muted-foreground">Không có kết nối</p>
            ) : (
              <div className="space-y-3">
                {outgoing.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Đi đến ({outgoing.length})
                    </p>
                    <div className="space-y-1">
                      {outgoing.slice(0, 5).map((conn) => (
                        <ConnectionItem 
                          key={conn.node_id} 
                          connection={conn} 
                          onClick={() => onNavigateToNode?.(conn.node_id)}
                        />
                      ))}
                      {outgoing.length > 5 && (
                        <p className="text-xs text-muted-foreground pl-2">
                          +{outgoing.length - 5} khác
                        </p>
                      )}
                    </div>
                  </div>
                )}
                
                {incoming.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Đến từ ({incoming.length})
                    </p>
                    <div className="space-y-1">
                      {incoming.slice(0, 5).map((conn) => (
                        <ConnectionItem 
                          key={conn.node_id} 
                          connection={conn} 
                          onClick={() => onNavigateToNode?.(conn.node_id)}
                        />
                      ))}
                      {incoming.length > 5 && (
                        <p className="text-xs text-muted-foreground pl-2">
                          +{incoming.length - 5} khác
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Metadata */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-mono truncate">ID: {node.id.slice(0, 8)}...</p>
            <p>Tạo: {new Date(node.created_at).toLocaleDateString("vi-VN")}</p>
            <p>Cập nhật: {new Date(node.updated_at).toLocaleDateString("vi-VN")}</p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

function ConnectionItem({ 
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
      <div className={`p-1 rounded ${config.color} text-white`}>
        <Icon className="h-3 w-3" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs truncate">{displayName}</p>
        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
          {connection.edge_type.replace(/_/g, " ")}
        </Badge>
      </div>
    </button>
  );
}
