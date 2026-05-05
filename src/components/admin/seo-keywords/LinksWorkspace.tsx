import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Link2, ExternalLink, ArrowDownLeft, AlertTriangle, Sparkles, Globe, HelpCircle, X, Lightbulb } from "lucide-react";
import BacklinksTab from "./BacklinksTab";
import InternalLinksOverview from "./InternalLinksOverview";
import ExternalLinksTab from "./ExternalLinksTab";
import { useBacklinkStats } from "@/hooks/useBacklinks";
import { useInternalLinksOverview } from "@/hooks/useInternalLinksOverview";
import { useExternalLinkStats } from "@/hooks/useExternalLinks";

const VALID_VIEWS = new Set(["backlinks", "internal", "external"]);
const ONBOARDING_KEY = "seo-links-onboarding-dismissed-v1";

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

  const [showOnboarding, setShowOnboarding] = useState(
    () => typeof window !== "undefined" && localStorage.getItem(ONBOARDING_KEY) !== "1"
  );
  const dismissOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY, "1");
    setShowOnboarding(false);
  };

  const { data: backStats } = useBacklinkStats();
  const { data: internalData } = useInternalLinksOverview();
  const { data: extStats } = useExternalLinkStats();

  const viewHelp: Record<string, { what: string; how: string }> = {
    backlinks: {
      what: "URL bài đăng trên Social/Website trỏ về blog của bạn — tăng off-page SEO.",
      how: "Tăng bằng cách: publish multichannel với 1 long-form (Website/WP/Blogger) + ≥1 social — hệ thống tự chèn URL blog vào caption social.",
    },
    internal: {
      what: "Liên kết giữa các bài blog trong cluster — phân phối PageRank, giữ user.",
      how: 'Tăng bằng cách: mở 1 bài long-form → bấm "Gợi ý liên kết nội bộ" để AI đề xuất link giữa các bài cùng pillar (Jaccard similarity).',
    },
    external: {
      what: "Pool URL kéo từ WordPress / Blogger / sitemap — dùng để chèn backlink hoặc internal link.",
      how: 'Tăng bằng cách: connect WordPress/Blogger ở Brand Connections, hoặc bấm "Sync nguồn link" để kéo sitemap.',
    },
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-4">
        {/* Onboarding banner */}
        {showOnboarding && (
          <Card className="border-muted-foreground/20 bg-muted/30">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">Tab Liên kết hoạt động thế nào?</h3>
                </div>
                <Button size="sm" variant="ghost" className="h-7 -mr-2 -mt-1" onClick={dismissOnboarding}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="grid md:grid-cols-3 gap-3 text-xs">
                <div className="rounded-md border bg-background p-3">
                  <div className="flex items-center gap-1.5 font-medium mb-1">
                    <ExternalLink className="h-3.5 w-3.5" /> Backlinks
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    URL post Social/Website trỏ về blog. <strong>Tự sinh</strong> khi publish multichannel có blog +
                    social — caption social tự chèn link blog.
                  </p>
                </div>
                <div className="rounded-md border bg-background p-3">
                  <div className="flex items-center gap-1.5 font-medium mb-1">
                    <Link2 className="h-3.5 w-3.5" /> Internal links
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Link giữa các bài blog. Tạo bằng cách <strong>mở 1 bài long-form → "Gợi ý liên kết nội bộ"</strong>{" "}
                    — AI đề xuất link cùng cluster.
                  </p>
                </div>
                <div className="rounded-md border bg-background p-3">
                  <div className="flex items-center gap-1.5 font-medium mb-1">
                    <Globe className="h-3.5 w-3.5" /> Pool URL
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Kho URL sync từ WordPress/Blogger/sitemap. Dùng để <strong>chèn vào caption</strong> (backlink) hoặc{" "}
                    <strong>chèn vào blog mới</strong> (internal link).
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-3">
                Quy trình đề xuất: Connect WP/Blogger → Publish multichannel (blog + 5 social) → Lặp lại với bài
                cùng pillar → Bấm "Gợi ý liên kết nội bộ".
              </p>
            </CardContent>
          </Card>
        )}

        {/* Unified KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi
            icon={<ExternalLink className="h-4 w-4" />}
            label="Owned backlinks"
            value={backStats?.total ?? 0}
            hint="Social → Blog"
            tip="Tổng số URL post Social/Website đã trỏ về blog của bạn. Tăng bằng cách publish multichannel có chèn link blog trong caption."
          />
          <Kpi
            icon={<ArrowDownLeft className="h-4 w-4" />}
            label="Internal links"
            value={internalData?.totals.totalInternal ?? 0}
            hint={`${internalData?.totals.pagesWithLinks ?? 0} bài`}
            tip="Tổng số liên kết giữa các bài blog. Tăng bằng cách mở 1 bài long-form và bấm 'Gợi ý liên kết nội bộ'."
          />
          <Kpi
            icon={<Sparkles className="h-4 w-4" />}
            label="Bài có link mạnh (≥3)"
            value={internalData?.totals.strongPages ?? 0}
            hint="In + Backlinks ≥ 3"
            tip="Số bài có Equity ≥ 3 (Equity = Internal in + Backlinks). Đây là các bài 'trung tâm' của cluster, hiệu quả SEO cao nhất."
          />
          <Kpi
            icon={<AlertTriangle className="h-4 w-4" />}
            label="Bài thiếu link"
            value={internalData?.totals.starvedPages ?? 0}
            tone="warn"
            hint="Cần bơm thêm"
            tip="Số bài có Equity = 0 (không có link nội bộ trỏ về, không có backlink). Mở từng bài → bấm 'Quản lý' để bơm link."
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
            <div className="max-w-md text-xs space-y-0.5">
              <p className="text-muted-foreground">{viewHelp[view].what}</p>
              <p className="text-[11px] text-muted-foreground/80">{viewHelp[view].how}</p>
            </div>
          </CardContent>
        </Card>

        {/* Body */}
        {view === "backlinks" ? <BacklinksTab embedded />
          : view === "internal" ? <InternalLinksOverview />
          : <ExternalLinksTab />}
      </div>
    </TooltipProvider>
  );
}

function Kpi({ icon, label, value, tone = "default", hint, tip }: {
  icon: React.ReactNode; label: string; value: number; tone?: "default" | "warn"; hint?: string; tip?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          {icon}<span>{label}</span>
          {tip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="ml-auto opacity-60 hover:opacity-100">
                  <HelpCircle className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[260px] text-xs leading-relaxed">
                {tip}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className={`text-2xl font-semibold ${tone === "warn" && value > 0 ? "text-destructive" : ""}`}>
          {value.toLocaleString("vi-VN")}
        </div>
        {hint && <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>}
      </CardContent>
    </Card>
  );
}
