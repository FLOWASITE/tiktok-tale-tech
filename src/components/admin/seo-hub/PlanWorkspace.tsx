import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, Search } from "lucide-react";
import PillarsTab from "@/components/admin/seo-keywords/PillarsTab";
import KeywordExplorerTab from "@/components/admin/seo-keywords/KeywordExplorerTab";

const VALID = new Set(["pillars", "keywords"]);

export default function PlanWorkspace() {
  const [params, setParams] = useSearchParams();
  // Auto switch to pillars sub when ?pillar= is present
  const hasPillar = !!params.get("pillar");
  const raw = params.get("sub") || (hasPillar ? "pillars" : "pillars");
  const sub = VALID.has(raw) ? raw : "pillars";

  const setSub = (v: string) => {
    const next = new URLSearchParams(params);
    next.set("sub", v);
    if (v !== "pillars") next.delete("pillar");
    setParams(next, { replace: true });
  };

  return (
    <Tabs value={sub} onValueChange={setSub} className="w-full">
      <TabsList>
        <TabsTrigger value="pillars" className="gap-1.5">
          <Target className="h-4 w-4" /> Pillars
        </TabsTrigger>
        <TabsTrigger value="keywords" className="gap-1.5">
          <Search className="h-4 w-4" /> Tất cả keywords
        </TabsTrigger>
      </TabsList>
      <TabsContent value="pillars" className="mt-4"><PillarsTab /></TabsContent>
      <TabsContent value="keywords" className="mt-4"><KeywordExplorerTab /></TabsContent>
    </Tabs>
  );
}
