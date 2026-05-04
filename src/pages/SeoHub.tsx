import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Compass, Map, FileText, LineChart } from "lucide-react";
import SeoHubHero from "@/components/admin/seo-hub/SeoHubHero";
import DiscoverWorkspace from "@/components/admin/seo-hub/DiscoverWorkspace";
import PlanWorkspace from "@/components/admin/seo-hub/PlanWorkspace";
import TrackWorkspace from "@/components/admin/seo-hub/TrackWorkspace";
import AdminSeoPages from "@/pages/AdminSeoPages";

type TabId = "discover" | "plan" | "produce" | "track";

const VALID = new Set<TabId>(["discover", "plan", "produce", "track"]);

const LEGACY_MAP: Record<string, { tab: TabId; sub?: string }> = {
  overview: { tab: "track", sub: "health" },
  dashboard: { tab: "track", sub: "health" },
  coverage: { tab: "track", sub: "health" },
  explorer: { tab: "plan", sub: "keywords" },
  pillars: { tab: "plan", sub: "pillars" },
  research: { tab: "discover", sub: "research" },
  import: { tab: "discover", sub: "import" },
  enrichment: { tab: "discover", sub: "enrich" },
  ranks: { tab: "track", sub: "ranks" },
  backlinks: { tab: "track", sub: "backlinks" },
  links: { tab: "track", sub: "backlinks" },
  pages: { tab: "produce" },
};

interface SeoHubProps {
  /** When true, expose the admin-only "Produce" tab (manage public landing pages). */
  isAdmin?: boolean;
}

export default function SeoHub({ isAdmin = false }: SeoHubProps) {
  const [params, setParams] = useSearchParams();
  const rawTab = params.get("tab") || "discover";
  const legacy = LEGACY_MAP[rawTab];
  let tab: TabId = legacy ? legacy.tab : VALID.has(rawTab as TabId) ? (rawTab as TabId) : "discover";
  // Non-admins cannot access the Produce tab — fall back to Discover.
  if (!isAdmin && tab === "produce") tab = "discover";

  useEffect(() => {
    const t = params.get("tab");
    if (!t) return;
    const map = LEGACY_MAP[t];
    const next = new URLSearchParams(params);
    let mutated = false;
    if (map) {
      next.set("tab", map.tab);
      if (map.sub && !next.get("sub")) next.set("sub", map.sub);
      mutated = true;
    }
    if (!isAdmin && next.get("tab") === "produce") {
      next.set("tab", "discover");
      mutated = true;
    }
    if (mutated) setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTabChange = (v: string) => {
    const next = new URLSearchParams(params);
    next.set("tab", v);
    next.delete("sub");
    next.delete("pillar");
    next.delete("jobId");
    setParams(next, { replace: true });
  };

  const gridColsClass = isAdmin ? "grid-cols-4" : "grid-cols-3";
  const maxWidthClass = isAdmin ? "max-w-2xl" : "max-w-xl";

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Search className="h-7 w-7 text-muted-foreground" />
          SEO Hub
        </h1>
        <p className="text-muted-foreground mt-1">
          {isAdmin
            ? "Quy trình SEO 4 bước: tìm keyword → lập chiến lược → sản xuất nội dung → theo dõi kết quả."
            : "Quy trình SEO 3 bước: tìm keyword → lập chiến lược → theo dõi thứ hạng."}
        </p>
      </div>

      <SeoHubHero active={tab} onStepClick={handleTabChange} />

      <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
        <TabsList className={`grid ${gridColsClass} ${maxWidthClass}`}>
          <TabsTrigger value="discover" className="gap-1.5">
            <Compass className="h-4 w-4" /> Discover
          </TabsTrigger>
          <TabsTrigger value="plan" className="gap-1.5">
            <Map className="h-4 w-4" /> Plan
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="produce" className="gap-1.5">
              <FileText className="h-4 w-4" /> Produce
            </TabsTrigger>
          )}
          <TabsTrigger value="track" className="gap-1.5">
            <LineChart className="h-4 w-4" /> Track
          </TabsTrigger>
        </TabsList>

        <TabsContent value="discover" className="mt-6"><DiscoverWorkspace /></TabsContent>
        <TabsContent value="plan" className="mt-6"><PlanWorkspace /></TabsContent>
        {isAdmin && (
          <TabsContent value="produce" className="mt-6 -m-6"><AdminSeoPages /></TabsContent>
        )}
        <TabsContent value="track" className="mt-6"><TrackWorkspace /></TabsContent>
      </Tabs>
    </div>
  );
}
