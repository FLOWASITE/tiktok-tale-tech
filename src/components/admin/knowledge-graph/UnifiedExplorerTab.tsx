import { useState, useCallback, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ResizablePanelGroup, 
  ResizablePanel, 
  ResizableHandle 
} from "@/components/ui/resizable";
import { 
  GitBranch, 
  Move3D, 
  Search, 
  Network, 
  Plus,
  RefreshCw,
} from "lucide-react";
import { EnhancedNodeList } from "./EnhancedNodeList";
import { GraphCanvas } from "./GraphCanvas";
import { SemanticSearchPanel } from "./SemanticSearchPanel";
import { ExplorerStatsBar } from "./ExplorerStatsBar";
import { NodeDetailSidePanel } from "./NodeDetailSidePanel";
import { NodeEditorDialog } from "./GraphNodeEditor";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { KnowledgeNodeType, KnowledgeEdgeType, KnowledgeNode } from "@/types/knowledgeGraph";

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
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingNode, setEditingNode] = useState<KnowledgeNode | null>(null);
  
  const queryClient = useQueryClient();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K: Focus search
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSubTab("search");
      }
      // Escape: Deselect
      if (e.key === "Escape" && selectedNodeId) {
        onNodeSelect("");
      }
      // N: New node (when not in input)
      if (e.key === "n" && !e.ctrlKey && !e.metaKey && 
          !(e.target instanceof HTMLInputElement) && 
          !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setShowCreateDialog(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedNodeId, onNodeSelect]);

  const handleSearchNodeSelect = useCallback((nodeId: string) => {
    onNodeSelect(nodeId);
    setHighlightNodeId(nodeId);
    setSubTab("graph");
  }, [onNodeSelect]);

  const handleGraphNodeSelect = useCallback((nodeId: string) => {
    onNodeSelect(nodeId);
    setHighlightNodeId(nodeId);
  }, [onNodeSelect]);

  const handleListNodeSelect = useCallback((nodeId: string) => {
    onNodeSelect(nodeId);
    setHighlightNodeId(nodeId);
  }, [onNodeSelect]);

  const handleViewInGraph = useCallback((nodeId: string) => {
    setHighlightNodeId(nodeId);
    onNodeSelect(nodeId);
    setSubTab("graph");
  }, [onNodeSelect]);

  const handleCloseSidePanel = useCallback(() => {
    onNodeSelect("");
    setHighlightNodeId(null);
  }, [onNodeSelect]);

  const handleEditNode = useCallback((node: KnowledgeNode) => {
    setEditingNode(node);
  }, []);

  const handleNavigateToNode = useCallback((nodeId: string) => {
    onNodeSelect(nodeId);
    setHighlightNodeId(nodeId);
  }, [onNodeSelect]);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["knowledge-nodes"] });
    queryClient.invalidateQueries({ queryKey: ["graph-statistics"] });
    toast.success("Đã làm mới dữ liệu");
  }, [queryClient]);

  const handleNodeSaved = useCallback(() => {
    setShowCreateDialog(false);
    setEditingNode(null);
    queryClient.invalidateQueries({ queryKey: ["knowledge-nodes"] });
    toast.success("Đã lưu node thành công");
  }, [queryClient]);

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Network className="h-5 w-5" />
                Khám phá Knowledge Graph
              </CardTitle>
              <CardDescription>
                Duyệt danh sách, trực quan hóa và tìm kiếm ngữ nghĩa trong đồ thị tri thức
              </CardDescription>
              <ExplorerStatsBar />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh}
                className="gap-1.5"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline">Làm mới</span>
              </Button>
              <Button 
                size="sm" 
                onClick={() => setShowCreateDialog(true)}
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Tạo Node
              </Button>
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

            {/* List Tab with Side Panel */}
            <TabsContent value="list" className="mt-0">
              <ResizablePanelGroup direction="horizontal" className="min-h-[600px] rounded-lg border">
                <ResizablePanel defaultSize={selectedNodeId ? 60 : 100} minSize={40}>
                  <EnhancedNodeList
                    selectedNodeId={selectedNodeId}
                    onNodeSelect={handleListNodeSelect}
                    onViewInGraph={handleViewInGraph}
                  />
                </ResizablePanel>
                
                {selectedNodeId && (
                  <>
                    <ResizableHandle withHandle />
                    <ResizablePanel defaultSize={40} minSize={25} maxSize={50}>
                      <NodeDetailSidePanel
                        nodeId={selectedNodeId}
                        onClose={handleCloseSidePanel}
                        onEdit={handleEditNode}
                        onViewInGraph={handleViewInGraph}
                        onNavigateToNode={handleNavigateToNode}
                      />
                    </ResizablePanel>
                  </>
                )}
              </ResizablePanelGroup>
            </TabsContent>

            {/* Graph Tab with Side Panel */}
            <TabsContent value="graph" className="mt-0">
              <ResizablePanelGroup direction="horizontal" className="min-h-[600px] rounded-lg border">
                <ResizablePanel defaultSize={selectedNodeId ? 70 : 100} minSize={50}>
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
                </ResizablePanel>
                
                {selectedNodeId && (
                  <>
                    <ResizableHandle withHandle />
                    <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
                      <NodeDetailSidePanel
                        nodeId={selectedNodeId}
                        onClose={handleCloseSidePanel}
                        onEdit={handleEditNode}
                        onNavigateToNode={handleNavigateToNode}
                      />
                    </ResizablePanel>
                  </>
                )}
              </ResizablePanelGroup>
            </TabsContent>

            {/* Search Tab */}
            <TabsContent value="search" className="mt-0">
              <ResizablePanelGroup direction="horizontal" className="min-h-[600px] rounded-lg border">
                <ResizablePanel defaultSize={selectedNodeId ? 60 : 100} minSize={40}>
                  <SemanticSearchPanel 
                    onNodeSelect={handleSearchNodeSelect}
                    onNavigateToVisualization={() => setSubTab("graph")}
                  />
                </ResizablePanel>
                
                {selectedNodeId && (
                  <>
                    <ResizableHandle withHandle />
                    <ResizablePanel defaultSize={40} minSize={25} maxSize={50}>
                      <NodeDetailSidePanel
                        nodeId={selectedNodeId}
                        onClose={handleCloseSidePanel}
                        onEdit={handleEditNode}
                        onViewInGraph={handleViewInGraph}
                        onNavigateToNode={handleNavigateToNode}
                      />
                    </ResizablePanel>
                  </>
                )}
              </ResizablePanelGroup>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Create/Edit Node Dialog */}
      <NodeEditorDialog
        open={showCreateDialog || !!editingNode}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false);
            setEditingNode(null);
          }
        }}
        node={editingNode}
        onSuccess={handleNodeSaved}
      />
    </>
  );
}
