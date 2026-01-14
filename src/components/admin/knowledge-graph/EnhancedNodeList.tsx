import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Toggle } from "@/components/ui/toggle";
import {
  Search,
  ChevronRight,
  ChevronLeft,
  Building2,
  Scale,
  FileText,
  Lightbulb,
  Users,
  Globe,
  Move3D,
} from "lucide-react";
import type { KnowledgeNode, KnowledgeNodeType } from "@/types/knowledgeGraph";

const NODE_TYPE_CONFIG: Record<KnowledgeNodeType, { 
  icon: React.ElementType; 
  color: string;
  bgColor: string;
  label: { vi: string; en: string };
}> = {
  industry: { icon: Building2, color: "text-blue-500", bgColor: "bg-blue-500", label: { vi: "Ngành", en: "Industry" } },
  regulation: { icon: Scale, color: "text-red-500", bgColor: "bg-red-500", label: { vi: "Quy định", en: "Regulation" } },
  term: { icon: FileText, color: "text-green-500", bgColor: "bg-green-500", label: { vi: "Thuật ngữ", en: "Term" } },
  concept: { icon: Lightbulb, color: "text-purple-500", bgColor: "bg-purple-500", label: { vi: "Khái niệm", en: "Concept" } },
  persona: { icon: Users, color: "text-amber-500", bgColor: "bg-amber-500", label: { vi: "Persona", en: "Persona" } },
  jurisdiction: { icon: Globe, color: "text-indigo-500", bgColor: "bg-indigo-500", label: { vi: "Khu vực", en: "Jurisdiction" } },
};

const ALL_NODE_TYPES: KnowledgeNodeType[] = ["industry", "regulation", "term", "concept", "persona", "jurisdiction"];
const PAGE_SIZE = 50;

interface EnhancedNodeListProps {
  selectedNodeId: string | null;
  onNodeSelect: (nodeId: string) => void;
  onViewInGraph?: (nodeId: string) => void;
}

export function EnhancedNodeList({ 
  selectedNodeId, 
  onNodeSelect,
  onViewInGraph,
}: EnhancedNodeListProps) {
  const [selectedTypes, setSelectedTypes] = useState<Set<KnowledgeNodeType>>(
    new Set(["industry", "regulation"])
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch all active nodes
  const { data: allNodes, isLoading } = useQuery({
    queryKey: ["knowledge-nodes", "all-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("industry_knowledge_nodes")
        .select("id, node_type, node_key, display_name, description, created_at, updated_at, global_pack_id, properties, embedding, is_active")
        .eq("is_active", true)
        .order("node_type")
        .order("node_key");
      
      if (error) throw error;
      return data as unknown as KnowledgeNode[];
    },
  });

  // Filter nodes by type and search
  const filteredNodes = useMemo(() => {
    if (!allNodes) return [];
    
    let result = allNodes.filter((node) => selectedTypes.has(node.node_type));
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((node) => {
        const name = node.display_name?.vi || node.display_name?.en || "";
        return (
          name.toLowerCase().includes(query) ||
          node.node_key.toLowerCase().includes(query)
        );
      });
    }
    
    return result;
  }, [allNodes, selectedTypes, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredNodes.length / PAGE_SIZE);
  const paginatedNodes = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredNodes.slice(start, start + PAGE_SIZE);
  }, [filteredNodes, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTypes, searchQuery]);

  // Toggle type filter
  const toggleType = useCallback((type: KnowledgeNodeType) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        if (next.size > 1) next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  // Count nodes by type
  const typeCounts = useMemo(() => {
    if (!allNodes) return {};
    const counts: Partial<Record<KnowledgeNodeType, number>> = {};
    allNodes.forEach((node) => {
      counts[node.node_type] = (counts[node.node_type] || 0) + 1;
    });
    return counts;
  }, [allNodes]);

  return (
    <div className="h-full flex flex-col">
      {/* Type Filter Chips */}
      <div className="p-3 border-b">
        <div className="flex flex-wrap gap-1.5">
          {ALL_NODE_TYPES.map((type) => {
            const config = NODE_TYPE_CONFIG[type];
            const Icon = config.icon;
            const isSelected = selectedTypes.has(type);
            const count = typeCounts[type] || 0;
            
            return (
              <Toggle
                key={type}
                pressed={isSelected}
                onPressedChange={() => toggleType(type)}
                size="sm"
                className="gap-1 h-7 px-2 data-[state=on]:bg-primary/10"
              >
                <Icon className={`h-3.5 w-3.5 ${isSelected ? config.color : "text-muted-foreground"}`} />
                <span className="text-xs">{config.label.vi}</span>
                <span className="text-xs text-muted-foreground">({count})</span>
              </Toggle>
            );
          })}
        </div>
      </div>

      {/* Search */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm node..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Results Summary */}
      <div className="px-3 py-2 text-xs text-muted-foreground border-b bg-muted/30">
        {isLoading ? (
          <Skeleton className="h-4 w-32" />
        ) : (
          <span>
            {filteredNodes.length} kết quả
            {totalPages > 1 && ` • Trang ${currentPage}/${totalPages}`}
          </span>
        )}
      </div>

      {/* Node List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {isLoading ? (
            Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))
          ) : paginatedNodes.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              Không tìm thấy node nào
            </div>
          ) : (
            paginatedNodes.map((node) => (
              <NodeListItem
                key={node.id}
                node={node}
                isSelected={selectedNodeId === node.id}
                onSelect={() => onNodeSelect(node.id)}
                onViewInGraph={onViewInGraph ? () => onViewInGraph(node.id) : undefined}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-2 border-t flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className="h-8"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Trước
          </Button>
          <span className="text-xs text-muted-foreground">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="h-8"
          >
            Sau
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}

interface NodeListItemProps {
  node: KnowledgeNode;
  isSelected: boolean;
  onSelect: () => void;
  onViewInGraph?: () => void;
}

function NodeListItem({ node, isSelected, onSelect, onViewInGraph }: NodeListItemProps) {
  const config = NODE_TYPE_CONFIG[node.node_type];
  const Icon = config.icon;
  const displayName = node.display_name?.vi || node.display_name?.en || node.node_key;

  return (
    <div
      className={`group relative p-2.5 rounded-lg border transition-all cursor-pointer ${
        isSelected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-transparent hover:border-border hover:bg-muted/50"
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start gap-2.5">
        <div className={`p-1.5 rounded-md ${config.bgColor} text-white shrink-0`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{displayName}</p>
          <p className="text-xs text-muted-foreground truncate">{node.node_key}</p>
        </div>
        
        {/* Quick Action - View in Graph */}
        {onViewInGraph && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onViewInGraph();
            }}
            title="Xem trong đồ thị"
          >
            <Move3D className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
