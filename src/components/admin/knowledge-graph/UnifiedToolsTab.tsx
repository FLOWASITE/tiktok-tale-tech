import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench, FileJson, RefreshCw, Search } from "lucide-react";
import { BulkImportExport } from "./BulkImportExport";
import { RegulationPropagationPanel } from "./RegulationPropagationPanel";
import { DuplicateDetectionPanel } from "./DuplicateDetectionPanel";

interface UnifiedToolsTabProps {
  selectedNodeId?: string | null;
}

export function UnifiedToolsTab({ selectedNodeId }: UnifiedToolsTabProps) {
  const [subTab, setSubTab] = useState("import-export");

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Công cụ quản lý
        </CardTitle>
        <CardDescription>
          Import/Export dữ liệu, quản lý cập nhật quy định và kiểm tra trùng lặp
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={subTab} onValueChange={setSubTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="import-export" className="gap-1.5">
              <FileJson className="h-4 w-4" />
              Import/Export
            </TabsTrigger>
            <TabsTrigger value="propagation" className="gap-1.5">
              <RefreshCw className="h-4 w-4" />
              Cập nhật quy định
            </TabsTrigger>
            <TabsTrigger value="duplicates" className="gap-1.5">
              <Search className="h-4 w-4" />
              Trùng lặp
            </TabsTrigger>
          </TabsList>

          <TabsContent value="import-export" className="mt-0">
            <BulkImportExport />
          </TabsContent>

          <TabsContent value="propagation" className="mt-0">
            <RegulationPropagationPanel />
          </TabsContent>

          <TabsContent value="duplicates" className="mt-0">
            <DuplicateDetectionPanel selectedNodeId={selectedNodeId} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
