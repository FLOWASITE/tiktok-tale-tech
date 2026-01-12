import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Network, GitBranch, RefreshCw, Database } from "lucide-react";
import { 
  KnowledgeGraphViewer, 
  RegulationPropagationPanel,
  CreateNodeButton,
  BatchEmbeddingsPanel
} from "@/components/admin/knowledge-graph";

export default function AdminKnowledgeGraph() {
  const [activeTab, setActiveTab] = useState("explorer");

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
        
        <div className="flex items-center gap-2">
          <CreateNodeButton />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="explorer" className="gap-2">
            <Network className="h-4 w-4" />
            Graph Explorer
          </TabsTrigger>
          <TabsTrigger value="embeddings" className="gap-2">
            <Database className="h-4 w-4" />
            Embeddings
          </TabsTrigger>
          <TabsTrigger value="regulations" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Regulations
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

        <TabsContent value="embeddings" className="space-y-6">
          <BatchEmbeddingsPanel />
        </TabsContent>

        <TabsContent value="regulations" className="space-y-6">
          <RegulationPropagationPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
