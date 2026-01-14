import { useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Network, BarChart3, Lightbulb, Globe, Layers, Wrench, Factory } from "lucide-react";
import { 
  CreateNodeButton,
  ConnectionSuggestions,
  GraphAnalyticsDashboard
} from "@/components/admin/knowledge-graph";
import { RegulationSourcesPanel } from "@/components/admin/knowledge-graph/RegulationSourcesPanel";
import { PropagationNotificationsBadge } from "@/components/admin/knowledge-graph/PropagationNotificationsBadge";
import { RealtimeStatusIndicator } from "@/hooks/useRealtimeGraph";
import { UnifiedExplorerTab } from "@/components/admin/knowledge-graph/UnifiedExplorerTab";
import { UnifiedProcessingTab } from "@/components/admin/knowledge-graph/UnifiedProcessingTab";
import { UnifiedToolsTab } from "@/components/admin/knowledge-graph/UnifiedToolsTab";
import { IndustryKnowledgeExplorer } from "@/components/admin/knowledge-graph/IndustryKnowledgeExplorer";

export default function AdminKnowledgeGraph() {
  const [activeTab, setActiveTab] = useState("explorer");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Handle orphan node click - navigate to AI Suggest tab to create connections
  const handleOrphanNodeNavigate = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    setActiveTab("suggestions");
  }, []);

  // Handle navigate to tools/propagation tab
  const handleNavigateToPropagation = useCallback(() => {
    setActiveTab("tools");
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

      {/* Tabs - Streamlined 6-tab structure */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="border rounded-lg p-1 bg-muted/30">
          <div className="flex flex-wrap gap-1 items-center">
            {/* Group 1: Core */}
            <div className="flex items-center gap-0.5 px-1">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mr-1 hidden sm:inline">
                Core
              </span>
              <TabsList className="h-9 bg-transparent p-0">
                <TabsTrigger value="explorer" className="gap-1.5 data-[state=active]:bg-background h-8 px-3 text-xs">
                  <Network className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Khám phá</span>
                </TabsTrigger>
                <TabsTrigger value="sources" className="gap-1.5 data-[state=active]:bg-background h-8 px-3 text-xs">
                  <Globe className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Nguồn & Crawl</span>
                </TabsTrigger>
                <TabsTrigger value="processing" className="gap-1.5 data-[state=active]:bg-background h-8 px-3 text-xs">
                  <Layers className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Xử lý</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="w-px h-6 bg-border hidden sm:block" />

            {/* Group 2: Industry Content */}
            <div className="flex items-center gap-0.5 px-1">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mr-1 hidden sm:inline">
                Ngành
              </span>
              <TabsList className="h-9 bg-transparent p-0">
                <TabsTrigger value="industry" className="gap-1.5 data-[state=active]:bg-background h-8 px-3 text-xs">
                  <Factory className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Nội dung ngành</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="w-px h-6 bg-border hidden sm:block" />

            {/* Group 3: Intelligence */}
            <div className="flex items-center gap-0.5 px-1">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mr-1 hidden sm:inline">
                AI
              </span>
              <TabsList className="h-9 bg-transparent p-0">
                <TabsTrigger value="analytics" className="gap-1.5 data-[state=active]:bg-background h-8 px-3 text-xs">
                  <BarChart3 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Phân tích</span>
                </TabsTrigger>
                <TabsTrigger value="suggestions" className="gap-1.5 data-[state=active]:bg-background h-8 px-3 text-xs">
                  <Lightbulb className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">AI Gợi ý</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="w-px h-6 bg-border hidden sm:block" />

            {/* Group 3: Tools */}
            <div className="flex items-center gap-0.5 px-1">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mr-1 hidden sm:inline">
                Tools
              </span>
              <TabsList className="h-9 bg-transparent p-0">
                <TabsTrigger value="tools" className="gap-1.5 data-[state=active]:bg-background h-8 px-3 text-xs">
                  <Wrench className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Công cụ</span>
                </TabsTrigger>
              </TabsList>
            </div>
          </div>
        </div>

        {/* Tab 1: Khám phá (Explorer + Graph + Search) */}
        <TabsContent value="explorer" className="space-y-6">
          <UnifiedExplorerTab 
            selectedNodeId={selectedNodeId}
            onNodeSelect={setSelectedNodeId}
            onNavigateToSuggestions={handleOrphanNodeNavigate}
          />
        </TabsContent>

        {/* Tab 2: Nguồn & Crawl */}
        <TabsContent value="sources" className="space-y-6">
          <RegulationSourcesPanel />
        </TabsContent>

        {/* Tab 3: Xử lý (Batch + Embeddings + Extraction) */}
        <TabsContent value="processing" className="space-y-6">
          <UnifiedProcessingTab />
        </TabsContent>

        {/* Tab 4: Nội dung ngành */}
        <TabsContent value="industry" className="space-y-6">
          <IndustryKnowledgeExplorer />
        </TabsContent>

        {/* Tab 5: Phân tích */}
        <TabsContent value="analytics" className="space-y-6">
          <GraphAnalyticsDashboard onNavigateToNode={handleOrphanNodeNavigate} />
        </TabsContent>

        {/* Tab 6: AI Gợi ý */}
        <TabsContent value="suggestions" className="space-y-6">
          <ConnectionSuggestions 
            nodeId={selectedNodeId}
            onConnectionCreated={() => {}}
          />
        </TabsContent>

        {/* Tab 7: Công cụ (Import/Export + Propagation + Duplicate Detection) */}
        <TabsContent value="tools" className="space-y-6">
          <UnifiedToolsTab selectedNodeId={selectedNodeId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
