import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FlaskConical, Upload, Sparkles } from "lucide-react";
import KeywordResearchLabTab from "@/components/admin/seo-keywords/KeywordResearchLabTab";
import KeywordImportTab from "@/components/admin/seo-keywords/KeywordImportTab";
import EnrichmentJobsTab from "@/components/admin/seo-keywords/EnrichmentJobsTab";

const VALID = new Set(["research", "import", "enrich"]);

export default function DiscoverWorkspace() {
  const [params, setParams] = useSearchParams();
  // Backward compat: ?jobId= → auto open enrich sub
  const hasJob = !!params.get("jobId");
  const raw = params.get("sub") || (hasJob ? "enrich" : "research");
  const sub = VALID.has(raw) ? raw : "research";

  const setSub = (v: string) => {
    const next = new URLSearchParams(params);
    next.set("sub", v);
    if (v !== "enrich") next.delete("jobId");
    setParams(next, { replace: true });
  };

  return (
    <Tabs value={sub} onValueChange={setSub} className="w-full">
      <TabsList>
        <TabsTrigger value="research" className="gap-1.5">
          <FlaskConical className="h-4 w-4" /> AI Research Lab
        </TabsTrigger>
        <TabsTrigger value="import" className="gap-1.5">
          <Upload className="h-4 w-4" /> CSV Import
        </TabsTrigger>
        <TabsTrigger value="enrich" className="gap-1.5">
          <Sparkles className="h-4 w-4" /> Enrichment
        </TabsTrigger>
      </TabsList>
      <TabsContent value="research" className="mt-4"><KeywordResearchLabTab /></TabsContent>
      <TabsContent value="import" className="mt-4"><KeywordImportTab /></TabsContent>
      <TabsContent value="enrich" className="mt-4"><EnrichmentJobsTab /></TabsContent>
    </Tabs>
  );
}
