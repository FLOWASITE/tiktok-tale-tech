import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Layers, Database, Scale, Sparkles } from "lucide-react";
import { BatchProcessingPanel } from "./BatchProcessingPanel";
import { BatchEmbeddingsPanel } from "./BatchEmbeddingsPanel";
import { EntityExtractionPanel } from "./EntityExtractionPanel";

export function UnifiedProcessingTab() {
  const [subTab, setSubTab] = useState("batch");

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5" />
          Xử lý hàng loạt
        </CardTitle>
        <CardDescription>
          Parse nội dung, tạo vector embeddings và trích xuất entities từ Industry Packs
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={subTab} onValueChange={setSubTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="batch" className="gap-1.5">
              <Sparkles className="h-4 w-4" />
              Parse & Quality
            </TabsTrigger>
            <TabsTrigger value="embeddings" className="gap-1.5">
              <Database className="h-4 w-4" />
              Embeddings
            </TabsTrigger>
            <TabsTrigger value="extraction" className="gap-1.5">
              <Scale className="h-4 w-4" />
              Trích xuất
            </TabsTrigger>
          </TabsList>

          <TabsContent value="batch" className="mt-0">
            <BatchProcessingPanel />
          </TabsContent>

          <TabsContent value="embeddings" className="mt-0">
            <BatchEmbeddingsPanel />
          </TabsContent>

          <TabsContent value="extraction" className="mt-0">
            <EntityExtractionPanel />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
