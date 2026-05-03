import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Search, Compass, BarChart3, FileText, LineChart, Target, AlertCircle, Copy } from "lucide-react";
import OverviewTab from "@/components/admin/seo-keywords/OverviewTab";
import KeywordExplorerTab from "@/components/admin/seo-keywords/KeywordExplorerTab";
import PillarsTab from "@/components/admin/seo-keywords/PillarsTab";
import DiscoverTab from "@/components/admin/seo-keywords/DiscoverTab";
import RankTrackerTab from "@/components/admin/seo-keywords/RankTrackerTab";
import AdminSeoPages from "@/pages/AdminSeoPages";
import { useSeoOverviewCounts } from "@/hooks/useSeoOverviewCounts";

// Map URL cũ → tab mới (backward compat)
const LEGACY_MAP: Record<string, string> = {
  dashboard: "overview",
  coverage: "overview",
  research: "discover",
  import: "discover",
};

const VALID = new Set(["overview", "explorer", "pillars", "discover", "ranks", "pages"]);

export default function AdminSeoHub() {
  const [params, setParams] = useSearchParams();
  const initial = params.get("tab") || "overview";
  const normalized = LEGACY_MAP[initial] || (VALID.has(initial) ? initial : "overview");
  const [tab, setTab] = useState(normalized);
  const { orphan, cannibal } = useSeoOverviewCounts();

  useEffect(() => {
    const t = params.get("tab");
    if (!t) return;
    const mapped = LEGACY_MAP[t] || (VALID.has(t) ? t : "overview");
    if (mapped !== t) {
      const next = new URLSearchParams(params);
      next.set("tab", mapped);
      setParams(next, { replace: true });
    }
    if (mapped !== tab) setTab(mapped);
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
          Programmatic SEO — keyword, pillar, rank tracking và landing pages trong một nơi.
        </p>
      </div>

      <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-6 max-w-5xl">
          <TabsTrigger value="overview" className="gap-1.5">
            <BarChart3 className="h-4 w-4" /> Overview
            {(orphan > 0 || cannibal > 0) && (
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant={cannibal > 0 ? "destructive" : "secondary"}
                      className="ml-1 h-5 px-1.5 text-[10px] tabular-nums"
                    >
                      {orphan + cannibal}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    <div className="flex items-center gap-1.5">
                      <AlertCircle className="h-3 w-3" /> {orphan} orphan
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Copy className="h-3 w-3" /> {cannibal} cannibalization
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </TabsTrigger>
          <TabsTrigger value="explorer" className="gap-1.5">
            <Search className="h-4 w-4" /> Keywords
          </TabsTrigger>
          <TabsTrigger value="pillars" className="gap-1.5">
            <Target className="h-4 w-4" /> Pillars
          </TabsTrigger>
          <TabsTrigger value="discover" className="gap-1.5">
            <Compass className="h-4 w-4" /> Discover
          </TabsTrigger>
          <TabsTrigger value="ranks" className="gap-1.5">
            <LineChart className="h-4 w-4" /> Ranks
          </TabsTrigger>
          <TabsTrigger value="pages" className="gap-1.5">
            <FileText className="h-4 w-4" /> Pages
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6"><OverviewTab /></TabsContent>
        <TabsContent value="explorer" className="mt-6"><KeywordExplorerTab /></TabsContent>
        <TabsContent value="pillars" className="mt-6"><PillarsTab /></TabsContent>
        <TabsContent value="discover" className="mt-6"><DiscoverTab /></TabsContent>
        <TabsContent value="ranks" className="mt-6"><RankTrackerTab /></TabsContent>
        <TabsContent value="pages" className="mt-6 -m-6"><AdminSeoPages /></TabsContent>
      </Tabs>
    </div>
  );
}
