import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, LineChart, Link2 } from "lucide-react";
import OverviewTab from "@/components/admin/seo-keywords/OverviewTab";
import RankTrackerTab from "@/components/admin/seo-keywords/RankTrackerTab";
import LinksWorkspace from "@/components/admin/seo-keywords/LinksWorkspace";

const VALID = new Set(["health", "links", "ranks"]);

export default function TrackWorkspace() {
  const [params, setParams] = useSearchParams();
  const sub = VALID.has(params.get("sub") || "") ? (params.get("sub") as string) : "health";
  const setSub = (v: string) => {
    const next = new URLSearchParams(params);
    next.set("sub", v);
    setParams(next, { replace: true });
  };

  return (
    <Tabs value={sub} onValueChange={setSub} className="w-full">
      <TabsList>
        <TabsTrigger value="health" className="gap-1.5">
          <Activity className="h-4 w-4" /> Sức khoẻ
        </TabsTrigger>
        <TabsTrigger value="links" className="gap-1.5">
          <Link2 className="h-4 w-4" /> Liên kết
        </TabsTrigger>
        <TabsTrigger value="ranks" className="gap-1.5">
          <LineChart className="h-4 w-4" /> Rank tracker
        </TabsTrigger>
      </TabsList>
      <TabsContent value="health" className="mt-4"><OverviewTab /></TabsContent>
      <TabsContent value="links" className="mt-4"><LinksWorkspace /></TabsContent>
      <TabsContent value="ranks" className="mt-4"><RankTrackerTab /></TabsContent>
    </Tabs>
  );
}
