import { useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GitBranch, Move3D, Search, Network } from "lucide-react";
import { KnowledgeGraphViewer } from "./KnowledgeGraphViewer";
import { GraphCanvas } from "./GraphCanvas";
import { SemanticSearchPanel } from "./SemanticSearchPanel";
import type { KnowledgeNodeType, KnowledgeEdgeType } from "@/types/knowledgeGraph";

interface UnifiedExplorerTabProps {
  selectedNodeId: string | null;
  onNodeSelect: (nodeId: string) => void;
  onNavigateToSuggestions?: (nodeId: string) => void;
}

export function UnifiedExplorerTab({ 
  selectedNodeId, 
  onNodeSelect,
  onNavigateToSuggestions 
}: UnifiedExplorerTabProps) {
  const [subTab, setSubTab] = useState("list");
  const [highlightNodeId, setHighlightNodeId] = useState<string | null>(null);
  const [filterNodeTypes, setFilterNodeTypes] = useState<KnowledgeNodeType[]>([]);
  const [filterEdgeTypes, setFilterEdgeTypes] = useState<KnowledgeEdgeType[]>([]);

  const handleSearchNodeSelect = useCallback((nodeId: string) => {
    onNodeSelect(nodeId);
    setHighlightNodeId(nodeId);
    setSubTab("graph");
  }, [onNodeSelect]);

  const handleGraphNodeSelect = useCallback((nodeId: string) => {
    onNodeSelect(nodeId);
    setHighlightNodeId(nodeId);
  }, [onNodeSelect]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              Khám phá Knowledge Graph
            </CardTitle>
            <CardDescription>
              Duyệt danh sách, trực quan hóa và tìm kiếm ngữ nghĩa trong đồ thị tri thức
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={subTab} onValueChange={setSubTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="list" className="gap-1.5">
              <GitBranch className="h-4 w-4" />
              Danh sách
            </TabsTrigger>
            <TabsTrigger value="graph" className="gap-1.5">
              <Move3D className="h-4 w-4" />
              Đồ thị
            </TabsTrigger>
            <TabsTrigger value="search" className="gap-1.5">
              <Search className="h-4 w-4" />
              Tìm kiếm
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-0">
            <KnowledgeGraphViewer />
          </TabsContent>

          <TabsContent value="graph" className="mt-0">
            <GraphCanvas 
              onNodeSelect={handleGraphNodeSelect}
              selectedNodeId={selectedNodeId}
              highlightNodeId={highlightNodeId}
              filterNodeTypes={filterNodeTypes}
              filterEdgeTypes={filterEdgeTypes}
              onFilterNodeTypesChange={setFilterNodeTypes}
              onFilterEdgeTypesChange={setFilterEdgeTypes}
              height={600}
            />
          </TabsContent>

          <TabsContent value="search" className="mt-0">
            <SemanticSearchPanel 
              onNodeSelect={handleSearchNodeSelect}
              onNavigateToVisualization={() => setSubTab("graph")}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
