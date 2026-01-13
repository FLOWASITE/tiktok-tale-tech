import { useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Network, GitBranch, RefreshCw, Database, Scale, Search, Move3D, BarChart3, Wrench, Lightbulb, Globe } from "lucide-react";
import { 
  KnowledgeGraphViewer, 
  RegulationPropagationPanel,
  CreateNodeButton,
  BatchEmbeddingsPanel,
  EntityExtractionPanel,
  GraphCanvas,
  SemanticSearchPanel,
  ConnectionSuggestions,
  BulkImportExport,
  GraphAnalyticsDashboard
} from "@/components/admin/knowledge-graph";
import { RegulationSourcesPanel } from "@/components/admin/knowledge-graph/RegulationSourcesPanel";
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
          <RealtimeStatusIndicator />
          <CreateNodeButton />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex w-full max-w-4xl overflow-x-auto">
          <TabsTrigger value="explorer" className="gap-2">
            <Network className="h-4 w-4" />
            Explorer
          </TabsTrigger>
          <TabsTrigger value="visualization" className="gap-2">
            <Move3D className="h-4 w-4" />
            Visualization
          </TabsTrigger>
          <TabsTrigger value="search" className="gap-2">
            <Search className="h-4 w-4" />
            Search
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="embeddings" className="gap-2">
            <Database className="h-4 w-4" />
            Embeddings
          </TabsTrigger>
          <TabsTrigger value="extraction" className="gap-2">
            <Scale className="h-4 w-4" />
            Extract
          </TabsTrigger>
          <TabsTrigger value="suggestions" className="gap-2">
            <Lightbulb className="h-4 w-4" />
            AI Suggest
          </TabsTrigger>
          <TabsTrigger value="regulations" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Propagation
          </TabsTrigger>
          <TabsTrigger value="sources" className="gap-2">
            <Globe className="h-4 w-4" />
            Sources
          </TabsTrigger>
          <TabsTrigger value="tools" className="gap-2">
            <Wrench className="h-4 w-4" />
            Tools
          </TabsTrigger>
        </TabsList>

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

        <TabsContent value="tools" className="space-y-6">
          <BulkImportExport />
        </TabsContent>
      </Tabs>
    </div>
  );
}
