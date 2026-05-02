import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, FlaskConical, FolderTree, Upload, BarChart3, FileText, LineChart, Link2, Target } from "lucide-react";
import KeywordDashboardTab from "@/components/admin/seo-keywords/KeywordDashboardTab";
import KeywordExplorerTab from "@/components/admin/seo-keywords/KeywordExplorerTab";
import KeywordClusterTab from "@/components/admin/seo-keywords/KeywordClusterTab";
import PillarsTab from "@/components/admin/seo-keywords/PillarsTab";
import KeywordResearchLabTab from "@/components/admin/seo-keywords/KeywordResearchLabTab";
import KeywordImportTab from "@/components/admin/seo-keywords/KeywordImportTab";
import RankTrackerTab from "@/components/admin/seo-keywords/RankTrackerTab";
import CoverageTab from "@/components/admin/seo-keywords/CoverageTab";
import AdminSeoPages from "@/pages/AdminSeoPages";

export default function AdminSeoHub() {
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState(params.get("tab") || "dashboard");
  useEffect(() => {
    const t = params.get("tab");
    if (t && t !== tab) setTab(t);
  }, [params]);
  const handleTabChange = (v: string) => {
    setTab(v);
    const next = new URLSearchParams(params);
    next.set("tab", v);
    if (v !== "pillars") next.delete("pillar");
    setParams(next, { replace: true });
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Search className="h-7 w-7 text-muted-foreground" />
          SEO Hub
        </h1>
        <p className="text-muted-foreground mt-1">
          Programmatic SEO — keyword, cluster, rank tracking và landing pages trong một nơi.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid w-full grid-cols-9 max-w-6xl">
          <TabsTrigger value="dashboard" className="gap-1.5">
            <BarChart3 className="h-4 w-4" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="explorer" className="gap-1.5">
            <Search className="h-4 w-4" /> Keywords
          </TabsTrigger>
          <TabsTrigger value="pillars" className="gap-1.5">
            <Target className="h-4 w-4" /> Pillars
          </TabsTrigger>
          <TabsTrigger value="clusters" className="gap-1.5">
            <FolderTree className="h-4 w-4" /> Clusters
          </TabsTrigger>
          <TabsTrigger value="coverage" className="gap-1.5">
            <Link2 className="h-4 w-4" /> Coverage
          </TabsTrigger>
          <TabsTrigger value="research" className="gap-1.5">
            <FlaskConical className="h-4 w-4" /> Research
          </TabsTrigger>
          <TabsTrigger value="ranks" className="gap-1.5">
            <LineChart className="h-4 w-4" /> Ranks
          </TabsTrigger>
          <TabsTrigger value="import" className="gap-1.5">
            <Upload className="h-4 w-4" /> Import
          </TabsTrigger>
          <TabsTrigger value="pages" className="gap-1.5">
            <FileText className="h-4 w-4" /> Pages
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6"><KeywordDashboardTab /></TabsContent>
        <TabsContent value="explorer" className="mt-6"><KeywordExplorerTab /></TabsContent>
        <TabsContent value="pillars" className="mt-6"><PillarsTab /></TabsContent>
        <TabsContent value="clusters" className="mt-6"><KeywordClusterTab /></TabsContent>
        <TabsContent value="coverage" className="mt-6"><CoverageTab /></TabsContent>
        <TabsContent value="research" className="mt-6"><KeywordResearchLabTab /></TabsContent>
        <TabsContent value="ranks" className="mt-6"><RankTrackerTab /></TabsContent>
        <TabsContent value="import" className="mt-6"><KeywordImportTab /></TabsContent>
        <TabsContent value="pages" className="mt-6 -m-6"><AdminSeoPages /></TabsContent>
      </Tabs>
    </div>
  );
}
