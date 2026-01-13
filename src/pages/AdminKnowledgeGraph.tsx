import { useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Network, GitBranch, RefreshCw, Database, Scale, Search, Move3D, BarChart3, Wrench, Lightbulb, Globe, Layers } from "lucide-react";
import { 
  KnowledgeGraphViewer, 
  RegulationPropagationPanel,
  CreateNodeButton,
  BatchEmbeddingsPanel,
  BatchProcessingPanel,
  EntityExtractionPanel,
  GraphCanvas,
  SemanticSearchPanel,
  ConnectionSuggestions,
  BulkImportExport,
  GraphAnalyticsDashboard
} from "@/components/admin/knowledge-graph";
import { RegulationSourcesPanel } from "@/components/admin/knowledge-graph/RegulationSourcesPanel";
import { PropagationNotificationsBadge } from "@/components/admin/knowledge-graph/PropagationNotificationsBadge";
import { RealtimeStatusIndicator } from "@/hooks/useRealtimeGraph";
import type { KnowledgeNodeType, KnowledgeEdgeType } from "@/types/knowledgeGraph";

export default function AdminKnowledgeGraph() {
  const [activeTab, setActiveTab] = useState("explorer");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [highlightNodeId, setHighlightNodeId] = useState<string | null>(null);
  
  // Filter states for GraphCanvas
  const [filterNodeTypes, setFilterNodeTypes] = useState<KnowledgeNodeType[]>([]);
  const [filterEdgeTypes, setFilterEdgeTypes] = useState<KnowledgeEdgeType[]>([]);

  // Handle node selection from search - navigate to visualization tab and highlight
  const handleSearchNodeSelect = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    setHighlightNodeId(nodeId);
    setActiveTab("visualization");
  }, []);

  // Handle node selection within visualization
  const handleVisualizationNodeSelect = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    setHighlightNodeId(nodeId);
  }, []);

  // Handle orphan node click - navigate to AI Suggest tab to create connections
  const handleOrphanNodeNavigate = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    setActiveTab("suggestions");
  }, []);

  // Handle navigate to propagation tab
  const handleNavigateToPropagation = useCallback(() => {
    setActiveTab("regulations");
  }, []);

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
            <Network className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Knowledge Graph</h1>
            <p className="text-sm text-muted-foreground">
              Quản lý đồ thị tri thức ngành và quy định pháp lý
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <PropagationNotificationsBadge onNavigateToPropagation={handleNavigateToPropagation} />
          <RealtimeStatusIndicator />
          <CreateNodeButton />
        </div>
      </div>

      {/* Tabs - Organized into logical groups */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="border rounded-lg p-1 bg-muted/30">
          <div className="flex flex-wrap gap-1 items-center">
            {/* Group 1: Browse & View */}
            <div className="flex items-center gap-0.5 px-1">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mr-1 hidden sm:inline">
                Browse
              </span>
              <TabsList className="h-9 bg-transparent p-0">
                <TabsTrigger value="explorer" className="gap-1.5 data-[state=active]:bg-background h-8 px-3 text-xs">
                  <Network className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Explorer</span>
                </TabsTrigger>
                <TabsTrigger value="visualization" className="gap-1.5 data-[state=active]:bg-background h-8 px-3 text-xs">
                  <Move3D className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Graph</span>
                </TabsTrigger>
                <TabsTrigger value="search" className="gap-1.5 data-[state=active]:bg-background h-8 px-3 text-xs">
                  <Search className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Tìm kiếm</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="w-px h-6 bg-border hidden sm:block" />

            {/* Group 2: Data & AI */}
            <div className="flex items-center gap-0.5 px-1">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mr-1 hidden sm:inline">
                Data
              </span>
              <TabsList className="h-9 bg-transparent p-0">
                <TabsTrigger value="analytics" className="gap-1.5 data-[state=active]:bg-background h-8 px-3 text-xs">
                  <BarChart3 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Thống kê</span>
                </TabsTrigger>
                <TabsTrigger value="embeddings" className="gap-1.5 data-[state=active]:bg-background h-8 px-3 text-xs">
                  <Database className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Vectors</span>
                </TabsTrigger>
                <TabsTrigger value="extraction" className="gap-1.5 data-[state=active]:bg-background h-8 px-3 text-xs">
                  <Scale className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Trích xuất</span>
                </TabsTrigger>
                <TabsTrigger value="suggestions" className="gap-1.5 data-[state=active]:bg-background h-8 px-3 text-xs">
                  <Lightbulb className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">AI Gợi ý</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="w-px h-6 bg-border hidden sm:block" />

            {/* Group 3: Regulations & Sources */}
            <div className="flex items-center gap-0.5 px-1">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mr-1 hidden sm:inline">
                Quy định
              </span>
              <TabsList className="h-9 bg-transparent p-0">
                <TabsTrigger value="sources" className="gap-1.5 data-[state=active]:bg-background h-8 px-3 text-xs">
                  <Globe className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Nguồn</span>
                </TabsTrigger>
                <TabsTrigger value="regulations" className="gap-1.5 data-[state=active]:bg-background h-8 px-3 text-xs">
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Cập nhật</span>
                </TabsTrigger>
                <TabsTrigger value="batch-ops" className="gap-1.5 data-[state=active]:bg-background h-8 px-3 text-xs">
                  <Layers className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Batch Ops</span>
                </TabsTrigger>
                <TabsTrigger value="tools" className="gap-1.5 data-[state=active]:bg-background h-8 px-3 text-xs">
                  <Wrench className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Import/Export</span>
                </TabsTrigger>
              </TabsList>
            </div>
          </div>
        </div>

        <TabsContent value="explorer" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                Knowledge Graph Explorer
              </CardTitle>
              <CardDescription>
                Khám phá và quản lý các node trong đồ thị tri thức: ngành nghề, quy định, thuật ngữ, personas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <KnowledgeGraphViewer />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="visualization" className="space-y-6">
          <GraphCanvas 
            onNodeSelect={handleVisualizationNodeSelect}
            selectedNodeId={selectedNodeId}
            highlightNodeId={highlightNodeId}
            filterNodeTypes={filterNodeTypes}
            filterEdgeTypes={filterEdgeTypes}
            onFilterNodeTypesChange={setFilterNodeTypes}
            onFilterEdgeTypesChange={setFilterEdgeTypes}
            height={700}
          />
        </TabsContent>

        <TabsContent value="search" className="space-y-6">
          <SemanticSearchPanel 
            onNodeSelect={handleSearchNodeSelect}
            onNavigateToVisualization={() => setActiveTab("visualization")}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <GraphAnalyticsDashboard onNavigateToNode={handleOrphanNodeNavigate} />
        </TabsContent>

        <TabsContent value="embeddings" className="space-y-6">
          <BatchEmbeddingsPanel />
        </TabsContent>

        <TabsContent value="extraction" className="space-y-6">
          <EntityExtractionPanel />
        </TabsContent>

        <TabsContent value="suggestions" className="space-y-6">
          <ConnectionSuggestions 
            nodeId={selectedNodeId}
            onConnectionCreated={() => {}}
          />
        </TabsContent>

        <TabsContent value="regulations" className="space-y-6">
          <RegulationPropagationPanel />
        </TabsContent>

        <TabsContent value="sources" className="space-y-6">
          <RegulationSourcesPanel />
        </TabsContent>

        <TabsContent value="batch-ops" className="space-y-6">
          <BatchProcessingPanel />
        </TabsContent>

        <TabsContent value="tools" className="space-y-6">
          <BulkImportExport />
        </TabsContent>
      </Tabs>
    </div>
  );
}
