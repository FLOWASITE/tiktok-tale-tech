import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Toggle } from "@/components/ui/toggle";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Search,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Building2,
  Scale,
  FileText,
  Lightbulb,
  Users,
  Globe,
  Move3D,
  Filter,
  X,
} from "lucide-react";
import { getIconByName } from "@/lib/iconMapper";
import type { KnowledgeNode, KnowledgeNodeType } from "@/types/knowledgeGraph";

const NODE_TYPE_CONFIG: Record<KnowledgeNodeType, { 
  icon: React.ElementType; 
  color: string;
  bgColor: string;
  label: string;
}> = {
  industry: { icon: Building2, color: "text-blue-500", bgColor: "bg-blue-500", label: "Ngành" },
  regulation: { icon: Scale, color: "text-red-500", bgColor: "bg-red-500", label: "Quy định" },
  term: { icon: FileText, color: "text-green-500", bgColor: "bg-green-500", label: "Thuật ngữ" },
  concept: { icon: Lightbulb, color: "text-purple-500", bgColor: "bg-purple-500", label: "Khái niệm" },
  persona: { icon: Users, color: "text-amber-500", bgColor: "bg-amber-500", label: "Persona" },
  jurisdiction: { icon: Globe, color: "text-indigo-500", bgColor: "bg-indigo-500", label: "Khu vực" },
};

const ALL_NODE_TYPES: KnowledgeNodeType[] = ["industry", "regulation", "term", "concept", "persona", "jurisdiction"];
const PAGE_SIZE = 50;

