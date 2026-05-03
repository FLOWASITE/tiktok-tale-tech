import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useSeoKeywords } from "@/hooks/useSeoKeywords";
import { useSeoPillars } from "@/hooks/useSeoPillars";
import { useSeoOverviewCounts } from "@/hooks/useSeoOverviewCounts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Compass, Map, FileText, LineChart, ArrowRight, Sparkles } from "lucide-react";

interface Props {
  active: "discover" | "plan" | "produce" | "track";
  onStepClick: (s: "discover" | "plan" | "produce" | "track") => void;
}

const STEPS = [
  { id: "discover" as const, label: "Discover", desc: "Tìm keyword", icon: Compass },
  { id: "plan" as const, label: "Plan", desc: "Cluster & map", icon: Map },
  { id: "produce" as const, label: "Produce", desc: "Landing pages", icon: FileText },
  { id: "track" as const, label: "Track", desc: "Rank & health", icon: LineChart },
];

export default function SeoHubHero({ active, onStepClick }: Props) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;
  const { data: keywords = [] } = useSeoKeywords();
  const { data: pillars = [] } = useSeoPillars();
  const { orphan, cannibal } = useSeoOverviewCounts();

  const { data: pageCount = 0 } = useQuery({
    queryKey: ["seo-hero-pages", orgId],
    enabled: !!orgId,
    staleTime: 60_000,
    queryFn: async () => {
      const { count } = await supabase
        .from("seo_landing_pages" as any)
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId!);
      return count || 0;
    },
  });

  const isEmpty = keywords.length === 0;

  if (isEmpty) {
    return (
      <Card className="p-6 border-dashed bg-gradient-to-br from-muted/30 to-transparent">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-base">Bắt đầu hành trình SEO</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Quy trình 4 bước: <strong>Discover</strong> → <strong>Plan</strong> → <strong>Produce</strong> → <strong>Track</strong>.
              Bắt đầu bằng AI Research Lab để tìm keyword chiến lược.
            </p>
            <Button className="mt-3 gap-1.5" onClick={() => onStepClick("discover")}>
              <Compass className="h-4 w-4" /> Mở Discover
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  const kpis = [
    { label: "Keywords", value: keywords.length },
    { label: "Pillars", value: pillars.length },
    { label: "Pages", value: pageCount },
    {
      label: "Sức khoẻ",
      value: `${orphan + cannibal}`,
      hint: orphan + cannibal > 0 ? `${orphan} orphan · ${cannibal} cannibal` : "Tốt",
      tone: orphan + cannibal > 0 ? "warn" : "ok" as const,
    },
  ];

  return (
    <div className="space-y-3">
      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <Card key={k.label} className="p-3">
            <div className="text-xs text-muted-foreground">{k.label}</div>
            <div className="text-2xl font-semibold tabular-nums mt-0.5">{k.value}</div>
            {k.hint && (
              <div className={`text-[11px] mt-0.5 ${k.tone === "warn" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                {k.hint}
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Workflow stepper */}
      <Card className="p-2">
        <div className="flex items-center gap-1 overflow-x-auto">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = active === s.id;
            return (
              <div key={s.id} className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => onStepClick(s.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-left ${
                    isActive ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div
                    className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-semibold ${
                      isActive ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                    }`}
                  >
                    {i + 1}
                  </div>
                  <div className="hidden sm:block">
                    <div className="text-xs font-medium leading-tight">{s.label}</div>
                    <div className="text-[10px] text-muted-foreground leading-tight">{s.desc}</div>
                  </div>
                  <Icon className="h-4 w-4 sm:hidden" />
                </button>
                {i < STEPS.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
