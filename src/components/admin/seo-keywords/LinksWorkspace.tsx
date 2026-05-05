import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link2, ExternalLink, ArrowDownLeft, AlertTriangle, Sparkles, Globe } from "lucide-react";
import BacklinksTab from "./BacklinksTab";
import InternalLinksOverview from "./InternalLinksOverview";
import ExternalLinksTab from "./ExternalLinksTab";
import { useBacklinkStats } from "@/hooks/useBacklinks";
import { useInternalLinksOverview } from "@/hooks/useInternalLinksOverview";
import { useExternalLinkStats } from "@/hooks/useExternalLinks";

const VALID_VIEWS = new Set(["backlinks", "internal", "external"]);

export default function LinksWorkspace() {
  const [params, setParams] = useSearchParams();
  const view = VALID_VIEWS.has(params.get("view") || "")
    ? (params.get("view") as string)
    : "backlinks";
  const setView = (v: string) => {
    const next = new URLSearchParams(params);
    next.set("view", v);
    setParams(next, { replace: true });
  };

  const { data: backStats } = useBacklinkStats();
  const { data: internalData } = useInternalLinksOverview();
  const { data: extStats } = useExternalLinkStats();

  return (
    <div className="space-y-4">
      {/* Unified KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi
          icon={<ExternalLink className="h-4 w-4" />}
          label="Owned backlinks"
          value={backStats?.total ?? 0}
          hint="Social → Blog"
        />
        <Kpi
          icon={<ArrowDownLeft className="h-4 w-4" />}
          label="Internal links"
          value={internalData?.totals.totalInternal ?? 0}
          hint={`${internalData?.totals.pagesWithLinks ?? 0} bài`}
        />
        <Kpi
          icon={<Sparkles className="h-4 w-4" />}
          label="Bài có link mạnh (≥3)"
          value={internalData?.totals.strongPages ?? 0}
          hint="In + Backlinks ≥ 3"
        />
        <Kpi
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Bài thiếu link"
          value={internalData?.totals.starvedPages ?? 0}
          tone="warn"
          hint="Cần bơm thêm"
        />
      </div>

      {/* Segmented toggle */}
      <Card>
        <CardContent className="p-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="inline-flex rounded-md border p-0.5 bg-muted/30">
            <Button
              size="sm"
              variant={view === "backlinks" ? "default" : "ghost"}
              className="h-8 gap-1.5 rounded-sm"
              onClick={() => setView("backlinks")}
            >
              <ExternalLink className="h-3.5 w-3.5" /> Backlinks (Social → Blog)
            </Button>
            <Button
              size="sm"
              variant={view === "internal" ? "default" : "ghost"}
              className="h-8 gap-1.5 rounded-sm"
              onClick={() => setView("internal")}
            >
              <Link2 className="h-3.5 w-3.5" /> Internal links
            </Button>
            <Button
              size="sm"
              variant={view === "external" ? "default" : "ghost"}
              className="h-8 gap-1.5 rounded-sm"
              onClick={() => setView("external")}
            >
              <Globe className="h-3.5 w-3.5" /> Pool URL ({extStats?.total ?? 0})
            </Button>
          </div>
          <p className="text-xs text-muted-foreground max-w-md">
            {view === "backlinks"
              ? "URL bài đăng trên Social/Website trỏ về blog của bạn — tăng off-page SEO."
              : view === "internal"
              ? "Liên kết giữa các bài blog trong cluster — phân phối PageRank, giữ user."
              : "Pool URL kéo từ WordPress / Blogger / sitemap — dùng để chèn backlink hoặc internal link."}
          </p>
        </CardContent>
      </Card>

      {/* Body */}
      {view === "backlinks" ? <BacklinksTab embedded />
        : view === "internal" ? <InternalLinksOverview />
        : <ExternalLinksTab />}
    </div>
  );
}

function Kpi({ icon, label, value, tone = "default", hint }: {
  icon: React.ReactNode; label: string; value: number; tone?: "default" | "warn"; hint?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          {icon}<span>{label}</span>
        </div>
        <div className={`text-2xl font-semibold ${tone === "warn" && value > 0 ? "text-destructive" : ""}`}>
          {value.toLocaleString("vi-VN")}
        </div>
        {hint && <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>}
      </CardContent>
    </Card>
  );
}