interface IndustryCategory {
  id: string;
  code: string;
  label: string;
  icon_name: string;
  color: string;
}

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
    new Set(ALL_NODE_TYPES)
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);

  // Fetch industry categories
  const { data: categories } = useQuery({
    queryKey: ["industry-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("industry_categories")
        .select("id, code, label, icon_name, color")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data as IndustryCategory[];
    },
  });

  // Fetch global packs with category mapping
  const { data: packCategoryMap } = useQuery({
    queryKey: ["pack-category-map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("industry_global_packs")
        .select("id, category_id")
        .eq("is_active", true);
      if (error) throw error;
      const map: Record<string, string> = {};
      data?.forEach((p) => {
        if (p.category_id) map[p.id] = p.category_id;
      });
      return map;
    },
  });

  // Fetch all active nodes with global_pack_id
  const { data: allNodes, isLoading } = useQuery({
    queryKey: ["knowledge-nodes", "all-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("industry_knowledge_nodes")
        .select("id, node_type, node_key, display_name, properties, global_pack_id")
        .eq("is_active", true)
        .order("node_type")
        .order("node_key");
      
      if (error) throw error;
      return data as unknown as (KnowledgeNode & { global_pack_id?: string })[];
    },
  });

  // Filter nodes by type, category, and search
  const filteredNodes = useMemo(() => {
    if (!allNodes) return [];
    
    let result = allNodes.filter((node) => selectedTypes.has(node.node_type));
    
    // Filter by category if selected
    if (selectedCategoryId && packCategoryMap) {
      result = result.filter((node) => {
        if (!node.global_pack_id) return false;
        return packCategoryMap[node.global_pack_id] === selectedCategoryId;
      });
    }
    
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
  }, [allNodes, selectedTypes, selectedCategoryId, packCategoryMap, searchQuery]);

  // Count nodes by category
  const categoryCounts = useMemo(() => {
    if (!allNodes || !packCategoryMap) return {};
    const counts: Record<string, number> = {};
    allNodes.forEach((node) => {
      if (node.global_pack_id && packCategoryMap[node.global_pack_id]) {
        const catId = packCategoryMap[node.global_pack_id];
        counts[catId] = (counts[catId] || 0) + 1;
      }
    });
    return counts;
  }, [allNodes, packCategoryMap]);

  // Pagination
  const totalPages = Math.ceil(filteredNodes.length / PAGE_SIZE);
  const paginatedNodes = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredNodes.slice(start, start + PAGE_SIZE);
  }, [filteredNodes, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTypes, selectedCategoryId, searchQuery]);

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

  const selectedCategory = categories?.find((c) => c.id === selectedCategoryId);

  return (
    <div className="h-full flex flex-col">
      {/* Compact Type Filter - Horizontal scroll */}
      <div className="p-2 border-b">
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
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
                className="gap-1 h-6 px-1.5 shrink-0 data-[state=on]:bg-primary/10"
              >
                <Icon className={`h-3 w-3 ${isSelected ? config.color : "text-muted-foreground"}`} />
                <span className="text-[10px]">{config.label}</span>
                <span className="text-[10px] text-muted-foreground">({count})</span>
              </Toggle>
            );
          })}
        </div>
      </div>

      {/* Industry Category Filter */}
      <Collapsible open={showCategoryFilter} onOpenChange={setShowCategoryFilter}>
        <div className="px-2 py-1.5 border-b flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2">
              <Filter className="h-3 w-3" />
              <span className="text-xs">Lọc theo ngành</span>
              <ChevronDown className={`h-3 w-3 transition-transform ${showCategoryFilter ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
          {selectedCategory && (
            <Badge variant="secondary" className="h-5 gap-1 text-[10px] px-1.5">
              {selectedCategory.label}
              <button
                onClick={() => setSelectedCategoryId(null)}
                className="ml-0.5 hover:bg-muted rounded-sm"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          )}
        </div>
        <CollapsibleContent>
          <ScrollArea className="max-h-40">
            <div className="p-2 grid grid-cols-2 gap-1">
              {categories?.map((cat) => {
                const IconComponent = getIconByName(cat.icon_name);
                const count = categoryCounts[cat.id] || 0;
                const isSelected = selectedCategoryId === cat.id;
                
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategoryId(isSelected ? null : cat.id)}
                    className={`flex items-center gap-1.5 p-1.5 rounded text-left text-xs transition-colors ${
                      isSelected 
                        ? "bg-primary/10 text-primary" 
                        : "hover:bg-muted"
                    }`}
                  >
                    <IconComponent className="h-3 w-3 shrink-0" style={{ color: cat.color }} />
                    <span className="truncate flex-1">{cat.label}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">({count})</span>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </CollapsibleContent>
      </Collapsible>

      {/* Search */}
      <div className="p-2 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm node..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      {/* Results Summary */}
      <div className="px-2 py-1.5 text-[11px] text-muted-foreground border-b bg-muted/30">
        {isLoading ? (
          <div><Skeleton className="h-3 w-24" /></div>
        ) : (
          <span>
            {filteredNodes.length} kết quả
            {totalPages > 1 && ` • Trang ${currentPage}/${totalPages}`}
          </span>
        )}
      </div>

      {/* Node List */}
      <ScrollArea className="flex-1">
        <div className="p-1.5 space-y-0.5">
          {isLoading ? (
            Array.from({ length: 10 }).map((_, i) => (
              <div key={i}><Skeleton className="h-12 w-full" /></div>
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

      {/* Compact Pagination */}
      {totalPages > 1 && (
        <div className="p-1.5 border-t flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className="h-7 px-2"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-[11px] text-muted-foreground">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="h-7 px-2"
          >
            <ChevronRight className="h-3.5 w-3.5" />
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

const NodeListItem = React.memo(function NodeListItem({ 
  node, 
  isSelected, 
  onSelect, 
  onViewInGraph 
}: NodeListItemProps) {
  const config = NODE_TYPE_CONFIG[node.node_type];
  const Icon = config.icon;
  const displayName = node.display_name?.vi || node.display_name?.en || node.node_key;

  return (
    <div
      className={`group relative p-2 rounded-md border transition-all cursor-pointer ${
        isSelected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-transparent hover:border-border hover:bg-muted/50"
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2">
        <div className={`p-1 rounded ${config.bgColor} text-white shrink-0`}>
          <Icon className="h-3 w-3" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{displayName}</p>
          <p className="text-[10px] text-muted-foreground truncate">{node.node_key}</p>
        </div>
        
        {onViewInGraph && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onViewInGraph();
            }}
            title="Xem trong đồ thị"
          >
            <Move3D className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
});
