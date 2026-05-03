import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FlaskConical, Upload } from "lucide-react";
import KeywordResearchLabTab from "./KeywordResearchLabTab";
import KeywordImportTab from "./KeywordImportTab";

const VALID = new Set(["research", "import"]);

export default function DiscoverTab() {
  const [params, setParams] = useSearchParams();
  const sub = VALID.has(params.get("sub") || "") ? (params.get("sub") as string) : "research";
  const setSub = (v: string) => {
    const next = new URLSearchParams(params);
    next.set("sub", v);
    setParams(next, { replace: true });
  };
  return (
    <Tabs value={sub} onValueChange={setSub}>
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
