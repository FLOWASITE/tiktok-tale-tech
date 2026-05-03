import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FlaskConical, Upload } from "lucide-react";
import KeywordResearchLabTab from "./KeywordResearchLabTab";
import KeywordImportTab from "./KeywordImportTab";

export default function DiscoverTab() {
  return (
    <Tabs defaultValue="research">
      <TabsList>
        <TabsTrigger value="research" className="gap-1.5">
          <FlaskConical className="h-4 w-4" /> AI Research Lab
        </TabsTrigger>
        <TabsTrigger value="import" className="gap-1.5">
          <Upload className="h-4 w-4" /> CSV Import
        </TabsTrigger>
      </TabsList>
      <TabsContent value="research" className="mt-4"><KeywordResearchLabTab /></TabsContent>
      <TabsContent value="import" className="mt-4"><KeywordImportTab /></TabsContent>
    </Tabs>
  );
}
