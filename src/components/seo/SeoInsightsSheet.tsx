import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Target, Link2, Network } from "lucide-react";
import ClusterContextCard from "@/components/seo/ClusterContextCard";
import KeywordCoveragePanel from "@/components/seo/KeywordCoveragePanel";
import InternalLinksPanel from "@/components/seo/InternalLinksPanel";

interface Props {
  contentId: string;
  clusterId?: string | null;
  targetKeywordIds?: string[] | null;
  contentText: string;
  title?: string;
  isLongForm: boolean;
}

export default function SeoInsightsSheet({
  contentId, clusterId, targetKeywordIds, contentText, title, isLongForm,
}: Props) {
  const [open, setOpen] = useState(false);
  const hasKeywords = Array.isArray(targetKeywordIds) && targetKeywordIds.length > 0;
  const hasCluster = !!clusterId;

  // Default tab — pick the most actionable one
  const defaultTab = hasKeywords && isLongForm
    ? "keywords"
    : isLongForm
    ? "links"
    : hasCluster
    ? "cluster"
    : "keywords";

  const badgeCount = (hasCluster ? 1 : 0) + (hasKeywords ? 1 : 0) + (isLongForm ? 1 : 0);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 h-8 text-xs font-medium border-dashed"
        >
          <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="flex-1 text-left">SEO Insights</span>
          {badgeCount > 0 && (
            <Badge variant="secondary" className="h-4 px-1.5 text-[10px] tabular-nums">
              {badgeCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col">
        <SheetHeader className="px-5 py-4 border-b border-border/40 shrink-0">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-4 h-4 text-muted-foreground" />
            SEO Insights
          </SheetTitle>
          <SheetDescription className="text-xs line-clamp-1">
            {title || "Phân tích SEO chi tiết cho bài viết này"}
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue={defaultTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-5 mt-3 grid grid-cols-3 h-9 shrink-0">
            <TabsTrigger value="keywords" className="text-xs gap-1.5" disabled={!hasKeywords || !isLongForm}>
              <Target className="w-3.5 h-3.5" />
              Từ khóa
            </TabsTrigger>
            <TabsTrigger value="links" className="text-xs gap-1.5" disabled={!isLongForm}>
              <Link2 className="w-3.5 h-3.5" />
              Internal Link
            </TabsTrigger>
            <TabsTrigger value="cluster" className="text-xs gap-1.5" disabled={!hasCluster}>
              <Network className="w-3.5 h-3.5" />
              Cluster
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            <TabsContent value="keywords" className="mt-0 space-y-3">
              {hasKeywords && isLongForm ? (
                <KeywordCoveragePanel
                  contentId={contentId}
                  targetKeywordIds={targetKeywordIds!}
                  clusterId={clusterId}
                  contentText={contentText}
                  title={title}
                />
              ) : (
                <EmptyState
                  icon={<Target className="w-8 h-8 text-muted-foreground/40" />}
                  title="Chưa có từ khóa mục tiêu"
                  hint={isLongForm ? "Gắn từ khóa SEO khi tạo bài để xem audit." : "Audit chỉ áp dụng cho long-form (Website/Blog)."}
                />
              )}
            </TabsContent>

            <TabsContent value="links" className="mt-0">
              {isLongForm ? (
                <InternalLinksPanel contentId={contentId} />
              ) : (
                <EmptyState
                  icon={<Link2 className="w-8 h-8 text-muted-foreground/40" />}
                  title="Internal link chỉ cho long-form"
                  hint="Mở bài Website / Blogger / WordPress để xem gợi ý liên kết nội bộ."
                />
              )}
            </TabsContent>

            <TabsContent value="cluster" className="mt-0">
              {hasCluster ? (
                <ClusterContextCard clusterId={clusterId!} currentContentId={contentId} />
              ) : (
                <EmptyState
                  icon={<Network className="w-8 h-8 text-muted-foreground/40" />}
                  title="Bài viết chưa thuộc Pillar Cluster"
                  hint="Gắn cluster trong wizard tạo bài để xem coverage và sister content."
                />
              )}
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function EmptyState({ icon, title, hint }: { icon: React.ReactNode; title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4 gap-3">
      {icon}
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground max-w-[280px]">{hint}</p>
      </div>
    </div>
  );
}
